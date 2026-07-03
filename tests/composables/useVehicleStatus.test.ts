import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVehicleStatus } from '../../composables/useVehicleStatus'
import type { DvrNotification, VehicleState } from '../../composables/useVehicleStatus'

describe('useVehicleStatus', () => {
  beforeEach(() => {
    ;(globalThis as any).$fetch = vi.fn()
  })

  it('fetchVehicleStatus populates vehicles on success', async () => {
    const sample: VehicleState = {
      raw: { VehicleCD: '1001' },
      vehicleCd: '1001',
      vehicleName: 'Truck A',
      latitude: 35.6,
      longitude: 139.7,
      locationResolved: true,
    }
    ;(globalThis as any).$fetch = vi.fn().mockResolvedValue({ vehicles: [sample] })

    const { vehicles, status, fetchVehicleStatus } = useVehicleStatus()
    await fetchVehicleStatus()

    expect(vehicles.value).toEqual([sample])
    expect(status.value).toBe('success')
    expect((globalThis as any).$fetch).toHaveBeenCalledWith('/api/vehicle/status')
  })

  it('fetchVehicleStatus passes branch_cd as a query param', async () => {
    ;(globalThis as any).$fetch = vi.fn().mockResolvedValue({ vehicles: [] })
    const { fetchVehicleStatus } = useVehicleStatus()
    await fetchVehicleStatus('01')
    expect((globalThis as any).$fetch).toHaveBeenCalledWith('/api/vehicle/status?branch_cd=01')
  })

  it('fetchVehicleStatus sets error state on failure', async () => {
    ;(globalThis as any).$fetch = vi.fn().mockRejectedValue(new Error('boom'))
    const { status, error, fetchVehicleStatus } = useVehicleStatus()
    await fetchVehicleStatus()
    expect(status.value).toBe('error')
    expect(error.value).toBeInstanceOf(Error)
  })

  it('fetchDvrNotifications populates notifications on success', async () => {
    const sample: DvrNotification = {
      raw: {},
      vehicleCd: '1001',
      vehicleName: 'Truck A',
      serialNo: 'SN1',
      fileName: 'file1',
      filePath: '',
      eventType: 'alert',
      dvrDatetime: '2026-07-01T00:00:00',
      driverName: '山田太郎',
    }
    ;(globalThis as any).$fetch = vi.fn().mockResolvedValue({ notifications: [sample] })

    const { notifications, status, fetchDvrNotifications } = useVehicleStatus()
    await fetchDvrNotifications()

    expect(notifications.value).toEqual([sample])
    expect(status.value).toBe('success')
  })

  it('fetchDvrNotifications sets error state on failure', async () => {
    ;(globalThis as any).$fetch = vi.fn().mockRejectedValue(new Error('boom'))
    const { status, error, fetchDvrNotifications } = useVehicleStatus()
    await fetchDvrNotifications()
    expect(status.value).toBe('error')
    expect(error.value).toBeInstanceOf(Error)
  })

  it('buildDvrDownloadUrl builds a query string against the download route', () => {
    const { buildDvrDownloadUrl } = useVehicleStatus()
    expect(buildDvrDownloadUrl('1', '1318', 'file1')).toBe(
      '/api/vehicle/dvr-file?support_id=1&vehicle_cd=1318&filename=file1',
    )
  })
})
