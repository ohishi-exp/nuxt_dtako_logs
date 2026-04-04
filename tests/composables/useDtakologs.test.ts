import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest'
import {
  isLive, mockFetch, stubOk, stubReject,
  assertMock, expectMock, callApi,
  setupApi, teardownApi, jwtToken,
} from '../helpers/api-test-env'

// ---------------------------------------------------------------------------
// Mock useAuth (token provider) + $fetch
// ---------------------------------------------------------------------------
import { ref } from 'vue'
;(globalThis as any).useAuth = () => ({ token: ref(jwtToken) })
if (!isLive) {
  ;(globalThis as any).$fetch = mockFetch
}

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { useDtakologs } from '../../composables/useDtakologs'
import type { DtakologView } from '../../composables/useDtakologs'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const sampleDtakolog: DtakologView = {
  GPSDirection: 180,
  GPSLatitude: 35123456,
  GPSLongitude: 139123456,
  VehicleCD: 1,
  VehicleName: 'Truck-1',
  DriverName: 'Driver A',
  AddressDispC: 'Tokyo',
  DataDateTime: '26/04/04 10:00',
  AddressDispP: 'Shibuya',
  SubDriverCD: 0,
  AllState: 'Drive',
  ReciveTypeColorName: undefined,
  AllStateEx: undefined,
  State2: '',
  AllStateFontColor: undefined,
  Speed: 60,
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------
beforeAll(async () => {
  if (isLive) await setupApi()
})

beforeEach(async () => {
  await setupApi()
})

afterEach(() => {
  teardownApi()
})

// ---------------------------------------------------------------------------
// fetchCurrentListAll
// ---------------------------------------------------------------------------
describe('fetchCurrentListAll', () => {
  it('returns data on success', async () => {
    stubOk([sampleDtakolog])
    const { data, status, fetchCurrentListAll } = useDtakologs()

    await fetchCurrentListAll()

    if (isLive) {
      expect(Array.isArray(data.value)).toBe(true)
      return
    }
    expect(status.value).toBe('success')
    expect(data.value).toHaveLength(1)
    expect(data.value[0].VehicleCD).toBe(1)
    assertMock(() => {
      expect(mockFetch.mock.calls[0][0]).toBe('/api/proxy/dtako-logs/current')
    })
  })

  it('returns empty array on success with no data', async () => {
    stubOk([])
    const { data, fetchCurrentListAll } = useDtakologs()

    await fetchCurrentListAll()

    if (isLive) return
    expect(data.value).toHaveLength(0)
  })

  it('sets error state on failure', async () => {
    stubReject(new Error('Network error'))
    const { status, error, fetchCurrentListAll } = useDtakologs()

    await fetchCurrentListAll()

    if (isLive) return
    expect(status.value).toBe('error')
    expect(error.value).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// fetchByDate
// ---------------------------------------------------------------------------
describe('fetchByDate', () => {
  it('returns data for a specific date', async () => {
    stubOk([sampleDtakolog])
    const { fetchByDate } = useDtakologs()

    const result = await fetchByDate({ dateTime: '2026-04-04T10:00:00Z' })

    if (isLive) {
      expect(Array.isArray(result)).toBe(true)
      return
    }
    expect(result).toHaveLength(1)
    assertMock(() => {
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('/api/proxy/dtako-logs/by-date')
      expect(url).toContain('date_time=')
    })
  })

  it('passes vehicle_cd when provided', async () => {
    stubOk([sampleDtakolog])
    const { fetchByDate } = useDtakologs()

    await fetchByDate({ dateTime: '2026-04-04T10:00:00Z', vehicleCd: 42 })

    assertMock(() => {
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('vehicle_cd=42')
    })
  })

  it('returns empty array on error', async () => {
    stubReject(new Error('Server error'))
    const { fetchByDate } = useDtakologs()

    const result = await fetchByDate({ dateTime: '2026-04-04T10:00:00Z' })

    if (isLive) return
    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// fetchCurrentListSelect
// ---------------------------------------------------------------------------
describe('fetchCurrentListSelect', () => {
  it('returns filtered data', async () => {
    stubOk([sampleDtakolog])
    const { fetchCurrentListSelect } = useDtakologs()

    const result = await fetchCurrentListSelect({})

    if (isLive) {
      expect(Array.isArray(result)).toBe(true)
      return
    }
    expect(result).toHaveLength(1)
    assertMock(() => {
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('/api/proxy/dtako-logs/current/select')
    })
  })

  it('passes all filter parameters', async () => {
    stubOk([])
    const { fetchCurrentListSelect } = useDtakologs()

    await fetchCurrentListSelect({
      addressDispP: 'Tokyo',
      branchCd: 1,
      vehicleCds: [10, 20, 30],
    })

    assertMock(() => {
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('address_disp_p=Tokyo')
      expect(url).toContain('branch_cd=1')
      expect(url).toContain('vehicle_cds=10%2C20%2C30')
    })
  })

  it('returns empty array on error', async () => {
    stubReject(new Error('Server error'))
    const { fetchCurrentListSelect } = useDtakologs()

    const result = await fetchCurrentListSelect({})

    if (isLive) return
    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// fetchByDateRange
// ---------------------------------------------------------------------------
describe('fetchByDateRange', () => {
  it('returns data for date range', async () => {
    stubOk([sampleDtakolog, sampleDtakolog])
    const { fetchByDateRange } = useDtakologs()

    const result = await fetchByDateRange({
      startDateTime: '2026-04-01T00:00:00Z',
      endDateTime: '2026-04-04T23:59:59Z',
    })

    if (isLive) {
      expect(Array.isArray(result)).toBe(true)
      return
    }
    expect(result).toHaveLength(2)
    assertMock(() => {
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('/api/proxy/dtako-logs/by-date-range')
      expect(url).toContain('start_date_time=')
      expect(url).toContain('end_date_time=')
    })
  })

  it('passes vehicle_cd when provided', async () => {
    stubOk([])
    const { fetchByDateRange } = useDtakologs()

    await fetchByDateRange({
      startDateTime: '2026-04-01T00:00:00Z',
      endDateTime: '2026-04-04T23:59:59Z',
      vehicleCd: 42,
    })

    assertMock(() => {
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('vehicle_cd=42')
    })
  })

  it('returns empty array on error', async () => {
    stubReject(new Error('Server error'))
    const { fetchByDateRange } = useDtakologs()

    const result = await fetchByDateRange({
      startDateTime: '2026-04-01T00:00:00Z',
      endDateTime: '2026-04-04T23:59:59Z',
    })

    if (isLive) return
    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Auth header
// ---------------------------------------------------------------------------
describe('auth header', () => {
  it('includes Authorization header in requests', async () => {
    stubOk([])
    const { fetchCurrentListAll } = useDtakologs()

    await fetchCurrentListAll()

    assertMock(() => {
      const call = mockFetch.mock.calls[0]
      const opts = call[1] as { headers: Record<string, string> }
      expect(opts.headers.Authorization).toBe(`Bearer ${jwtToken}`)
    })
  })
})
