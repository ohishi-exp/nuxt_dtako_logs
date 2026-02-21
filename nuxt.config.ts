// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@vite-pwa/nuxt', "@nuxt/ui", '@vueuse/nuxt',
    "nuxt-api-party"],
  devServer: {
    host: '0.0.0.0',
  },
  nitro: {
    preset: 'cloudflare-module',
    prerender: {
      autoSubfolderIndex: false
    }
  },

  runtimeConfig:{
    public:{
      googlemapKey:"",
      authWorkerUrl: process.env.NUXT_PUBLIC_AUTH_WORKER_URL || '',
    }
  },

  build: {
    transpile: ['@yhonda-ohishi-pub-dev/logi-proto', '@yhonda-ohishi-pub-dev/auth-client', '@bufbuild/protobuf', '@connectrpc/connect', '@connectrpc/connect-web'],
  },

  vite: {
    server: {
      hmr: {
        protocol: "wss",
        clientPort: 443,
        // path: "hmr/",
      },
    },
  },
  hooks: {
    ///https://zenn.dev/coedo/scraps/b0d1ae5de09f63
    //https://zenn.dev/wwwave/articles/cc9d078fbf94fa
    'vite:extendConfig'(viteInlineConfig: any, env: any) {
      viteInlineConfig.server = {
        ...viteInlineConfig.server,
        hmr: { // ここに書く
          clientPort: 443,
          protocol: 'wss',
          path: 'hmr/',
          // port: 443,
        },
      }
    },
  },
  
  apiParty: {
    endpoints: {
      jsonPlaceholder: {
        url: `${process.env.NUXT_HONO_LOGI_URL}`,
        schema: `${process.env.NUXT_HONO_LOGI_SCHEMA}`,
        // headers:{
        //   "CF-Access-Client-Id": `${process.env.NUXT_CF_ID}`,
        //   "CF-Access-Client-Secret": `${process.env.NUXT_CF_SECRET}`
        // },
        // cookies:true
      }
    },
    // client:true
  },

  app: {
    head: {
      meta: [
        { name: "theme-color", content: "#326CB3" },
      ],
      link: [
        { rel: 'icon', href: `/favicon.ico`, sizes: "48x48" },
        { rel: 'apple-touch-icon', href: `/apple-touch-icon-180x180.png` },
      ],
    },
  },
  pwa: {
    client: { installPrompt: true },
    registerType: "autoUpdate", // 多分なくてもよい
    manifest: {
      name: '車検証送信アプリ',
      description: "アプリ説明",
      theme_color: "#326CB3", // テーマカラー
      lang: "ja",
      short_name: "車検証アプリ",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      share_target: {
        "action": "/api/recieve",
        "method": "POST",
        "enctype": "multipart/form-data",
        "params": {
          "files": [
            {
              "name": "records",
              "accept": ["text/csv", ".csv"]
            },
            {
              "name": "json",
              "accept": ["application/json", ".json", "text/json"]
            },
            {
              "name": "pdf",
              "accept": ["application/pdf", ".pdf", "text/pdf",]
            },
          ]
        }
      },
      file_handlers: [
        {
          "action": "/",
          "accept": {
            "application/json": [".json"],
            "text/csv": [".csv"],
            "application/pdf": [".pdf"],
          },
          // "launch_type": "single-client"
        }
      ],
      icons: [
        {
          "src": "pwa-64x64.png",
          "sizes": "64x64",
          "type": "image/png"
        },
        {
          "src": "pwa-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "pwa-512x512.png",
          "sizes": "512x512",
          "type": "image/png"
        },
        {
          "src": "maskable-icon-512x512.png",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "maskable"
        }
      ],
    },
    workbox: { // なんか必要
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,ico,png,svg}'], // htmlはSSRなのでprecache対象外
    },
    devOptions: { // テスト用
      enabled: true,
      type: "module"
    },
  }


})
