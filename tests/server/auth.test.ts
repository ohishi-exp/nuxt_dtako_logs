import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getParentDomainFromHost, resolveAuthAction } from '../../server/middleware/auth'

// --- Pure function tests ---

function makeOpts(overrides: Partial<Parameters<typeof resolveAuthAction>[0]> = {}) {
  return {
    pathname: '/',
    cookie: undefined,
    authWorkerUrl: 'https://auth.ippoan.org',
    hasLwCallback: false,
    hasLogout: false,
    lwParam: null,
    storedLwDomain: undefined,
    origin: 'https://ohishi2.mtamaramu.com',
    hostname: 'ohishi2.mtamaramu.com',
    ...overrides,
  }
}

describe('getParentDomainFromHost', () => {
  it('returns parent domain for subdomain', () => {
    expect(getParentDomainFromHost('ohishi2.mtamaramu.com')).toBe('.mtamaramu.com')
  })

  it('returns undefined for simple hostname', () => {
    expect(getParentDomainFromHost('localhost')).toBeUndefined()
  })

  it('returns undefined for two-part domain', () => {
    expect(getParentDomainFromHost('example.com')).toBeUndefined()
  })
})

describe('resolveAuthAction', () => {
  it('skips /api/ paths', () => {
    expect(resolveAuthAction(makeOpts({ pathname: '/api/proxy/test' }))).toEqual({ action: 'skip' })
  })

  it('skips if cookie exists', () => {
    expect(resolveAuthAction(makeOpts({ cookie: 'valid-token' }))).toEqual({ action: 'skip' })
  })

  it('skips if authWorkerUrl is empty', () => {
    expect(resolveAuthAction(makeOpts({ authWorkerUrl: '' }))).toEqual({ action: 'skip' })
  })

  it('skips if lw_callback present', () => {
    expect(resolveAuthAction(makeOpts({ hasLwCallback: true }))).toEqual({ action: 'skip' })
  })

  it('skips if logout present', () => {
    expect(resolveAuthAction(makeOpts({ hasLogout: true }))).toEqual({ action: 'skip' })
  })

  it('redirects to LINE WORKS with ?lw=domain', () => {
    const result = resolveAuthAction(makeOpts({ lwParam: 'ohishi' }))
    expect(result.action).toBe('redirect')
    if (result.action !== 'redirect') return
    expect(result.url).toContain('auth.ippoan.org/api/auth/lineworks/redirect')
    expect(result.url).toContain('domain=ohishi')
    expect(result.setCookie?.name).toBe('lw_domain')
    expect(result.setCookie?.value).toBe('ohishi')
    expect(result.setCookie?.domain).toBe('.mtamaramu.com')
  })

  it('lw param on localhost has undefined domain', () => {
    const result = resolveAuthAction(makeOpts({ lwParam: 'test', hostname: 'localhost' }))
    expect(result.action).toBe('redirect')
    if (result.action !== 'redirect') return
    expect(result.setCookie?.domain).toBeUndefined()
  })

  it('redirects using stored lw_domain cookie', () => {
    const result = resolveAuthAction(makeOpts({ storedLwDomain: 'stored-domain' }))
    expect(result.action).toBe('redirect')
    if (result.action !== 'redirect') return
    expect(result.url).toContain('domain=stored-domain')
    expect(result.setCookie).toBeUndefined()
  })

  it('redirects to default login page', () => {
    const result = resolveAuthAction(makeOpts())
    expect(result.action).toBe('redirect')
    if (result.action !== 'redirect') return
    expect(result.url).toContain('auth.ippoan.org/login')
    expect(result.url).toContain('redirect_uri=')
  })
})

// --- Handler wrapper tests (defineEventHandler) ---

let lastRedirect: string | null = null
let lastCookieSet: { name: string; value: string } | null = null

vi.stubGlobal('getRequestURL', (event: any) =>
  new URL(event.__testUrl || 'https://ohishi2.mtamaramu.com/'))
vi.stubGlobal('getCookie', (event: any, name: string) => event.__testCookies?.[name])
vi.stubGlobal('setCookie', (_e: any, name: string, value: string) => {
  lastCookieSet = { name, value }
})
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { authWorkerUrl: 'https://auth.ippoan.org' },
}))
vi.stubGlobal('sendRedirect', (_e: any, url: string) => {
  lastRedirect = url
  return url
})

import handler from '../../server/middleware/auth'

function makeEvent(opts: { url?: string; cookies?: Record<string, string> }) {
  return {
    __testUrl: opts.url || 'https://ohishi2.mtamaramu.com/',
    __testCookies: opts.cookies || {},
  } as any
}

describe('auth handler wrapper', () => {
  beforeEach(() => {
    lastRedirect = null
    lastCookieSet = null
    ;(globalThis as any).getRequestURL = (event: any) =>
      new URL(event.__testUrl || 'https://ohishi2.mtamaramu.com/')
    ;(globalThis as any).getCookie = (event: any, name: string) => event.__testCookies?.[name]
    ;(globalThis as any).setCookie = (_e: any, name: string, value: string) => {
      lastCookieSet = { name, value }
    }
    ;(globalThis as any).useRuntimeConfig = () => ({
      public: { authWorkerUrl: 'https://auth.ippoan.org' },
    })
    ;(globalThis as any).sendRedirect = (_e: any, url: string) => {
      lastRedirect = url
      return url
    }
  })

  it('handler skips when cookie exists', () => {
    const result = handler(makeEvent({ cookies: { logi_auth_token: 'token' } }))
    expect(result).toBeUndefined()
    expect(lastRedirect).toBeNull()
  })

  it('handler redirects to default login', () => {
    handler(makeEvent({}))
    expect(lastRedirect).toContain('auth.ippoan.org/login')
  })

  it('handler redirects with lw param and sets cookie', () => {
    handler(makeEvent({ url: 'https://ohishi2.mtamaramu.com/?lw=ohishi' }))
    expect(lastRedirect).toContain('lineworks/redirect')
    expect(lastCookieSet?.name).toBe('lw_domain')
    expect(lastCookieSet?.value).toBe('ohishi')
  })

  it('handler redirects with stored lw_domain (no setCookie)', () => {
    handler(makeEvent({ cookies: { lw_domain: 'saved' } }))
    expect(lastRedirect).toContain('domain=saved')
    expect(lastCookieSet).toBeNull()
  })
})
