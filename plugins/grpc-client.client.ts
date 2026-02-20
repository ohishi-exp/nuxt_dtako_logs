/**
 * gRPC-Web クライアントプラグイン
 *
 * Service Binding経由でrust-logi gRPC-Webサーバーに接続
 * ブラウザ → /api/grpc/* → Service Binding → Durable Object → CloudRun
 */

import { createClient, type Client, type Interceptor } from "@connectrpc/connect"
import { createGrpcWebTransport } from "@connectrpc/connect-web"
import { DtakologsService } from "@yhonda-ohishi-pub-dev/logi-proto"

// DtakologsServiceの型を取得
type DtakologsClient = Client<typeof DtakologsService>

export default defineNuxtPlugin(() => {
  const { token } = useAuth()

  // JWT を x-auth-token ヘッダーとして付与
  const authInterceptor: Interceptor = (next) => async (req) => {
    if (token.value) {
      req.header.set('x-auth-token', token.value)
    }
    return next(req)
  }

  // Nuxtのserver route経由でgRPC-Webにアクセス
  const transport = createGrpcWebTransport({
    baseUrl: '/api/grpc',
    interceptors: [authInterceptor],
  })

  const dtakologsClient: DtakologsClient = createClient(DtakologsService, transport)

  return {
    provide: {
      grpc: {
        dtakologs: dtakologsClient,
      },
    },
  }
})

// 型定義のエクスポート
declare module '#app' {
  interface NuxtApp {
    $grpc: {
      dtakologs: DtakologsClient
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $grpc: {
      dtakologs: DtakologsClient
    }
  }
}
