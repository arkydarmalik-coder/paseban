/**
 * Vercel KV Adapter
 * ==================
 * ECC Skill: backend-patterns ← repository pattern
 *
 * Implementasi KVRepository pake Vercel KV (Redis).
 * Auto fallback ke InMemoryKV kalo env vars gak ada (dev).
 */

import type {
  Provider, BuiltinProvider, KeyMetrics,
  RobinConfig, UsageRecord, ModelRoute
} from './types'
import type { KVRepository } from './kv'
import { BUILTIN_PROVIDERS, MODEL_ROUTES } from './kv'

// ── Vercel KV Keys ──
const PREFIX = 'paseban:'
const KEYS = {
  USER_PROVIDERS: (uid: string) => `${PREFIX}${uid}:providers`,
  PROVIDER: (uid: string, pid: string) => `${PREFIX}${uid}:provider:${pid}`,
  ROBIN_CONFIG: (uid: string) => `${PREFIX}${uid}:robin:config`,
  KEY_METRICS: (uid: string, pid: string, kid: string) => `${PREFIX}${uid}:metrics:${pid}:${kid}`,
  USAGE: (uid: string, month: string) => `${PREFIX}${uid}:usage:${month}`,
  RATE_LIMIT: (ip: string) => `${PREFIX}ratelimit:${ip}`,
}

// ── VercelKV Implementation ──
export class VercelKV implements KVRepository {
  private client: import('@vercel/kv').VercelKV | null = null
  private ready = false

  async init(): Promise<boolean> {
    try {
      if (process.env.KV_URL || process.env.KV_REST_API_URL) {
        const mod = await import('@vercel/kv')
        this.client = mod.kv
        this.ready = true
        return true
      }
    } catch {
      // @vercel/kv not installed or env not set
    }
    return false
  }

  isReady(): boolean {
    return this.ready && this.client !== null
  }

  private getClient(): import('@vercel/kv').VercelKV {
    if (!this.client || !this.ready) {
      throw new Error('VercelKV not initialized. Call init() first or check env vars.')
    }
    return this.client
  }

  // ── Built-in Providers (static, no KV needed) ──
  async getBuiltinProviders(): Promise<BuiltinProvider[]> {
    return BUILTIN_PROVIDERS
  }

  // ── User Providers ──
  async getUserProviders(userId: string): Promise<string[]> {
    return (await this.getClient().smembers(KEYS.USER_PROVIDERS(userId))) || []
  }

  async getProvider(userId: string, providerId: string): Promise<Provider | null> {
    const data = await this.getClient().get<Provider>(KEYS.PROVIDER(userId, providerId))
    return data ?? null
  }

  async setProvider(userId: string, providerId: string, provider: Provider): Promise<void> {
    const c = this.getClient()
    await c.sadd(KEYS.USER_PROVIDERS(userId), providerId)
    await c.set(KEYS.PROVIDER(userId, providerId), provider)
  }

  async deleteProvider(userId: string, providerId: string): Promise<void> {
    const c = this.getClient()
    await c.srem(KEYS.USER_PROVIDERS(userId), providerId)
    await c.del(KEYS.PROVIDER(userId, providerId))
  }

  // ── Robin Config ──
  async getRobinConfig(userId: string): Promise<RobinConfig> {
    const data = await this.getClient().get<RobinConfig>(KEYS.ROBIN_CONFIG(userId))
    return data ?? { defaultStrategy: 'lbc', strategies: {} }
  }

  async setRobinConfig(userId: string, config: RobinConfig): Promise<void> {
    await this.getClient().set(KEYS.ROBIN_CONFIG(userId), config)
  }

  // ── Key Metrics ──
  async getKeyMetrics(userId: string, providerId: string, keyId: string): Promise<KeyMetrics> {
    const data = await this.getClient().get<KeyMetrics>(KEYS.KEY_METRICS(userId, providerId, keyId))
    return data ?? {
      requestCount: 0, totalTokens: 0, successRate: 1,
      avgLatency: 0, errors429: 0, errors5xx: 0, lastRequest: null,
    }
  }

  async setKeyMetrics(userId: string, providerId: string, keyId: string, metrics: KeyMetrics): Promise<void> {
    await this.getClient().set(KEYS.KEY_METRICS(userId, providerId, keyId), metrics)
  }

  // ── Model Routes (static) ──
  async getModelRoute(model: string): Promise<ModelRoute | null> {
    return MODEL_ROUTES[model] ?? null
  }

  // ── Usage ──
  async recordUsage(userId: string, record: UsageRecord): Promise<void> {
    const c = this.getClient()
    const month = record.timestamp.slice(0, 7)
    const key = KEYS.USAGE(userId, month)
    await c.rpush(key, JSON.stringify(record))
    await c.expire(key, 90 * 86400) // Auto-expire after 90 days
  }

  async getUsage(userId: string, month: string): Promise<UsageRecord[]> {
    const raw = await this.getClient().lrange(KEYS.USAGE(userId, month), 0, -1)
    return (raw || []).map((item: unknown) => {
      try { return JSON.parse(item as string) as UsageRecord }
      catch { return null }
    }).filter(Boolean) as UsageRecord[]
  }

  // ── Rate Limit (atomic with Redis) ──
  async checkRateLimit(ip: string, max: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
    const c = this.getClient()
    const key = KEYS.RATE_LIMIT(ip)
    const current = await c.incr(key)
    if (current === 1) await c.expire(key, window)
    return {
      allowed: current <= max,
      remaining: Math.max(0, max - current),
    }
  }
}

// ── Singleton Factory ──
let vercelKvInstance: VercelKV | null = null
let initialized = false

export async function getVercelKV(): Promise<VercelKV | null> {
  if (initialized) return vercelKvInstance
  const instance = new VercelKV()
  const ok = await instance.init()
  if (ok) vercelKvInstance = instance
  initialized = true
  return ok ? instance : null
}
