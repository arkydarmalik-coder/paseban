/**
 * POST /api/v1/chat/completions
 * ==============================
 * ECC Skill: api-design ← REST resource naming, status codes, error responses
 * ECC Skill: backend-patterns ← proxy pattern, middleware integration
 *
 * OpenAI-compatible chat completions endpoint.
 * Robin engine milih provider + key terbaik, trus proxy request ke sana.
 *
 * Request body: { model, messages, stream?, temperature?, max_tokens? }
 * Response: OpenAI ChatCompletion format
 *
 * Rate limit: 60 req/min per IP
 * Auth: Bearer token (Paseban API key)
 */

import type { ChatCompletionRequest, ChatCompletionResponse, Provider } from '@/lib/types'
import { kv } from '@/lib/kv'
import { RobinRouter } from '@/lib/robin'
import { jsonError, unauthorized, rateLimited } from '@/lib/api-errors'

export const runtime = 'edge'

// ── GET: Method not allowed (informational) ──
export async function GET() {
  return jsonError(
    'Use POST to send chat completion requests. GET /api/v1/models for model list.',
    'method_not_allowed',
    'METHOD_NOT_ALLOWED',
    405
  )
}

// ── POST: Main proxy ──
export async function POST(request: Request) {
  // 1. Auth check (Paseban API key)
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized()
  }

  // TODO: Verify Paseban API key from KV
  // For now, accept any valid Bearer token format
  const token = authHeader.slice(7).trim()
  if (!token) return unauthorized()

  // 2. Rate limit (per IP)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  const { allowed } = await kv.checkRateLimit(ip, 60, 60) // 60 req/min
  if (!allowed) return rateLimited()

  // 3. Parse request body
  let body: ChatCompletionRequest
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body.', 'invalid_request', 'INVALID_JSON', 400)
  }

  if (!body.model) {
    return jsonError('Missing required field: model.', 'invalid_request', 'MISSING_MODEL', 400)
  }
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonError('Missing required field: messages.', 'invalid_request', 'MISSING_MESSAGES', 400)
  }

  const userId = 'default' // TODO: map dari token ke userId
  const router = new RobinRouter(userId)

  let selectedProvider: Provider | null = null
  let selectedModelId = body.model // default to requested model

  // 4. Coba cari provider yang support model ini (built-in atau custom)
  // 4.1. Dari built-in providers (via static MODEL_ROUTES)
  const modelRoute = await kv.getModelRoute(body.model)
  if (modelRoute) {
    for (const routeProv of modelRoute.providers) {
      const provider = await kv.getProvider(userId, routeProv.providerId)
      if (!provider) continue

      const result = await router.selectKeyWithRetry(provider, routeProv.model, 3)
      if (result) {
        selectedProvider = result.provider
        selectedModelId = routeProv.model
        break
      }
    }
  }

  // 4.2. Dari custom providers (cek provider.models)
  if (!selectedProvider) {
    const userProviderIds = await kv.getUserProviders(userId)
    for (const pid of userProviderIds) {
      const provider = await kv.getProvider(userId, pid)
      if (!provider || !provider.custom) continue

      if (provider.models.includes(body.model)) {
        const result = await router.selectKeyWithRetry(provider, body.model, 3)
        if (result) {
          selectedProvider = result.provider
          break
        }
      }
    }
  }

  if (!selectedProvider) {
    return jsonError(
      `No available providers for model \"${body.model}\". All keys exhausted or rate limited.`,
      'provider_unavailable',
      'NO_AVAILABLE_PROVIDER',
      503
    )
  }

  // Re-fetch decision (kita punya selectedProvider tp gak punya decision detail lagi)
  // Simpler: select key sekali lagi
  const finalResult = await router.selectKey(selectedProvider, selectedModelId)
  if (!finalResult) {
    return jsonError('Provider became unavailable. Try again.', 'provider_unavailable', 'PROVIDER_UNAVAILABLE', 503)
  }

  const { decision } = finalResult
  const startTime = Date.now()

  try {
    // 5. Proxy request ke provider
    const providerUrl = `${decision.baseUrl}/chat/completions`
    const proxyHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${decision.apiKey}`,
    }

    // Build request body (OpenAI-compatible)
    const proxyBody: Record<string, unknown> = {
      model: decision.model,
      messages: body.messages,
    }
    if (body.stream) proxyBody.stream = true
    if (body.temperature !== undefined) proxyBody.temperature = body.temperature
    if (body.max_tokens !== undefined) proxyBody.max_tokens = body.max_tokens

    const proxyResponse = await fetch(providerUrl, {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify(proxyBody),
    })

    const latency = Date.now() - startTime
    const success = proxyResponse.ok

    // 5a. Handle streaming
    if (body.stream && proxyResponse.ok) {
      // Track usage asynchronously
      router.recordResult(decision.providerId, decision.keyId, true, 0, latency, 200).catch(() => {})

      return new Response(proxyResponse.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Paseban-Provider': decision.providerId,
          'X-Paseban-Strategy': decision.strategy,
        },
      })
    }

    // 5b. Handle non-streaming response
    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text().catch(() => 'Unknown provider error')
      await router.recordResult(decision.providerId, decision.keyId, false, 0, latency, proxyResponse.status)
      return jsonError(
        `Provider ${decision.providerId} (${decision.model}): ${errorText}`,
        'provider_error',
        `PROVIDER_${proxyResponse.status}`,
        proxyResponse.status
      )
    }

    const providerData = await proxyResponse.json()
    const totalTokens = providerData.usage?.total_tokens ?? 0

    // Track usage
    await router.recordResult(decision.providerId, decision.keyId, true, totalTokens, latency, 200)

    // Record usage log
    await kv.recordUsage(userId, {
      timestamp: new Date().toISOString(),
      providerId: decision.providerId,
      keyId: decision.keyId,
      model: decision.model,
      tokens: totalTokens,
      latency,
      success: true,
      statusCode: 200,
    })

    // 6. Return OpenAI-compatible response
    const response = {
      ...providerData,
      model: body.model, // return request model, not provider model
    }

    return Response.json(response, {
      headers: {
        'X-Paseban-Provider': decision.providerId,
        'X-Paseban-Strategy': decision.strategy,
        'X-Paseban-Key': decision.keyId.slice(0, 8) + '...',
      },
    })
  } catch (err) {
    const latency = Date.now() - startTime
    await router.recordResult(decision.providerId, decision.keyId, false, 0, latency, 500)

    return jsonError(
      `Proxy error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      'proxy_error',
      'PROXY_ERROR',
      502
    )
  }
}
