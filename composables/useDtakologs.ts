/**
 * Dtakologs Composable
 *
 * gRPC-Web経由でDtakologsServiceを呼び出すためのcomposable
 */

import type { Dtakolog } from "@yhonda-ohishi-pub-dev/logi-proto"

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

// protobufのDtakologをフロントエンド用に変換
function convertDtakolog(d: Dtakolog): DtakologView {
  return {
    GPSDirection: d.gpsDirection,
    GPSLatitude: d.gpsLatitude,
    GPSLongitude: d.gpsLongitude,
    VehicleCD: d.vehicleCd,
    VehicleName: d.vehicleName,
    DriverName: d.driverName,
    AddressDispC: d.addressDispC,
    DataDateTime: d.dataDateTime,
    AddressDispP: d.addressDispP,
    SubDriverCD: d.subDriverCd,
    AllState: d.allState ?? "",
    ReciveTypeColorName: d.reciveTypeColorName,
    AllStateEx: d.allStateEx,
    State2: d.allState && ["Drive", "Rest", "Break"].includes(d.allState)
      ? (d.state2 ?? "")
      : "",
    AllStateFontColor: d.allStateFontColor,
    Speed: d.speed === 0 ? "" : d.speed,
  }
}

export function useDtakologs() {
  const { $grpc } = useNuxtApp()
  const data = ref<DtakologView[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<Error | null>(null)

  /**
   * 車両毎の最新運行ログを取得
   */
  async function fetchCurrentListAll() {
    status.value = 'pending'
    error.value = null

    try {
      const response = await $grpc.dtakologs.currentListAll({})
      data.value = response.dtakologs.map(convertDtakolog)
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
      const response = await $grpc.dtakologs.getDate({
        dateTime: request.dateTime,
        vehicleCd: request.vehicleCd,
      })
      return response.dtakologs.map(convertDtakolog)
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
      const response = await $grpc.dtakologs.currentListSelect({
        addressDispP: request.addressDispP,
        branchCd: request.branchCd,
        vehicleCds: request.vehicleCds ?? [],
      })
      return response.dtakologs.map(convertDtakolog)
    } catch (e) {
      error.value = e as Error
      status.value = 'error'
      console.error('Failed to fetch currentListSelect:', e)
      return []
    }
  }

  return {
    data: readonly(data),
    status: readonly(status),
    error: readonly(error),
    fetchCurrentListAll,
    fetchByDate,
    fetchCurrentListSelect,
  }
}
