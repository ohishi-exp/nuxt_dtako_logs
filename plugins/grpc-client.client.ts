/**
 * gRPC-Web クライアントプラグイン
 *
 * Service Binding経由でrust-logi gRPC-Webサーバーに接続
 * ブラウザ → /api/grpc/* → Service Binding → Durable Object → CloudRun
 */

import { createClient, type Client } from "@connectrpc/connect"
import { createGrpcWebTransport } from "@connectrpc/connect-web"
import { DtakologsService } from "@yhonda-ohishi-pub-dev/logi-proto"

// DtakologsServiceの型を取得
type DtakologsClient = Client<typeof DtakologsService>

export default defineNuxtPlugin(() => {
  // Nuxtのserver route経由でgRPC-Webにアクセス
  const transport = createGrpcWebTransport({
    baseUrl: '/api/grpc',
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
