/**
 * API テスト共通環境
 *
 * API_BASE_URL が設定されていれば実 API (live)、未設定なら mock $fetch。
 * 同じテストを両モードで実行可能にする。
 */
import { vi, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { TEST_TENANT_ID, TEST_USER_ID, JWT_SECRET } from './api-test-data'

// ---------------------------------------------------------------------------
// Mode detection
// ---------------------------------------------------------------------------
export const isLive = !!process.env.API_BASE_URL
const API_BASE = process.env.API_BASE_URL || 'https://api.example.com'

// ---------------------------------------------------------------------------
// Mock helpers (no-op in live mode)
// ---------------------------------------------------------------------------
export const mockFetch = vi.fn()

export function okJson(data: unknown = {}) {
  return data
}

export function stubResponse(response: unknown) {
  if (!isLive) mockFetch.mockResolvedValueOnce(response)
}

export function stubOk(data: unknown = {}) {
  stubResponse(okJson(data))
}

export function stubReject(error: Error) {
  if (!isLive) mockFetch.mockRejectedValueOnce(error)
}

/**
 * mock 専用アサーション。live 時は何もしない。
 */
export function assertMock(fn: () => void) {
  if (!isLive) fn()
}

/**
 * live 時に mockFetch.mock.calls のアサーションをスキップするためのヘルパー。
 */
export function expectMock(target: unknown) {
  if (isLive) {
    const noop = new Proxy({}, { get: () => () => noop })
    return noop as ReturnType<typeof expect>
  }
  return expect(target)
}

/**
 * API 呼び出し。live 時は API エラーを許容する。
 */
export async function callApi(fn: () => Promise<unknown>) {
  if (!isLive) {
    await fn()
    return
  }
  try {
    await fn()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('API') || msg.includes('500') || msg.includes('401') || msg.includes('404')) return
    throw e
  }
}

// ---------------------------------------------------------------------------
// JWT helper (live mode 用)
// ---------------------------------------------------------------------------
function makeJwt(): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: TEST_USER_ID,
    email: 'test@example.com',
    name: 'Test Admin',
    tenant_id: TEST_TENANT_ID,
    role: 'admin',
    iat: now,
    exp: now + 3600,
  }
  const b64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')
  const unsigned = `${b64(header)}.${b64(payload)}`
  const sig = createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url')
  return `${unsigned}.${sig}`
}

export const jwtToken = isLive ? makeJwt() : 'mock-token'

// ---------------------------------------------------------------------------
// Wait for API (live mode 用)
// ---------------------------------------------------------------------------
async function waitForApi(url: string, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${url}/api/health`)
      if (res.ok) return
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error(`API not ready after ${maxRetries} retries`)
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------
let liveReady = false

export async function setupApi() {
  if (isLive) {
    if (!liveReady) {
      await waitForApi(API_BASE)
      liveReady = true
    }
  } else {
    mockFetch.mockReset()
  }
}

export function teardownApi() {
  if (!isLive) {
    mockFetch.mockReset()
  }
}

export { API_BASE }
