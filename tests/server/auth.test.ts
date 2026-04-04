import { describe, it, expect } from 'vitest'
import { getParentDomainFromHost, resolveAuthAction } from '../../server/middleware/auth'

function makeOpts(overrides: Partial<Parameters<typeof resolveAuthAction>[0]> = {}) {
  return {
    pathname: '/',
    cookie: undefined,
    authWorkerUrl: 'https://alc-api.ippoan.org',
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
    expect(result.url).toContain('alc-api.ippoan.org/api/auth/lineworks/redirect')
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
    expect(result.url).toContain('auth.mtamaramu.com/login')
    expect(result.url).toContain('redirect_uri=')
  })
})
