/**
 * Paseban Proxy — Error Response Helpers
 * ECC Skill: api-design ← proper error response format
 */

export interface ErrorResponse {
  error: {
    message: string
    type: string
    code: string
    status: number
  }
}

export function jsonError(message: string, type: string, code: string, status: number): Response {
  const body: ErrorResponse = {
    error: { message, type, code, status }
  }
  return Response.json(body, { status })
}

export function methodNotAllowed(allowed: string[]): Response {
  return jsonError(
    `Method not allowed. Use ${allowed.join(' or ')}`,
    'method_not_allowed',
    'METHOD_NOT_ALLOWED',
    405
  )
}

export function unauthorized(): Response {
  return jsonError(
    'Missing or invalid API key. Provide via Authorization header.',
    'unauthorized',
    'UNAUTHORIZED',
    401
  )
}

export function rateLimited(retryAfter: number = 10): Response {
  return new Response(
    JSON.stringify({
      error: {
        message: 'Rate limit exceeded. Try again later.',
        type: 'rate_limited',
        code: 'RATE_LIMITED',
        status: 429
      }
    }),
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '0',
      }
    }
  )
}

export function providerError(providerId: string, statusCode: number, message: string): Response {
  return jsonError(
    `Provider ${providerId} returned error: ${message}`,
    'provider_error',
    `PROVIDER_${statusCode}`,
    statusCode
  )
}
