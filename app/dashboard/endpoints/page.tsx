'use client'

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/v1/chat/completions',
    desc: 'Chat completion proxy — OpenAI-compatible request & response',
    body: `{
  "model": "gpt-4o",
  "messages": [{ "role": "user", "content": "Hello!" }],
  "stream": false
}`,
    headers: { Authorization: 'Bearer paseban_...' },
  },
  {
    method: 'GET',
    path: '/api/v1/models',
    desc: 'List available models dari semua provider',
    params: '?provider=openai&search=gpt',
  },
  {
    method: 'GET',
    path: '/api/usage',
    desc: 'Usage statistics bulan ini',
    params: '?month=2026-06',
  },
]

export default function EndpointsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Endpoints</h1>
        <p className="text-sm text-gray-400 mt-1">API endpoints — semua OpenAI-compatible</p>
      </div>

      <div className="space-y-4">
        {ENDPOINTS.map(ep => (
          <div key={ep.path} className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)]">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                ep.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {ep.method}
              </span>
              <code className="text-sm font-mono text-gray-200">{ep.path}</code>
              {ep.params && <span className="text-xs text-gray-500 ml-auto">{ep.params}</span>}
            </div>

            {/* Description */}
            <div className="px-4 py-3 text-xs text-gray-400 border-b border-[var(--color-border)]">
              {ep.desc}
            </div>

            {/* Example */}
            {ep.body && (
              <div className="px-4 py-3">
                <div className="text-[11px] text-gray-500 mb-1">Request body:</div>
                <pre className="text-xs text-gray-300 font-mono bg-[var(--color-surface)] p-3 rounded-lg overflow-x-auto">{ep.body}</pre>
              </div>
            )}

            {/* Headers */}
            {ep.headers && (
              <div className="px-4 py-3 border-t border-[var(--color-border)]">
                <div className="text-[11px] text-gray-500 mb-1">Headers:</div>
                {Object.entries(ep.headers).map(([k, v]) => (
                  <code key={k} className="text-xs text-gray-400 font-mono block">{k}: {v}</code>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── curl Example ── */}
      <div className="mt-6 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
        <h2 className="text-sm font-medium mb-2">Quick Start</h2>
        <pre className="text-xs text-gray-300 font-mono bg-[var(--color-surface)] p-3 rounded-lg overflow-x-auto">
{`curl https://paseban.app/api/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
        </pre>
        <div className="mt-2 text-xs text-gray-500">
          Ganti <code className="text-[var(--color-paseban-400)]">YOUR_API_KEY</code> dengan Paseban API key dari dashboard.
        </div>
      </div>
    </div>
  )
}
