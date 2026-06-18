/**
 * GET /api/v1/models
 * ==================
 * ECC Skill: api-design ← resource listing, pagination, filtering
 *
 * Returns available models dari semua provider (built-in + custom).
 */

import { kv } from '@/lib/kv'
import { jsonError } from '@/lib/api-errors'

export const runtime = 'edge'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const providerId = url.searchParams.get('provider')

  const builtins = await kv.getBuiltinProviders()

  // Collect models from built-in providers
  let models: Array<{
    id: string
    object: string
    created: number
    owned_by: string
    context?: number
    cost?: { input: number; output: number }
  }> = []

  for (const bp of builtins) {
    if (providerId && bp.id !== providerId) continue

    for (const m of bp.defaultModels) {
      const route = await kv.getModelRoute(m)
      const routeInfo = route?.providers.find(p => p.providerId === bp.id)
      models.push({
        id: m,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: bp.id,
        context: routeInfo?.context,
        cost: routeInfo?.cost,
      })
    }
  }

  // Filter by search query
  const search = url.searchParams.get('search')
  if (search) {
    const q = search.toLowerCase()
    models = models.filter(m =>
      m.id.toLowerCase().includes(q) || m.owned_by.toLowerCase().includes(q)
    )
  }

  return Response.json({
    object: 'list',
    data: models,
  })
}
