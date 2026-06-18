'use client'

import { useStore, type RobinStrategy } from '@/store'

const STRATEGIES: { id: RobinStrategy; name: string; desc: string }[] = [
  { id: 'lbc', name: 'Least-Busy Circuit', desc: 'Pilih key paling sepi, distribusi beban merata' },
  { id: 'water', name: 'Waterfall', desc: 'Gratis dulu, baru berbayar — hemat budget' },
  { id: 'random', name: 'Random', desc: 'Acak dari pool key aktif — distribusi rata' },
  { id: 'failover', name: 'Failover', desc: 'Primary → Backup → Free — prioritas reliability' },
]

export default function RoutingPage() {
  const { providers, defaultStrategy, setDefaultStrategy, perProviderStrategy, setPerProviderStrategy } = useStore()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Routing Config</h1>
        <p className="text-sm text-gray-400 mt-1">Pilih strategi routing — global & per-provider</p>
      </div>

      {/* ── Global Strategy ── */}
      <div className="mb-8 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
        <h2 className="text-sm font-medium mb-3">Default Strategy (Global)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {STRATEGIES.map(s => (
            <button
              key={s.id}
              onClick={() => setDefaultStrategy(s.id)}
              className={`p-3 rounded-lg border text-left text-xs transition-colors ${
                defaultStrategy === s.id
                  ? 'border-[var(--color-paseban-600)] bg-[var(--color-paseban-600)]/10'
                  : 'border-[var(--color-border)] hover:border-gray-600'
              }`}
            >
              <div className="font-medium text-sm mb-0.5">{s.name}</div>
              <div className="text-gray-500">{s.desc}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Global: <span className="text-[var(--color-paseban-400)] font-mono">{defaultStrategy}</span>
          {Object.keys(perProviderStrategy).length > 0 && (
            <> · {Object.keys(perProviderStrategy).length} provider override active</>
          )}
        </div>
      </div>

      {/* ── Per-Provider Strategy ── */}
      <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
        <h2 className="text-sm font-medium mb-3">Per-Provider Override</h2>
        {providers.length === 0 ? (
          <p className="text-xs text-gray-500">Belum ada provider. Tambah provider dulu di dashboard.</p>
        ) : (
          <div className="space-y-2">
            {providers.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)]">
                <div>
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{p.keys.length} keys</span>
                </div>
                <select
                  value={perProviderStrategy[p.id] || defaultStrategy}
                  onChange={e => setPerProviderStrategy(p.id, e.target.value as RobinStrategy)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-white outline-none"
                >
                  <option value="">Inherit ({defaultStrategy})</option>
                  {STRATEGIES.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Strategy Reference ── */}
      <div className="mt-6 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
        <h2 className="text-sm font-medium mb-3">When to Use Which?</h2>
        <div className="text-xs text-gray-400 space-y-2">
          <p><span className="text-[var(--color-paseban-400)] font-mono">lbc</span> → High-traffic apps, multi-key dengan usage gak rata. Biar bebannya seimbang.</p>
          <p><span className="text-[var(--color-paseban-400)] font-mono">water</span> → Mau hemat. Pake key gratis sampe habis quota, baru pake berbayar.</p>
          <p><span className="text-[var(--color-paseban-400)] font-mono">random</span> → Testing / load balancing simpel. Gak perlu tracking metrics.</p>
          <p><span className="text-[var(--color-paseban-400)] font-mono">failover</span> → Production mission-critical. Primary dulu, backup kalo mati.</p>
        </div>
      </div>
    </div>
  )
}
