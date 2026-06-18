/**
 * Zustand Store — Paseban State Management
 * ECC Skill: frontend-patterns ← state management dengan store pattern
 */

import { create } from 'zustand'

export type KeyTier = 'primary' | 'backup' | 'free'
export type KeyStatus = 'active' | 'rate_limited' | 'exhausted' | 'error'
export type RobinStrategy = 'lbc' | 'water' | 'random' | 'failover'

export interface ApiKeyStore {
  id: string
  key: string
  label: string
  tier: KeyTier
  status: KeyStatus
  monthlyQuota: number
  monthlyUsed: number
}

export interface ProviderStore {
  id: string
  name: string
  baseUrl: string
  custom: boolean
  keys: ApiKeyStore[]
  models: string[]
}

export interface AppState {
  // Providers
  providers: ProviderStore[]
  addProvider: (p: ProviderStore) => void
  removeProvider: (id: string) => void
  updateProvider: (id: string, p: Partial<ProviderStore>) => void
  addKey: (providerId: string, key: ApiKeyStore) => void
  removeKey: (providerId: string, keyId: string) => void
  updateKeyStatus: (providerId: string, keyId: string, status: KeyStatus) => void

  // Routing
  defaultStrategy: RobinStrategy
  setDefaultStrategy: (s: RobinStrategy) => void
  perProviderStrategy: Record<string, RobinStrategy>
  setPerProviderStrategy: (providerId: string, strategy: RobinStrategy) => void

  // Built-in providers
  builtinProviders: { id: string; name: string; defaultModels: string[] }[]
  setBuiltinProviders: (ps: { id: string; name: string; defaultModels: string[] }[]) => void
}

export const useStore = create<AppState>((set) => ({
  providers: [],
  addProvider: (p) => set((s) => ({ providers: [...s.providers, p] })),
  removeProvider: (id) => set((s) => ({ providers: s.providers.filter((p) => p.id !== id) })),
  updateProvider: (id, patch) => set((s) => ({
    providers: s.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  })),
  addKey: (providerId, key) => set((s) => ({
    providers: s.providers.map((p) =>
      p.id === providerId ? { ...p, keys: [...p.keys, key] } : p
    ),
  })),
  removeKey: (providerId, keyId) => set((s) => ({
    providers: s.providers.map((p) =>
      p.id === providerId ? { ...p, keys: p.keys.filter((k) => k.id !== keyId) } : p
    ),
  })),
  updateKeyStatus: (providerId, keyId, status) => set((s) => ({
    providers: s.providers.map((p) =>
      p.id === providerId
        ? { ...p, keys: p.keys.map((k) => (k.id === keyId ? { ...k, status } : k)) }
        : p
    ),
  })),

  defaultStrategy: 'lbc',
  setDefaultStrategy: (s) => set({ defaultStrategy: s }),
  perProviderStrategy: {},
  setPerProviderStrategy: (providerId, strategy) => set((s) => ({
    perProviderStrategy: { ...s.perProviderStrategy, [providerId]: strategy },
  })),

  builtinProviders: [],
  setBuiltinProviders: (ps) => set({ builtinProviders: ps }),
}))
