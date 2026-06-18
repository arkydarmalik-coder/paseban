'use client'

import { useEffect, useState } from 'react'

interface UsageData {
  month: string
  summary: {
    totalRequests: number
    totalTokens: number
    totalErrors: number
    avgLatency: number
    uptime: string
  }
  byProvider: Record<string, { requests: number; tokens: number; errors: number; avgLatency: number }>
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/usage')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-500 text-sm">Loading usage...</div>
  if (!data) return <div className="text-gray-500 text-sm">Gagal load usage data.</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Usage</h1>
        <p className="text-sm text-gray-400 mt-1">Periode: {data.month}</p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Requests', value: data.summary.totalRequests.toLocaleString(), color: 'text-blue-400' },
          { label: 'Total Tokens', value: data.summary.totalTokens.toLocaleString(), color: 'text-green-400' },
          { label: 'Avg Latency', value: `${data.summary.avgLatency}ms`, color: 'text-yellow-400' },
          { label: 'Uptime', value: data.summary.uptime, color: data.summary.uptime === '100%' ? 'text-green-400' : 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Per-Provider Table ── */}
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] text-sm font-medium">Per Provider</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-gray-500">
                <th className="text-left p-3 font-medium">Provider</th>
                <th className="text-right p-3 font-medium">Requests</th>
                <th className="text-right p-3 font-medium">Tokens</th>
                <th className="text-right p-3 font-medium">Errors</th>
                <th className="text-right p-3 font-medium">Avg Latency</th>
                <th className="text-right p-3 font-medium">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.byProvider).map(([id, p]) => {
                const successRate = p.requests > 0 ? ((p.requests - p.errors) / p.requests * 100).toFixed(1) : '100'
                return (
                  <tr key={id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="p-3 font-medium">{id}</td>
                    <td className="p-3 text-right">{p.requests.toLocaleString()}</td>
                    <td className="p-3 text-right">{p.tokens.toLocaleString()}</td>
                    <td className="p-3 text-right text-red-400">{p.errors}</td>
                    <td className="p-3 text-right">{p.avgLatency}ms</td>
                    <td className="p-3 text-right text-green-400">{successRate}%</td>
                  </tr>
                )
              })}
              {Object.keys(data.byProvider).length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">Belum ada data usage.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Usage Tips ── */}
      <div className="mt-4 p-3 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-gray-400">
        💡 Data usage di-reset tiap bulan. Tracking dimulai pas request pertama.
      </div>
    </div>
  )
}
