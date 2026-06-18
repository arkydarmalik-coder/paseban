/**
 * GET /api/usage
 * ==============
 * ECC Skill: api-design ← query params for filtering, pagination
 *
 * Returns usage records for current month or specified month.
 */

import { kv } from '@/lib/kv'
import { jsonError } from '@/lib/api-errors'

export const runtime = 'edge'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const month = url.searchParams.get('month')
    ?? new Date().toISOString().slice(0, 7) // current month: "2026-06"
  const userId = 'default'

  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return jsonError('Invalid month format. Use YYYY-MM.', 'invalid_request', 'INVALID_MONTH', 400)
  }

  const records = await kv.getUsage(userId, month)

  // Aggregate by provider
  const byProvider: Record<string, { requests: number; tokens: number; errors: number; avgLatency: number }> = {}
  let totalRequests = 0
  let totalTokens = 0
  let totalErrors = 0
  let totalLatencyMs = 0

  for (const r of records) {
    totalRequests++
    totalTokens += r.tokens
    totalLatencyMs += r.latency
    if (!r.success) totalErrors++

    if (!byProvider[r.providerId]) {
      byProvider[r.providerId] = { requests: 0, tokens: 0, errors: 0, avgLatency: 0 }
    }
    byProvider[r.providerId].requests++
    byProvider[r.providerId].tokens += r.tokens
    if (!r.success) byProvider[r.providerId].errors++
    byProvider[r.providerId].avgLatency = Math.round(
      (byProvider[r.providerId].avgLatency * (byProvider[r.providerId].requests - 1) + r.latency) /
      byProvider[r.providerId].requests
    )
  }

  return Response.json({
    month,
    summary: {
      totalRequests,
      totalTokens,
      totalErrors,
      avgLatency: totalRequests > 0 ? Math.round(totalLatencyMs / totalRequests) : 0,
      uptime: totalRequests > 0 ? Math.round((1 - totalErrors / totalRequests) * 10000) / 100 + '%' : '100%',
    },
    byProvider,
  })
}
