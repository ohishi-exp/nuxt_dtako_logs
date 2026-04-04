// Nitro server auto-imports (must be before handler imports)
;(globalThis as any).defineEventHandler = (fn: Function) => fn
;(globalThis as any).getRouterParam = () => ''
;(globalThis as any).getHeader = () => undefined
;(globalThis as any).getQuery = () => ({})
;(globalThis as any).readBody = async () => undefined
;(globalThis as any).setHeader = () => {}
;(globalThis as any).setResponseStatus = () => {}
;(globalThis as any).useRuntimeConfig = () => ({ public: {} })
;(globalThis as any).getCookie = () => undefined
;(globalThis as any).setCookie = () => {}
;(globalThis as any).getRequestURL = () => new URL('https://localhost/')
;(globalThis as any).sendRedirect = () => undefined

// Vue composable auto-imports
import { ref, readonly } from 'vue'
;(globalThis as any).ref = ref
;(globalThis as any).readonly = readonly

// Nuxt composable auto-imports
;(globalThis as any).useAuth = () => ({ token: ref('mock-token') })
;(globalThis as any).$fetch = async () => ({})
