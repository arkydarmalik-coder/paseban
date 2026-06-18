'use client'

import { useParams, useRouter } from 'next/navigation'
import { useStore } from '@/store'
import { BUILTIN_PROVIDERS } from '@/lib/kv'
import { useState } from 'react'

export default function ProviderDetail() {
  const params = useParams()
  const router = useRouter()
  const providerId = params.providerId as string

  const builtin = BUILTIN_PROVIDERS.find(p => p.id === providerId)
  const { providers, addKey, removeKey, updateKeyStatus } = useStore()
  const customProv = providers.find(p => p.id === providerId)
  const provider = customProv || builtin

  const [keyForm, setKeyForm] = useState({ key: '', label: '', tier: 'backup' as 'primary' | 'backup' | 'free', quota: '100000' })

  if (!provider) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-lg font-bold mb-2">Provider Not Found</h1>
        <p className="text-sm text-gray-400 mb-4">Provider &ldquo;{providerId}&rdquo; gak dikenal.</p>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-[var(--color-paseban-400)] hover:underline">
          ← Back to providers
        </button>
      </div>
    )
  }

  const keys = customProv?.keys || []
  const models = 'defaultModels' in provider ? provider.defaultModels : (customProv?.models || [])
  const baseUrl = 'baseUrl' in provider ? provider.baseUrl : ''

  function handleAddKey() {
    if (!keyForm.key || !customProv) return
    addKey(providerId, {
      id: `key-${Date.now()}`,
      key: keyForm.key,
      label: keyForm.label || keyForm.key.slice(0, 12),
      tier: keyForm.tier,
      status: 'active',
      monthlyQuota: parseInt(keyForm.quota) || 100000,
      monthlyUsed: 0,
    })
    setKeyForm({ key: '', label: '', tier: 'backup', quota: '100000' })
  }

  return (
    <div className="max-w-3xl">
      {/* ── Header ── */}
      <div className="mb-6">
        <button onClick={() => router.push('/dashboard')} className="text-xs text-gray-500 hover:text-gray-400 mb-2 block">
          ← Back to providers
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{'name' in provider ? provider.name : providerId}</h1>
          {!customProv && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px]">built-in</span>}
        </div>
        <p className="text-sm text-gray-400 mt-1">{baseUrl || 'OpenAI-compatible'}</p>
      </div>

      {/* ── Models ── */}
      <div className="mb-6 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
        <h2 className="text-sm font-medium mb-3">Supported Models ({models.length})</h2>
        <div className="flex flex-wrap gap-2">
          {models.map((m: string) => (
            <span key={m} className="px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-gray-300">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* ── API Keys ── */}
      <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">API Keys ({keys.length})</h2>
          {!customProv && (
            <span className="text-xs text-gray-500">Keys disimpan di Paseban — aman 🔒</span>
          )}
        </div>

        {/* Add Key (hanya kalo provider udah di-customize) */}
        <div className="flex gap-2 mb-4 p-2 rounded-lg bg-[var(--color-surface)]">
          <input value={keyForm.key} onChange={e => setKeyForm(f => ({ ...f, key: e.target.value }))} placeholder="API Key (sk-...)" className="flex-1 px-2 py-1.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-white placeholder-gray-500 outline-none" />
          <input value={keyForm.label} onChange={e => setKeyForm(f => ({ ...f, label: e.target.value }))} placeholder="Label" className="w-20 px-2 py-1.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-white placeholder-gray-500 outline-none" />
          <select value={keyForm.tier} onChange={e => setKeyForm(f => ({ ...f, tier: e.target.value as 'primary' | 'backup' | 'free' }))} className="px-2 py-1.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-white outline-none">
            <option value="primary">Primary</option>
            <option value="backup">Backup</option>
            <option value="free">Free</option>
          </select>
          <button onClick={handleAddKey} className="px-3 py-1.5 rounded bg-green-600 text-xs font-medium whitespace-nowrap">+ Add</button>
        </div>

        {/* Key List */}
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface)] text-xs">
              <span className={`w-2 h-2 rounded-full ${k.status === 'active' ? 'bg-green-500' : k.status === 'rate_limited' ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span className="font-mono text-gray-300 truncate max-w-[180px]">{k.key.slice(0, 20)}...</span>
              <span className="text-gray-500">{k.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${k.tier === 'primary' ? 'bg-blue-500/20 text-blue-400' : k.tier === 'backup' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                {k.tier}
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-gray-500 text-[10px]">{k.monthlyUsed.toLocaleString()}/{k.monthlyQuota.toLocaleString()}</span>
                <button
                  onClick={() => updateKeyStatus(providerId, k.id, k.status === 'active' ? 'error' : 'active')}
                  className="text-gray-500 hover:text-yellow-400 transition-colors ml-2"
                  title="Toggle status"
                >
                  ⊘
                </button>
                <button onClick={() => removeKey(providerId, k.id)} className="text-gray-500 hover:text-red-400 transition-colors" title="Remove key">✕</button>
              </div>
            </div>
          ))}
          {keys.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">
              Belum ada API key. Tambah key biar Robin bisa routing request ke provider ini.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
