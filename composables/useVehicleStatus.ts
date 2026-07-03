/**
 * 車両現在地・DVR動画通知 Composable。
 *
 * ohishi-exp/browser-render-rust#14 のブラウザレス化 (VenusBridgeService) を
 * server/api/vehicle/* 経由で叩く。現在地のフィールド名は実機未検証の推測実装
 * (`locationResolved: false` の項目は raw を参照すること)。
 */

export interface VehicleState {
  raw: Record<string, unknown>
  vehicleCd: string | null
  vehicleName: string | null
  latitude: number | null
  longitude: number | null
  locationResolved: boolean
}

export interface DvrNotification {
  raw: Record<string, unknown>
  vehicleCd: string | null
  vehicleName: string | null
  serialNo: string | null
  fileName: string | null
  filePath: string | null
  eventType: string | null
  dvrDatetime: string | null
  driverName: string | null
}

export function useVehicleStatus() {
  const vehicles = ref<VehicleState[]>([])
  const notifications = ref<DvrNotification[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<Error | null>(null)

  async function fetchVehicleStatus(branchCd?: string) {
    status.value = 'pending'
    error.value = null
    try {
      const params = branchCd ? `?branch_cd=${encodeURIComponent(branchCd)}` : ''
      const response = await $fetch<{ vehicles: VehicleState[] }>(`/api/vehicle/status${params}`)
      vehicles.value = response.vehicles
      status.value = 'success'
    } catch (e) {
      error.value = e as Error
      status.value = 'error'
      console.error('Failed to fetch vehicle status:', e)
    }
  }

  async function fetchDvrNotifications() {
    status.value = 'pending'
    error.value = null
    try {
      const response = await $fetch<{ notifications: DvrNotification[] }>('/api/vehicle/dvr')
      notifications.value = response.notifications
      status.value = 'success'
    } catch (e) {
      error.value = e as Error
      status.value = 'error'
      console.error('Failed to fetch DVR notifications:', e)
    }
  }

  /** DVR動画ダウンロードURL (支援ID/車両CD/ファイル名は通知一覧の raw から得る想定)。 */
  function buildDvrDownloadUrl(supportId: string, vehicleCd: string, filename: string): string {
    const params = new URLSearchParams({ support_id: supportId, vehicle_cd: vehicleCd, filename })
    return `/api/vehicle/dvr-file?${params.toString()}`
  }

  return {
    vehicles,
    notifications,
    status: readonly(status),
    error: readonly(error),
    fetchVehicleStatus,
    fetchDvrNotifications,
    buildDvrDownloadUrl,
  }
}
