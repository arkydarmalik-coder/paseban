/**
 * Robin Smart Routing Engine
 * ===========================
 * ECC Skill: backend-patterns ← service layer
 *
 * 4 routing strategies untuk milih key terbaik:
 * - lbc  (least-busy circuit): pilih key paling sepi
 * - water (waterfall): gratis dulu, berbayar belakangan
 * - random: acak dari pool aktif
 * - failover: priority tier (primary → backup → free)
 *
 * Auto-retry: kalo key kena 429/5xx, coba key lain.
 */

import type {
  Provider, ApiKey, KeyMetrics, RobinDecision,
  RobinConfig, RobinStrategy
} from './types'
import { kv } from './kv'

export class RobinRouter {
  constructor(private userId: string) {}

  /**
   * Pilih key terbaik buat request ini.
   * Flow:
   * 1. Dapetin provider & config
   * 2. Filter active keys
   * 3. Terapkan strategy → pilih 1 key
   * 4. Auto-retry kalo gagal
   */
  async selectKey(
    provider: Provider,
    model: string,
    attempt: number = 1
  ): Promise<{ decision: RobinDecision; provider: Provider } | null> {
    const config = await kv.getRobinConfig(this.userId)
    const strategy = config.strategies[provider.id] ?? config.defaultStrategy

    // Filter active keys
    const activeKeys = provider.keys.filter(k => k.status === 'active')
    if (activeKeys.length === 0) return null

    const chosen = await this.pickByStrategy(strategy, activeKeys, provider.id)
    if (!chosen) return null

    return {
      decision: {
        keyId: chosen.id,
        apiKey: chosen.key,
        baseUrl: provider.baseUrl,
        providerId: provider.id,
        model,
        strategy,
      },
      provider
    }
  }

  /**
   * Auto-retry: coba key lain kalo request gagal (429/5xx)
   * Max 3 attempts, beda key tiap kali.
   */
  async selectKeyWithRetry(
    provider: Provider,
    model: string,
    maxRetries: number = 3
  ): Promise<{ decision: RobinDecision; provider: Provider } | null> {
    const triedKeyIds = new Set<string>()

    for (let i = 0; i < maxRetries; i++) {
      const result = await this.selectKey(provider, model, i + 1)
      if (!result) break
      if (!triedKeyIds.has(result.decision.keyId)) return result
      triedKeyIds.add(result.decision.keyId)
    }
    return null
  }

  /**
   * Track hasil request — update metrics
   */
  async recordResult(
    providerId: string,
    keyId: string,
    success: boolean,
    tokens: number,
    latency: number,
    statusCode: number
  ): Promise<void> {
    const metrics = await kv.getKeyMetrics(this.userId, providerId, keyId)

    metrics.requestCount++
    metrics.totalTokens += tokens
    metrics.lastRequest = new Date().toISOString()

    if (success) {
      metrics.avgLatency = latency // weighted moving avg kalo mau advanced
      metrics.successRate = (metrics.successRate * (metrics.requestCount - 1) + 1) / metrics.requestCount
    } else {
      if (statusCode === 429) metrics.errors429++
      else if (statusCode >= 500) metrics.errors5xx++
      metrics.successRate = (metrics.successRate * (metrics.requestCount - 1)) / metrics.requestCount
    }

    await kv.setKeyMetrics(this.userId, providerId, keyId, metrics)

    // Auto-mark rate limited kalo 429 > 3
    if (metrics.errors429 > 3) {
      const provider = await kv.getProvider(this.userId, providerId)
      if (provider) {
        const key = provider.keys.find(k => k.id === keyId)
        if (key) {
          key.status = 'rate_limited'
          await kv.setProvider(this.userId, providerId, provider)
        }
      }
    }
  }

  // ── Private: Strategy Implementations ──

  private async pickByStrategy(
    strategy: RobinStrategy,
    keys: ApiKey[],
    providerId: string
  ): Promise<ApiKey | null> {
    switch (strategy) {
      case 'lbc':     return this.pickLBC(keys, providerId)
      case 'water':   return this.pickWaterfall(keys)
      case 'random':  return this.pickRandom(keys)
      case 'failover':return this.pickFailover(keys)
      default:        return keys[0]
    }
  }

  /**
   * Least-Busy Circuit — pilih key dengan beban paling rendah
   * Bandingin berdasarkan: requestCount + errors429
   */
  private async pickLBC(keys: ApiKey[], providerId: string): Promise<ApiKey | null> {
    let bestKey: ApiKey | null = null
    let bestScore = Infinity

    for (const key of keys) {
      const metrics = await kv.getKeyMetrics(this.userId, providerId, key.id)
      const score = metrics.requestCount + metrics.errors429 * 10

      if (score < bestScore) {
        bestScore = score
        bestKey = key
      }
    }
    return bestKey
  }

  /**
   * Waterfall — pake tier yg lebih murah/ringan dulu
   * Urutan: free → backup → primary (biar hemat)
   * Soalnya primary biasanya berbayar, free gratisan
   */
  private async pickWaterfall(keys: ApiKey[]): Promise<ApiKey | null> {
    const ordered = [...keys]
    // Urutin: free dulu, backup kedua, primary terakhir
    for (const key of keys) {
      if (key.tier === 'free') return key
      if (key.tier === 'backup' && !ordered.find(k => k.tier === 'free')) return key
    }
    // Fallback ke primary
    const primary = keys.find(k => k.tier === 'primary')
    if (primary) return primary
    return keys[0]
  }

  /**
   * Random — pilih acak dari pool aktif
   */
  private async pickRandom(keys: ApiKey[]): Promise<ApiKey | null> {
    return keys[Math.floor(Math.random() * keys.length)]
  }

  /**
   * Failover — pake primary dulu, fallback ke backup, terakhir free
   * Kebalikan dari waterfall (prioritas reliability bukan cost)
   */
  private async pickFailover(keys: ApiKey[]): Promise<ApiKey | null> {
    // Primary dulu (paling reliable)
    const primary = keys.find(k => k.tier === 'primary')
    if (primary) return primary
    // Backup kedua
    const backup = keys.find(k => k.tier === 'backup')
    if (backup) return backup
    // Free terakhir
    const free = keys.find(k => k.tier === 'free')
    if (free) return free
    return keys[0]
  }
}
