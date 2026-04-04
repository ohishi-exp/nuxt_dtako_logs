/**
 * REST API プロキシ
 * /api/proxy/* → rust-alc-api の /api/* に転送
 */
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || ''
  const config = useRuntimeConfig(event)
  const backendUrl = config.alcApiUrl || 'https://rust-alc-api-747065218280.asia-northeast1.run.app'

  const targetUrl = `${backendUrl}/api/${path}`

  // リクエストヘッダーを転送
  const headers: Record<string, string> = {}
  const contentType = getHeader(event, 'content-type')
  if (contentType) headers['Content-Type'] = contentType

  // JWT を Authorization ヘッダーで転送
  const authHeader = getHeader(event, 'authorization')
  if (authHeader) {
    headers['Authorization'] = authHeader
    // tenant_id をフォールバック用に X-Tenant-ID にも設定
    const token = authHeader.replace('Bearer ', '')
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const tenantId = payload.tenant_id || payload.org
      if (tenantId) headers['X-Tenant-ID'] = tenantId
    } catch {
      // JWT parse failure — skip
    }
  }
  // x-auth-token ヘッダー (gRPC 時代の互換)
  const authToken = getHeader(event, 'x-auth-token')
  if (authToken && !authHeader) {
    headers['Authorization'] = `Bearer ${authToken}`
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      const tenantId = payload.tenant_id || payload.org
      if (tenantId) headers['X-Tenant-ID'] = tenantId
    } catch {
      // JWT parse failure — skip
    }
  }
  // 明示的な X-Tenant-ID ヘッダーがあればそちらを優先
  const tenantHeader = getHeader(event, 'x-tenant-id')
  if (tenantHeader) headers['X-Tenant-ID'] = tenantHeader

  const method = event.method
  const query = getQuery(event)

  // クエリパラメータを URL に追加
  const url = new URL(targetUrl)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  }

  // POST/PUT/PATCH の場合は body を転送
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const body = await readBody(event)
      if (body) {
        fetchOptions.body = JSON.stringify(body)
        headers['Content-Type'] = 'application/json'
      }
    } catch {
      // body なし
    }
  }

  const response = await fetch(url.toString(), fetchOptions)

  // レスポンスヘッダーを転送
  const responseContentType = response.headers.get('content-type')
  if (responseContentType) {
    setHeader(event, 'content-type', responseContentType)
  }

  setResponseStatus(event, response.status)

  // JSON レスポンス
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
})
