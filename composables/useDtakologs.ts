/**
 * Dtakologs Composable
 *
 * REST API経由でdtakologsを取得
 */

// フロントエンド用の型定義（既存のスキーマと互換）
export interface DtakologView {
  GPSDirection: number
  GPSLatitude: number
  GPSLongitude: number
  VehicleCD: number
  VehicleName: string
  DriverName: string | undefined
  AddressDispC: string | undefined
  DataDateTime: string
  AddressDispP: string | undefined
  SubDriverCD: number
  AllState: string
  ReciveTypeColorName: string | undefined
  AllStateEx: string | undefined
  State2: string
  AllStateFontColor: string | undefined
  Speed: number | string
}

export function useDtakologs() {
  const { token } = useAuth()
  const data = ref<DtakologView[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<Error | null>(null)

  function authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`
    }
    return headers
  }

  /**
   * 車両毎の最新運行ログを取得
   */
  async function fetchCurrentListAll() {
    status.value = 'pending'
    error.value = null

    try {
      const response = await $fetch<DtakologView[]>('/api/proxy/dtako-logs/current', {
        headers: authHeaders(),
      })
      data.value = response
      status.value = 'success'
    } catch (e) {
      error.value = e as Error
      status.value = 'error'
      console.error('Failed to fetch currentListAll:', e)
    }
  }

  /**
   * 日付指定で運行ログを取得
   */
  async function fetchByDate(request: { dateTime: string; vehicleCd?: number }) {
    status.value = 'pending'
    error.value = null

    try {
      const params = new URLSearchParams({ date_time: request.dateTime })
      if (request.vehicleCd !== undefined) {
        params.set('vehicle_cd', String(request.vehicleCd))
      }

      const response = await $fetch<DtakologView[]>(
        `/api/proxy/dtako-logs/by-date?${params}`,
        { headers: authHeaders() },
      )
      return response
    } catch (e) {
      error.value = e as Error
      status.value = 'error'
      console.error('Failed to fetch by date:', e)
      return []
    }
  }

  /**
   * 指定条件で最新運行ログを取得
   */
  async function fetchCurrentListSelect(request: {
    addressDispP?: string
    branchCd?: number
    vehicleCds?: number[]
  }) {
    status.value = 'pending'
    error.value = null

    try {
      const params = new URLSearchParams()
      if (request.addressDispP) params.set('address_disp_p', request.addressDispP)
      if (request.branchCd !== undefined) params.set('branch_cd', String(request.branchCd))
      if (request.vehicleCds?.length) params.set('vehicle_cds', request.vehicleCds.join(','))

      const response = await $fetch<DtakologView[]>(
        `/api/proxy/dtako-logs/current/select?${params}`,
        { headers: authHeaders() },
      )
      return response
    } catch (e) {
      error.value = e as Error
      status.value = 'error'
      console.error('Failed to fetch currentListSelect:', e)
      return []
    }
  }

  /**
   * 日付範囲指定で運行ログを取得
   */
  async function fetchByDateRange(request: {
    startDateTime: string  // ISO8601形式
    endDateTime: string    // ISO8601形式
    vehicleCd?: number
  }) {
    status.value = 'pending'
    error.value = null

    try {
      const params = new URLSearchParams({
        start_date_time: request.startDateTime,
        end_date_time: request.endDateTime,
      })
      if (request.vehicleCd !== undefined) {
        params.set('vehicle_cd', String(request.vehicleCd))
      }

      const response = await $fetch<DtakologView[]>(
        `/api/proxy/dtako-logs/by-date-range?${params}`,
        { headers: authHeaders() },
      )
      return response
    } catch (e) {
      error.value = e as Error
      status.value = 'error'
      console.error('Failed to fetch by date range:', e)
      return []
    }
  }

  return {
    data,
    status: readonly(status),
    error: readonly(error),
    fetchCurrentListAll,
    fetchByDate,
    fetchByDateRange,
    fetchCurrentListSelect,
  }
}
