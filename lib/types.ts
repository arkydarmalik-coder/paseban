/** Paseban — Type Definitions */

// ── API Key ──
export type KeyTier = 'primary' | 'backup' | 'free'
export type KeyStatus = 'active' | 'rate_limited' | 'exhausted' | 'error'

export interface ApiKey {
  id: string
  key: string
  label: string
  tier: KeyTier
  status: KeyStatus
  monthlyQuota: number
  monthlyUsed: number
  lastUsed: string | null
  resetAt: string | null
}

// ── Provider ──
export interface Provider {
  id: string
  name: string
  baseUrl: string
  custom: boolean
  apiKeyFormat?: 'Bearer' | 'Api-Key' | 'X-API-Key'
  headers?: Record<string, string>
  keys: ApiKey[]
  models: ModelDef[]
  createdAt: string
}

export interface BuiltinProvider {
  id: string
  name: string
  baseUrl: string
  defaultModels: string[]
}

// ── Model ──
export interface ModelDef {
  id: string
  context: number
  cost?: { input: number; output: number }
}

export interface ModelRoute {
  model: string
  providers: { providerId: string; model: string; context: number; cost: { input: number; output: number } }[]
}

// ── Robin Routing ──
export type RobinStrategy = 'lbc' | 'water' | 'random' | 'failover'

export interface RobinConfig {
  defaultStrategy: RobinStrategy
  strategies: Record<string, RobinStrategy>  // per-provider override
}

export interface KeyMetrics {
  requestCount: number
  totalTokens: number
  successRate: number
  avgLatency: number
  errors429: number
  errors5xx: number
  lastRequest: string | null
}

export interface RobinDecision {
  keyId: string
  apiKey: string
  baseUrl: string
  providerId: string
  model: string
  strategy: RobinStrategy
}

// ── API Request/Response ──
export interface ChatCompletionRequest {
  model: string
  messages: { role: string; content: string }[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
  [key: string]: unknown
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: { role: string; content: string }
    finish_reason: string
  }[]
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

// ── API Error ──
export interface ApiError {
  error: {
    message: string
    type: string
    code: string
    status: number
  }
}

// ── Usage ──
export interface UsageRecord {
  timestamp: string
  providerId: string
  keyId: string
  model: string
  tokens: number
  latency: number
  success: boolean
  statusCode: number
}

// ── KV Store Keys ──
export const KV_KEYS = {
  PROVIDERS_REGISTRY: 'providers:registry',
  USER_PROVIDER: (uid: string, pid: string) => `user:${uid}:provider:${pid}`,
  USER_ROBIN_CONFIG: (uid: string) => `user:${uid}:robin:config`,
  USER_ROBIN_METRICS: (uid: string, pid: string, kid: string) =>
    `user:${uid}:robin:metrics:${pid}:${kid}`,
  USER_USAGE: (uid: string, month: string) => `user:${uid}:usage:${month}`,
  RATE_LIMIT: (ip: string) => `ratelimit:${ip}`,
  MODEL_ROUTE: (model: string) => `models:${model}`,
} as const
