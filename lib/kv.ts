/**
 * KV Repository — Data access layer (Repository Pattern)
 * ECC Skill: backend-patterns ← repository pattern
 *
 * Abstraksi akses Vercel KV Redis.
 * Fallback ke Map in-memory kalo Vercel KV gak available (dev/local).
 */

import type {
  Provider, BuiltinProvider, ApiKey, KeyMetrics,
  RobinConfig, UsageRecord, ModelRoute
} from './types'

// ── Interface (Repository Pattern) ──
export interface KVRepository {
  // Provider registry
  getBuiltinProviders(): Promise<BuiltinProvider[]>

  // User providers
  getUserProviders(userId: string): Promise<string[]>
  getProvider(userId: string, providerId: string): Promise<Provider | null>
  setProvider(userId: string, providerId: string, provider: Provider): Promise<void>
  deleteProvider(userId: string, providerId: string): Promise<void>

  // Robin config
  getRobinConfig(userId: string): Promise<RobinConfig>
  setRobinConfig(userId: string, config: RobinConfig): Promise<void>

  // Key metrics
  getKeyMetrics(userId: string, providerId: string, keyId: string): Promise<KeyMetrics>
  setKeyMetrics(userId: string, providerId: string, keyId: string, metrics: KeyMetrics): Promise<void>

  // Model routes
  getModelRoute(model: string): Promise<ModelRoute | null>

  // Usage
  recordUsage(userId: string, record: UsageRecord): Promise<void>
  getUsage(userId: string, month: string): Promise<UsageRecord[]>

  // Rate limit
  checkRateLimit(ip: string, max: number, window: number): Promise<{ allowed: boolean; remaining: number }>
}

// ── In-Memory Implementation (dev/fallback) ──
export class InMemoryKV implements KVRepository {
  private providers = new Map<string, Provider>()
  private robinConfigs = new Map<string, RobinConfig>()
  private keyMetrics = new Map<string, KeyMetrics>()
  private usageLogs = new Map<string, UsageRecord[]>()
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>()

  clear(): void {
    this.providers.clear()
    this.robinConfigs.clear()
    this.keyMetrics.clear()
    this.usageLogs.clear()
    this.rateLimitMap.clear()
  }

  async getBuiltinProviders(): Promise<BuiltinProvider[]> {
    return BUILTIN_PROVIDERS
  }

  async getUserProviders(userId: string): Promise<string[]> {
    const prefix = `${userId}:`
    return Array.from(this.providers.keys())
      .filter(k => k.startsWith(prefix))
      .map(k => k.split(':')[1])
  }

  async getProvider(userId: string, providerId: string): Promise<Provider | null> {
    return this.providers.get(`${userId}:${providerId}`) ?? null
  }

  async setProvider(userId: string, providerId: string, provider: Provider): Promise<void> {
    this.providers.set(`${userId}:${providerId}`, provider)
  }

  async deleteProvider(userId: string, providerId: string): Promise<void> {
    this.providers.delete(`${userId}:${providerId}`)
  }

  async getRobinConfig(userId: string): Promise<RobinConfig> {
    return this.robinConfigs.get(userId) ?? {
      defaultStrategy: 'lbc',
      strategies: {}
    }
  }

  async setRobinConfig(userId: string, config: RobinConfig): Promise<void> {
    this.robinConfigs.set(userId, config)
  }

  async getKeyMetrics(userId: string, providerId: string, keyId: string): Promise<KeyMetrics> {
    const k = `${userId}:${providerId}:${keyId}`
    return this.keyMetrics.get(k) ?? {
      requestCount: 0, totalTokens: 0, successRate: 1,
      avgLatency: 0, errors429: 0, errors5xx: 0, lastRequest: null
    }
  }

  async setKeyMetrics(userId: string, providerId: string, keyId: string, metrics: KeyMetrics): Promise<void> {
    this.keyMetrics.set(`${userId}:${providerId}:${keyId}`, metrics)
  }

  async getModelRoute(model: string): Promise<ModelRoute | null> {
    // Check static routes first
    if (MODEL_ROUTES[model]) return MODEL_ROUTES[model]

    // TODO: Dynamic lookup for custom providers (needs userId context)
    // For now, assume custom models are mapped 1:1 to their provider
    // This will be properly handled in the main API route logic with userId
    return null
  }

  async recordUsage(userId: string, record: UsageRecord): Promise<void> {
    const month = record.timestamp.slice(0, 7) // "2026-06"
    const key = `${userId}:${month}`
    const logs = this.usageLogs.get(key) ?? []
    logs.push(record)
    this.usageLogs.set(key, logs)
  }

  async getUsage(userId: string, month: string): Promise<UsageRecord[]> {
    return this.usageLogs.get(`${userId}:${month}`) ?? []
  }

  async checkRateLimit(ip: string, max: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now()
    const entry = this.rateLimitMap.get(ip)

    if (!entry || now > entry.resetAt) {
      this.rateLimitMap.set(ip, { count: 1, resetAt: now + window * 1000 })
      return { allowed: true, remaining: max - 1 }
    }

    entry.count++
    if (entry.count > max) {
      return { allowed: false, remaining: 0 }
    }
    return { allowed: true, remaining: max - entry.count }
  }
}

// ── Built-in Providers ──
export const BUILTIN_PROVIDERS: BuiltinProvider[] = [
  { id: 'openai',    name: 'OpenAI',    baseUrl: 'https://api.openai.com/v1',          defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1',        defaultModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'] },
  { id: 'gemini',    name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', defaultModels: ['gemini-2.0-flash', 'gemini-1.5-pro'] },
  { id: 'deepseek',  name: 'DeepSeek',  baseUrl: 'https://api.deepseek.com/v1',         defaultModels: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'groq',      name: 'Groq',      baseUrl: 'https://api.groq.com/openai/v1',     defaultModels: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant'] },
  { id: 'mistral',   name: 'Mistral',   baseUrl: 'https://api.mistral.ai/v1',          defaultModels: ['mistral-large-latest', 'mistral-small-latest'] },
  { id: 'together',  name: 'Together',  baseUrl: 'https://api.together.xyz/v1',         defaultModels: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'] },
  { id: 'fireworks', name: 'Fireworks', baseUrl: 'https://api.fireworks.ai/inference/v1', defaultModels: ['accounts/fireworks/models/llama-v3p1-70b-instruct'] },
  { id: 'perplexity', name: 'Perplexity', baseUrl: 'https://api.perplexity.ai',          defaultModels: ['sonar-pro', 'sonar'] },
  { id: 'cohere',    name: 'Cohere',    baseUrl: 'https://api.cohere.ai/v1',            defaultModels: ['command-r-plus', 'command-r'] },
]

// ── Model Routing Table ──
export const MODEL_ROUTES: Record<string, ModelRoute> = {
  'gpt-4o': {
    model: 'gpt-4o',
    providers: [
      { providerId: 'openai', model: 'gpt-4o', context: 128000, cost: { input: 2.50, output: 10.00 } },
    ]
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    providers: [
      { providerId: 'openai', model: 'gpt-4o-mini', context: 128000, cost: { input: 0.15, output: 0.60 } },
    ]
  },
  'claude-3-5-sonnet-20241022': {
    model: 'claude-3-5-sonnet-20241022',
    providers: [
      { providerId: 'anthropic', model: 'claude-3-5-sonnet-20241022', context: 200000, cost: { input: 3.00, output: 15.00 } },
    ]
  },
  'deepseek-chat': {
    model: 'deepseek-chat',
    providers: [
      { providerId: 'deepseek', model: 'deepseek-chat', context: 128000, cost: { input: 0.27, output: 1.10 } },
    ]
  },
  'gemini-2.0-flash': {
    model: 'gemini-2.0-flash',
    providers: [
      { providerId: 'gemini', model: 'gemini-2.0-flash', context: 1048576, cost: { input: 0.10, output: 0.40 } },
    ]
  },
}

// ── Singleton ──
export const kv: KVRepository = new InMemoryKV()
