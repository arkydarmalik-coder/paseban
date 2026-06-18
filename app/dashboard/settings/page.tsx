'use client'

import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<{ id: string; key: string; label: string; createdAt: string; lastUsed: string | null }[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [showNewKey, setShowNewKey] = useState<string | null>(null)

  // Load dari localStorage
  useEffect(() => {
    const stored = localStorage.getItem('paseban_api_keys')
    if (stored) setApiKeys(JSON.parse(stored))
  }, [])

  function saveKeys(keys: typeof apiKeys) {
    setApiKeys(keys)
    localStorage.setItem('paseban_api_keys', JSON.stringify(keys))
  }

  function generateKey() {
    // Format: paseban_ + 40 random hex chars
    const random = Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
    const newKey = {
      id: `apk-${Date.now()}`,
      key: `paseban_${random}`,
      label: `Key ${apiKeys.length + 1}`,
      createdAt: new Date().toISOString(),
      lastUsed: null,
    }
    const updated = [...apiKeys, newKey]
    saveKeys(updated)
    setShowNewKey(newKey.key)
    setTimeout(() => setShowNewKey(null), 15000)
  }

  function deleteKey(id: string) {
    if (!confirm('Hapus API key ini? Semua request pake key ini bakal ditolak.')) return
    saveKeys(apiKeys.filter(k => k.id !== id))
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback select
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">API key management & account</p>
      </div>

      {/* ── API Keys ── */}
      <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium">API Keys</h2>
            <p className="text-xs text-gray-500 mt-0.5">Gunakan key ini di Authorization header buat akses API Paseban</p>
          </div>
          <button onClick={generateKey} className="px-4 py-2 rounded-lg bg-[var(--color-paseban-600)] hover:bg-[var(--color-paseban-500)] text-xs font-medium transition-colors">
            + Generate New Key
          </button>
        </div>

        {/* Show new key banner */}
        {showNewKey && (
          <div className="mb-4 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
            <div className="text-xs text-green-400 font-medium mb-1">🚨 Save this key! It won't be shown again.</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded bg-[var(--color-surface)] text-xs font-mono text-green-300 break-all">
                {showNewKey}
              </code>
              <button
                onClick={() => copyToClipboard(showNewKey)}
                className="px-3 py-2 rounded bg-green-600 text-xs font-medium whitespace-nowrap"
              >
                {copied === showNewKey ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Key List */}
        {apiKeys.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500">
            Belum ada API key. Generate key pertama kamu.
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map(k => (
              <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface)]">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{k.label}</div>
                  <code className="text-[11px] text-gray-400 font-mono block truncate">{k.key.slice(0, 28)}...</code>
                </div>
                <div className="text-[10px] text-gray-500 text-right">
                  <div>Created: {new Date(k.createdAt).toLocaleDateString()}</div>
                  <div>{k.lastUsed ? `Last: ${new Date(k.lastUsed).toLocaleDateString()}` : 'Never used'}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(k.key)}
                  className="px-2 py-1 rounded bg-[var(--color-card)] text-[10px] text-gray-400 hover:text-white transition-colors"
                >
                  {copied === k.key ? '✅' : 'Copy'}
                </button>
                <button onClick={() => deleteKey(k.id)} className="text-gray-500 hover:text-red-400 transition-colors text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Start ── */}
      <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
        <h2 className="text-sm font-medium mb-3">Quick Start</h2>
        <pre className="text-xs text-gray-300 font-mono bg-[var(--color-surface)] p-3 rounded-lg overflow-x-auto">
{`curl https://paseban.app/api/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
        </pre>
      </div>
    </div>
  )
}
