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

  // リクエストボディを取得
  const body = method === 'POST' ? await readRawBody(event) : undefined

  // Service Binding経由でリクエスト
  const response = await grpcProxyService.fetch(targetUrl, {
    method,
    headers,
    body,
  })

  // レスポンスヘッダーを設定
  const responseHeaders = Object.fromEntries(response.headers.entries())
  for (const [key, value] of Object.entries(responseHeaders)) {
    setHeader(event, key, value)
  }

  // レスポンスボディを返す
  return response.body
})
