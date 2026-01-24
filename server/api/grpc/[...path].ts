/**
 * gRPC-Web プロキシ API Route
 *
 * Service Binding経由でcf-grpc-proxyのDurable Objectにリクエストを転送
 * ブラウザ → Nuxt API → Service Binding → Durable Object → CloudRun
 */

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || ''
  const method = event.method

  // Cloudflare環境のバインディングを取得
  const { cloudflare } = event.context
  if (!cloudflare?.env?.GRPC_PROXY_SERVICE) {
    throw createError({
      statusCode: 500,
      message: 'GRPC_PROXY_SERVICE binding not available',
    })
  }

  const grpcProxyService = cloudflare.env.GRPC_PROXY_SERVICE

  // gRPC-Webリクエストを転送
  const targetUrl = `https://cf-grpc-proxy.workers.dev/${path}`

  const headers = new Headers()
  // 必要なヘッダーをコピー
  const contentType = getHeader(event, 'content-type')
  if (contentType) {
    headers.set('Content-Type', contentType)
  }
  const grpcWeb = getHeader(event, 'x-grpc-web')
  if (grpcWeb) {
    headers.set('X-Grpc-Web', grpcWeb)
  }
  const connectProtocol = getHeader(event, 'connect-protocol-version')
  if (connectProtocol) {
    headers.set('Connect-Protocol-Version', connectProtocol)
  }

  // リクエストボディを取得（バイナリとして読み込む）
  const body = method === 'POST' ? await readRawBody(event, false) : undefined

  // デバッグログ
  console.log('[grpc-proxy] path:', path)
  console.log('[grpc-proxy] method:', method)
  console.log('[grpc-proxy] content-type:', contentType)
  console.log('[grpc-proxy] connect-protocol:', connectProtocol)
  console.log('[grpc-proxy] body type:', typeof body)
  console.log('[grpc-proxy] body is Buffer:', body instanceof Buffer)
  console.log('[grpc-proxy] body is ArrayBuffer:', body instanceof ArrayBuffer)
  console.log('[grpc-proxy] body is Uint8Array:', body instanceof Uint8Array)
  if (body) {
    const bodyBytes = body instanceof Buffer ? body : new Uint8Array(body as ArrayBuffer)
    console.log('[grpc-proxy] body length:', bodyBytes.length)
    console.log('[grpc-proxy] body first 20 bytes:', Array.from(bodyBytes.slice(0, 20)))
  }

  // Service Binding経由でリクエスト
  const response = await grpcProxyService.fetch(targetUrl, {
    method,
    headers,
    body,
  })

  // レスポンスのデバッグログ
  console.log('[grpc-proxy] response status:', response.status)
  console.log('[grpc-proxy] response headers:', Object.fromEntries(response.headers.entries()))

  // レスポンスヘッダーを設定
  const responseHeaders = Object.fromEntries(response.headers.entries())
  for (const [key, value] of Object.entries(responseHeaders)) {
    setHeader(event, key, value)
  }

  // レスポンスボディを返す
  return response.body
})
