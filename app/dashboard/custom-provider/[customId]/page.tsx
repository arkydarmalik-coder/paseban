'use client'

import { useParams, useRouter } from 'next/navigation'
import { useStore, type ProviderStore } from '@/store'
import { useState, useEffect } from 'react'

export default function CustomProviderDetail() {
  const params = useParams()
  const router = useRouter()
  const providerId = params.customId as string
  const { providers, updateProvider, removeProvider, addKey, removeKey } = useStore()

  const provider = providers.find(p => p.id === providerId)

  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({ name: '', baseUrl: '', models: '' })
  const [keyForm, setKeyForm] = useState({ key: '', label: '', tier: 'backup' as 'primary' | 'backup' | 'free', quota: '100000' })

  useEffect(() => {
    if (provider) setForm({ name: provider.name, baseUrl: provider.baseUrl, models: provider.models.join(', ') })
  }, [provider])

  if (!provider) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-lg font-bold mb-2">Provider Not Found</h1>
        <p className="text-sm text-gray-400 mb-4">Custom provider &ldquo;{providerId}&rdquo; gak ditemukan.</p>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-[var(--color-paseban-400)] hover:underline">
          ← Back to providers
        </button>
      </div>
    )
  }

  function handleSave() {
    updateProvider(providerId, {
      name: form.name,
      baseUrl: form.baseUrl,
      models: form.models.split(',').map(m => m.trim()).filter(Boolean),
    })
    setEdit(false)
  }

  function handleAddKey() {
    if (!keyForm.key) return
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-xs text-gray-500 hover:text-gray-400 mb-2 block">
            ← Back to providers
          </button>
          <h1 className="text-xl font-bold">{provider.name}</h1>
          <p className="text-sm text-gray-400 mt-1">
            <span className="px-1.5 py-0.5 rounded bg-[var(--color-paseban-600)]/20 text-[var(--color-paseban-400)] text-[10px] mr-2">custom</span>
            {provider.baseUrl}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEdit(!edit)} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs hover:bg-[var(--color-card)] transition-colors">
            {edit ? 'Cancel' : 'Edit'}
          </button>
          <button
            onClick={() => { removeProvider(providerId); router.push('/dashboard') }}
            className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* ── Edit Form ── */}
      {edit && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-3">
          <h3 className="text-sm font-medium">Edit Provider</h3>
          <div className="grid grid-cols-3 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-white placeholder-gray-500 outline-none focus:border-[var(--color-paseban-600)]" />
            <input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder="Base URL" className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-white placeholder-gray-500 outline-none focus:border-[var(--color-paseban-600)]" />
            <input value={form.models} onChange={e => setForm(f => ({ ...f, models: e.target.value }))} placeholder="Models (comma)" className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-white placeholder-gray-500 outline-none focus:border-[var(--color-paseban-600)]" />
          </div>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-sm font-medium transition-colors">
            Save Changes
          </button>
        </div>
      )}

      {/* ── Models ── */}
      <div className="mb-6 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
        <h2 className="text-sm font-medium mb-3">Models ({provider.models.length})</h2>
        <div className="flex flex-wrap gap-2">
          {provider.models.map(m => (
            <span key={m} className="px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-gray-300">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* ── API Keys ── */}
      <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">API Keys ({provider.keys.length})</h2>
        </div>

        {/* Add Key Form */}
        <div className="flex gap-2 mb-4 p-2 rounded-lg bg-[var(--color-surface)]">
          <input value={keyForm.key} onChange={e => setKeyForm(f => ({ ...f, key: e.target.value }))} placeholder="sk-..." className="flex-1 px-2 py-1.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-white placeholder-gray-500 outline-none" />
          <input value={keyForm.label} onChange={e => setKeyForm(f => ({ ...f, label: e.target.value }))} placeholder="Label" className="w-20 px-2 py-1.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-white placeholder-gray-500 outline-none" />
          <select value={keyForm.tier} onChange={e => setKeyForm(f => ({ ...f, tier: e.target.value as 'primary' | 'backup' | 'free' }))} className="px-2 py-1.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-white outline-none">
            <option value="primary">Primary</option>
            <option value="backup">Backup</option>
            <option value="free">Free</option>
          </select>
          <button onClick={handleAddKey} className="px-3 py-1.5 rounded bg-green-600 text-xs font-medium whitespace-nowrap">+ Add Key</button>
        </div>

        {/* Key List */}
        <div className="space-y-2">
          {provider.keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface)] text-xs">
              <span className={`w-2 h-2 rounded-full ${k.status === 'active' ? 'bg-green-500' : k.status === 'rate_limited' ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span className="font-mono text-gray-300 truncate max-w-[200px]">{k.key.slice(0, 24)}...</span>
              <span className="text-gray-500">{k.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${k.tier === 'primary' ? 'bg-blue-500/20 text-blue-400' : k.tier === 'backup' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                {k.tier}
              </span>
              <span className="text-gray-500">{k.monthlyUsed.toLocaleString()} / {k.monthlyQuota.toLocaleString()}</span>
              <button onClick={() => removeKey(providerId, k.id)} className="ml-auto text-gray-500 hover:text-red-400 transition-colors">✕</button>
            </div>
          ))}
          {provider.keys.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Belum ada API key. Tambah key di atas.</p>}
        </div>
      </div>
    </div>
  )
}
