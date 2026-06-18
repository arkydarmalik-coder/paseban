/**
 * Robin Engine — Unit Tests
 * ECC Skill: tdd-workflow ← RED → GREEN → REFACTOR
 *
 * 4 strategies tested:
 * - lbc (least-busy circuit)
 * - water (waterfall)
 * - random
 * - failover
 * - Auto-retry
 * - Metrics tracking
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { RobinRouter } from '../lib/robin'
import { kv, InMemoryKV, BUILTIN_PROVIDERS } from '../lib/kv'
import type { Provider, ApiKey, RobinConfig, KeyMetrics } from '../lib/types'

const USER_ID = 'test-user'

// Reset state before each test
beforeEach(() => {
  ;(kv as InMemoryKV).clear()
})

// Mock provider dengan beberapa keys
function makeProvider(overrides: Partial<Provider> = {}): Provider {
  return {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    custom: false,
    keys: [
      { id: 'k1', key: 'sk-primary-xxx', label: 'Primary', tier: 'primary', status: 'active', monthlyQuota: 1000000, monthlyUsed: 100, lastUsed: null, resetAt: null },
      { id: 'k2', key: 'sk-backup-yyy', label: 'Backup', tier: 'backup', status: 'active', monthlyQuota: 500000, monthlyUsed: 50, lastUsed: null, resetAt: null },
      { id: 'k3', key: 'sk-free-zzz', label: 'Freebie', tier: 'free', status: 'active', monthlyQuota: 10000, monthlyUsed: 9000, lastUsed: null, resetAt: null },
    ],
    models: [{ id: 'gpt-4o', context: 128000 }],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// Pre-seed metrics for LBC testing
async function seedMetrics(keyId: string, count: number, errors429: number = 0) {
  const metrics: KeyMetrics = {
    requestCount: count,
    totalTokens: count * 100,
    successRate: count > 0 ? (count - errors429) / count : 1,
    avgLatency: 100,
    errors429,
    errors5xx: 0,
    lastRequest: new Date().toISOString(),
  }
  await kv.setKeyMetrics(USER_ID, 'openai', keyId, metrics)
}

describe('RobinRouter — Strategy Selection', () => {
  let router: RobinRouter
  let provider: Provider

  beforeEach(() => {
    // Fresh singleton — clear in-memory state
    // (We use a fresh InMemoryKV for each test block)
    router = new RobinRouter(USER_ID)
    provider = makeProvider()
  })

  // ── LBC Strategy ──
  describe('lbc (Least-Busy Circuit)', () => {
    it('pilih key dengan requestCount paling rendah', async () => {
      await kv.setRobinConfig(USER_ID, { defaultStrategy: 'lbc', strategies: {} })
      await seedMetrics('k1', 100) // sibuk
      await seedMetrics('k2', 10)  // sepi
      await seedMetrics('k3', 0)   // paling sepi

      const result = await router.selectKey(provider, 'gpt-4o')
      expect(result).not.toBeNull()
      expect(result!.decision.keyId).toBe('k3')
    })

    it('pilih key lain kalo yg tersibuk kena banyak 429', async () => {
      await kv.setRobinConfig(USER_ID, { defaultStrategy: 'lbc', strategies: {} })
      await seedMetrics('k1', 50, 10) // banyak error
      await seedMetrics('k2', 40, 0)  // clean
      await seedMetrics('k3', 30, 0)

      const result = await router.selectKey(provider, 'gpt-4o')
      expect(result).not.toBeNull()
      expect(result!.decision.keyId).not.toBe('k1') // k1 paling jelek karena error penalty
    })
  })

  // ── Waterfall Strategy ──
  describe('water (Waterfall — free first)', () => {
    it('pilih free tier dulu', async () => {
      await kv.setRobinConfig(USER_ID, { defaultStrategy: 'water', strategies: {} })
      const result = await router.selectKey(provider, 'gpt-4o')
      expect(result).not.toBeNull()
      expect(result!.decision.keyId).toBe('k3') // free
    })

    it('pilih backup kalo free exhausted', async () => {
      await kv.setRobinConfig(USER_ID, { defaultStrategy: 'water', strategies: {} })
      const providerNoFree = makeProvider()
      providerNoFree.keys = providerNoFree.keys.filter(k => k.tier !== 'free')

      const result = await router.selectKey(providerNoFree, 'gpt-4o')
      expect(result).not.toBeNull()
      expect(result!.decision.keyId).toBe('k2') // backup
    })

    it('fallback ke primary kalo cuma primary doang', async () => {
      await kv.setRobinConfig(USER_ID, { defaultStrategy: 'water', strategies: {} })
      const providerOnlyPrimary = makeProvider()
      providerOnlyPrimary.keys = providerOnlyPrimary.keys.filter(k => k.tier === 'primary')

      const result = await router.selectKey(providerOnlyPrimary, 'gpt-4o')
      expect(result).not.toBeNull()
      expect(result!.decision.keyId).toBe('k1')
    })
  })

  // ── Random Strategy ──
  describe('random', () => {
    it('return salah satu key dari pool', async () => {
      await kv.setRobinConfig(USER_ID, { defaultStrategy: 'random', strategies: {} })
      const results = new Set<string>()

      // Run 20 kali, harusnya minimal dapet 2 key beda
      for (let i = 0; i < 20; i++) {
        const result = await router.selectKey(provider, 'gpt-4o')
        expect(result).not.toBeNull()
        results.add(result!.decision.keyId)
      }

      expect(results.size).toBeGreaterThan(1)
    })

    it('skip key yg gak active', async () => {
      await kv.setRobinConfig(USER_ID, { defaultStrategy: 'random', strategies: {} })
      const inactiveProvider = makeProvider()
      inactiveProvider.keys.forEach(k => k.status = 'rate_limited')

      const result = await router.selectKey(inactiveProvider, 'gpt-4o')
      expect(result).toBeNull()
    })
  })

  // ── Failover Strategy ──
  describe('failover (primary first)', () => {
    it('pilih primary tier dulu', async () => {
      await kv.setRobinConfig(USER_ID, { defaultStrategy: 'failover', strategies: {} })
      const result = await router.selectKey(provider, 'gpt-4o')
      expect(result).not.toBeNull()
      expect(result!.decision.keyId).toBe('k1') // primary
    })

    it('fallback ke kalo primary gak ada', async () => {
      await kv.setRobinConfig(USER_ID, { defaultStrategy: 'failover', strategies: {} })
      const noPrimary = makeProvider()
      noPrimary.keys = noPrimary.keys.filter(k => k.tier !== 'primary')

      const result = await router.selectKey(noPrimary, 'gpt-4o')
      expect(result).not.toBeNull()
      expect(result!.decision.keyId).toBe('k2') // backup
    })
  })
})

// ── Auto-Retry ──
describe('RobinRouter — Auto-Retry', () => {
  let router: RobinRouter
  let provider: Provider

  beforeEach(() => {
    router = new RobinRouter(USER_ID)
    provider = makeProvider()
  })

  it('coba key beda kalo 429', async () => {
    await kv.setRobinConfig(USER_ID, { defaultStrategy: 'random', strategies: {} })

    // Mark k3 as rate_limited (simulasi exhausted)
    provider.keys.find(k => k.id === 'k3')!.status = 'rate_limited'

    const result = await router.selectKeyWithRetry(provider, 'gpt-4o', 3)
    expect(result).not.toBeNull()
    expect(result!.decision.keyId).not.toBe('k3')
  })

  it('return null kalo semua key exhausted', async () => {
    await kv.setRobinConfig(USER_ID, { defaultStrategy: 'failover', strategies: {} })
    provider.keys.forEach(k => k.status = 'exhausted')

    const result = await router.selectKeyWithRetry(provider, 'gpt-4o', 3)
    expect(result).toBeNull()
  })
})

// ── Metrics Tracking ──
describe('RobinRouter — Metrics', () => {
  let router: RobinRouter

  beforeEach(() => {
    router = new RobinRouter(USER_ID)
  })

  it('track success request', async () => {
    await router.recordResult('openai', 'k1', true, 500, 120, 200)

    const metrics = await kv.getKeyMetrics(USER_ID, 'openai', 'k1')
    expect(metrics.requestCount).toBe(1)
    expect(metrics.totalTokens).toBe(500)
    expect(metrics.successRate).toBe(1)
    expect(metrics.lastRequest).toBeTruthy()
  })

  it('track 429 errors', async () => {
    await router.recordResult('openai', 'k1', false, 0, 0, 429)
    await router.recordResult('openai', 'k1', false, 0, 0, 429)

    const metrics = await kv.getKeyMetrics(USER_ID, 'openai', 'k1')
    expect(metrics.errors429).toBe(2)
    expect(metrics.successRate).toBeLessThan(1)
  })

  it('auto-mark key rate_limited after 3+ 429s', async () => {
    // Save provider first so recordResult can update it
    const provider = makeProvider()
    await kv.setProvider(USER_ID, 'openai', provider)

    // 4x 429
    for (let i = 0; i < 4; i++) {
      await router.recordResult('openai', 'k1', false, 0, 0, 429)
    }

    const savedProvider = await kv.getProvider(USER_ID, 'openai')
    expect(savedProvider).not.toBeNull()
    const k1 = savedProvider!.keys.find(k => k.id === 'k1')
    expect(k1).toBeDefined()
    expect(k1!.status).toBe('rate_limited')
  })

  it('track 5xx errors', async () => {
    await router.recordResult('openai', 'k1', false, 0, 0, 503)

    const metrics = await kv.getKeyMetrics(USER_ID, 'openai', 'k1')
    expect(metrics.errors5xx).toBe(1)
  })
})

// ── Per-Provider Strategy ──
describe('RobinRouter — Per-Provider Strategy', () => {
  it('pake strategy per-provider kalo di-set', async () => {
    await kv.setRobinConfig(USER_ID, {
      defaultStrategy: 'random',
      strategies: { openai: 'failover' }
    })

    const router = new RobinRouter(USER_ID)
    const provider = makeProvider()

    const result = await router.selectKey(provider, 'gpt-4o')
    expect(result).not.toBeNull()
    expect(result!.decision.strategy).toBe('failover')
    expect(result!.decision.keyId).toBe('k1') // primary dipilih duluan
  })
})
