'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useStore, type ApiKeyStore, type ProviderStore } from '@/store'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  rate_limited: 'bg-yellow-500',
  exhausted: 'bg-red-500',
  error: 'bg-red-400',
}

export default function DashboardProviders() {
  const { providers, addProvider, removeProvider, builtinProviders, setBuiltinProviders } = useStore()
  const [loaded, setLoaded] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', baseUrl: '', models: '' })
  const [showAddKey, setShowAddKey] = useState<string | null>(null)
  const [keyForm, setKeyForm] = useState<{ key: string; label: string; tier: 'primary' | 'backup' | 'free'; quota: string }>({ key: '', label: '', tier: 'backup', quota: '100000' })

  // Load built-in providers
  useEffect(() => {
    fetch('/api/v1/models')
      .then(r => r.json())
      .then(data => {
        // Group by owned_by
        const map = new Map<string, string[]>()
        for (const m of data.data || []) {
          const arr = map.get(m.owned_by) || []
          arr.push(m.id)
          map.set(m.owned_by, arr)
        }
        const providers = Array.from(map.entries()).map(([id, models]) => ({
          id, name: id.charAt(0).toUpperCase() + id.slice(1), defaultModels: models.slice(0, 4)
        }))
        setBuiltinProviders(providers)
      })
      .catch(() => {})
    setLoaded(true)
  }, [setBuiltinProviders])

  function handleAddProvider() {
    if (!form.name || !form.baseUrl) return
    const id = form.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const newProvider: ProviderStore = {
      id,
      name: form.name,
      baseUrl: form.baseUrl,
      custom: true,
      keys: [],
      models: form.models.split(',').map(m => m.trim()).filter(Boolean),
    }
    addProvider(newProvider)
    setForm({ name: '', baseUrl: '', models: '' })
    setShowAdd(false)
  }

  function handleAddKey(providerId: string) {
    if (!keyForm.key) return
    const newKey: ApiKeyStore = {
      id: `key-${Date.now()}`,
      key: keyForm.key,
      label: keyForm.label || keyForm.key.slice(0, 12),
      tier: keyForm.tier,
      status: 'active',
      monthlyQuota: parseInt(keyForm.quota) || 100000,
      monthlyUsed: 0,
    }
    useStore.getState().addKey(providerId, newKey)
    setKeyForm({ key: '', label: '', tier: 'backup', quota: '100000' })
    setShowAddKey(null)
  }

  // Merge built-in + custom
  const allProviders = [
    ...builtinProviders.map(bp => {
      const existing = providers.find(p => p.id === bp.id || p.name.toLowerCase() === bp.name.toLowerCase())
      return existing || {
        id: bp.id,
        name: bp.name,
        baseUrl: '',
        custom: false,
        keys: [] as ApiKeyStore[],
        models: bp.defaultModels,
      }
    }),
    ...providers.filter(p => !builtinProviders.find(bp => bp.id === p.id)),
  ]

  if (!loaded) return <div className="text-gray-500 text-sm">Loading providers...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Providers</h1>
          <p className="text-sm text-gray-400 mt-1">{allProviders.length} provider terdaftar</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-lg bg-[var(--color-paseban-600)] hover:bg-[var(--color-paseban-500)] text-sm font-medium transition-colors"
        >
          + Add Provider
        </button>
      </div>

      {/* ── Add Provider Form ── */}
      {showAdd && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-3">
          <h3 className="text-sm font-medium">Custom Provider</h3>
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Provider name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-white placeholder-gray-500 outline-none focus:border-[var(--color-paseban-600)]"
            />
            <input
              placeholder="Base URL (https://...)"
              value={form.baseUrl}
              onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-white placeholder-gray-500 outline-none focus:border-[var(--color-paseban-600)]"
            />
            <input
              placeholder="Models (comma-separated)"
              value={form.models}
              onChange={e => setForm(f => ({ ...f, models: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-white placeholder-gray-500 outline-none focus:border-[var(--color-paseban-600)]"
            />
          </div>
          <button onClick={handleAddProvider} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-sm font-medium transition-colors">
            Save Provider
          </button>
        </div>
      )}

      {/* ── Provider Cards ── */}
      <div className="space-y-3">
        {allProviders.map(p => (
          <div key={p.id} className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{p.name}</h3>
                  {p.custom && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-paseban-600)]/20 text-[var(--color-paseban-400)]">custom</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{p.baseUrl || 'built-in'}</div>
              </div>
              {p.custom && (
                <button onClick={() => removeProvider(p.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                  remove
                </button>
              )}
            </div>

            {/* Models */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {p.models.map(m => (
                <span key={m} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-gray-400">
                  {m}
                </span>
              ))}
            </div>

            {/* Keys */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">API Keys ({p.keys.length})</span>
                <button
                  onClick={() => setShowAddKey(showAddKey === p.id ? null : p.id)}
                  className="text-xs text-[var(--color-paseban-400)] hover:text-[var(--color-paseban-300)]"
                >
                  + Add Key
                </button>
              </div>

              {showAddKey === p.id && (
                <div className="flex gap-2 p-2 rounded-lg bg-[var(--color-surface)]">
                  <input
                    placeholder="API Key"
                    value={keyForm.key}
                    onChange={e => setKeyForm(f => ({ ...f, key: e.target.value }))}
                    className="flex-1 px-2 py-1.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-white placeholder-gray-500 outline-none"
                  />
                  <input
                    placeholder="Label"
                    value={keyForm.label}
                    onChange={e => setKeyForm(f => ({ ...f, label: e.target.value }))}
                    className="w-24 px-2 py-1.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-white placeholder-gray-500 outline-none"
                  />
                  <select
                    value={keyForm.tier}
                    onChange={e => setKeyForm(f => ({ ...f, tier: e.target.value as 'primary' | 'backup' | 'free' }))}
                    className="px-2 py-1.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-white outline-none"
                  >
                    <option value="primary">Primary</option>
                    <option value="backup">Backup</option>
                    <option value="free">Free</option>
                  </select>
                  <button onClick={() => handleAddKey(p.id)} className="px-3 py-1.5 rounded bg-green-600 text-xs font-medium">Add</button>
                </div>
              )}

              {p.keys.map(k => (
                <div key={k.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--color-surface)] text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[k.status] || 'bg-gray-500'}`} />
                  <span className="font-mono text-gray-300 truncate max-w-[200px]">{k.key.slice(0, 24)}...</span>
                  <span className="text-gray-500">{k.label}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    k.tier === 'primary' ? 'bg-blue-500/20 text-blue-400' :
                    k.tier === 'backup' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {k.tier}
                  </span>
                  <span className="text-gray-500 ml-auto">{k.monthlyUsed.toLocaleString()} / {k.monthlyQuota.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
