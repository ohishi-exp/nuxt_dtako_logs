/**
 * Integration test: dtakologs REST API
 *
 * API_BASE_URL 環境変数が設定されている場合のみ実行。
 * docker-compose.test.yml で rust-alc-api + PostgreSQL を起動し、
 * seed データに対して全エンドポイントを検証する。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { createHmac } from 'node:crypto'
import { TEST_TENANT_ID, TEST_USER_ID, JWT_SECRET } from '../helpers/api-test-data'

const API_BASE = process.env.API_BASE_URL
if (!API_BASE) {
  describe.skip('dtakologs API (no API_BASE_URL)', () => {
    it('skipped', () => {})
  })
} else {

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
  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const unsigned = `${b64(header)}.${b64(payload)}`
  const sig = createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url')
  return `${unsigned}.${sig}`
}

const jwt = makeJwt()

async function api(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${jwt}`,
    'X-Tenant-ID': TEST_TENANT_ID,
    ...opts.headers as Record<string, string>,
  }
  return fetch(`${API_BASE}/api/${path}`, { ...opts, headers })
}

async function waitForApi(maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${API_BASE}/api/health`)
      if (res.ok) return
    } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error(`API not ready after ${maxRetries}s`)
}

describe('dtakologs API', () => {
  beforeAll(async () => {
    await waitForApi()
  }, 60000)

  describe('GET /dtako-logs/current', () => {
    it('returns latest record per vehicle', async () => {
      const res = await api('dtako-logs/current')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      // Seed has 2 vehicles (vehicle_cd 1 and 2), current = latest per vehicle
      expect(data.length).toBe(2)
      // Vehicle 1 latest is 10:05, Vehicle 2 latest is 10:00
      const v1 = data.find((d: any) => d.VehicleCD === 1)
      const v2 = data.find((d: any) => d.VehicleCD === 2)
      expect(v1).toBeDefined()
      expect(v2).toBeDefined()
      expect(v1.DataDateTime).toBe('2026-04-04T10:05:00+09:00')
      expect(v1.VehicleName).toBe('Truck-1')
      expect(v2.VehicleName).toBe('Truck-2')
    })

    it('returns PascalCase JSON keys', async () => {
      const res = await api('dtako-logs/current')
      const data = await res.json()
      const item = data[0]
      expect(item).toHaveProperty('GPSDirection')
      expect(item).toHaveProperty('GPSLatitude')
      expect(item).toHaveProperty('VehicleCD')
      expect(item).toHaveProperty('AllState')
      expect(item).toHaveProperty('Speed')
    })

    it('Speed is empty string when 0', async () => {
      const res = await api('dtako-logs/current')
      const data = await res.json()
      const resting = data.find((d: any) => d.AllState === 'Rest')
      if (resting) {
        expect(resting.Speed).toBe('')
      }
    })
  })

  describe('GET /dtako-logs/by-date', () => {
    it('returns records for specific date_time', async () => {
      const res = await api('dtako-logs/by-date?date_time=2026-04-04T10:00:00%2B09:00')
      expect(res.status).toBe(200)
      const data = await res.json()
      // Seed has 2 records at 2026-04-04T10:00:00+09:00 (vehicle 1 and 2)
      expect(data.length).toBe(2)
    })

    it('filters by vehicle_cd', async () => {
      const res = await api('dtako-logs/by-date?date_time=2026-04-04T10:00:00%2B09:00&vehicle_cd=1')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.length).toBe(1)
      expect(data[0].VehicleCD).toBe(1)
    })

    it('returns empty for nonexistent date', async () => {
      const res = await api('dtako-logs/by-date?date_time=99/99/99%2000:00')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.length).toBe(0)
    })
  })

  describe('GET /dtako-logs/current/select', () => {
    it('filters by address_disp_p', async () => {
      const res = await api('dtako-logs/current/select?address_disp_p=Shibuya')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.every((d: any) => d.AddressDispP === 'Shibuya')).toBe(true)
    })

    it('filters by vehicle_cds', async () => {
      const res = await api('dtako-logs/current/select?vehicle_cds=2')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.length).toBe(1)
      expect(data[0].VehicleCD).toBe(2)
    })

    it('returns all with no filters', async () => {
      const res = await api('dtako-logs/current/select')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.length).toBe(2)
    })
  })

  describe('GET /dtako-logs/by-date-range', () => {
    it('returns records in date range', async () => {
      // ISO8601 RFC3339 (JST) — backend が data_date_time::timestamptz cast で比較するため、
      // PostgreSQL が parse 可能な形式で送る (rust-alc-api PR #97 以降)。
      const res = await api('dtako-logs/by-date-range?start_date_time=2026-04-03T00:00:00%2B09:00&end_date_time=2026-04-04T23:59:59%2B09:00')
      expect(res.status).toBe(200)
      const data = await res.json()
      // All 4 seed records are in this range
      expect(data.length).toBe(4)
    })

    it('filters by vehicle_cd', async () => {
      const res = await api('dtako-logs/by-date-range?start_date_time=2026-04-03T00:00:00%2B09:00&end_date_time=2026-04-04T23:59:59%2B09:00&vehicle_cd=2')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.length).toBe(1)
      expect(data[0].VehicleCD).toBe(2)
    })

    it('returns empty for out-of-range dates', async () => {
      const res = await api('dtako-logs/by-date-range?start_date_time=2025-01-01T00:00:00%2B09:00&end_date_time=2025-01-02T23:59:59%2B09:00')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.length).toBe(0)
    })
  })

  describe('auth', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API_BASE}/api/dtako-logs/current`)
      expect(res.status).toBe(401)
    })
  })
})

}
