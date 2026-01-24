/**
 * Dtakologs Composable
 *
 * gRPC-Web経由でDtakologsServiceを呼び出すためのcomposable
 */

import type { Dtakolog } from "@yhonda-ohishi-pub-dev/logi-proto"
import { create, toBinary } from "@bufbuild/protobuf"
import { GetDateRequestSchema } from "@yhonda-ohishi-pub-dev/logi-proto"

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
      // ISO形式の日時を YY/MM/DD HH:MM 形式に変換
      const date = new Date(request.dateTime)
      const yy = String(date.getFullYear()).slice(-2)
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      const hh = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')
      const formattedDateTime = `${yy}/${mm}/${dd} ${hh}:${min}`

      // protobuf-esのcreate()を使って正しいメッセージ型を作成
      const grpcRequest = create(GetDateRequestSchema, {
        dateTime: formattedDateTime,
        vehicleCd: request.vehicleCd !== undefined ? Number(request.vehicleCd) : undefined,
      })

      // デバッグログ
      console.log('fetchByDate input:', {
        originalDateTime: request.dateTime,
        originalVehicleCd: request.vehicleCd,
        originalVehicleCdType: typeof request.vehicleCd,
      })
      console.log('fetchByDate grpcRequest:', {
        dateTime: grpcRequest.dateTime,
        vehicleCd: grpcRequest.vehicleCd,
        vehicleCdType: typeof grpcRequest.vehicleCd,
      })
      console.log('fetchByDate grpcRequest JSON:', JSON.stringify(grpcRequest))

      // シリアライズ結果をデバッグ
      const binary = toBinary(GetDateRequestSchema, grpcRequest)
      console.log('fetchByDate binary length:', binary.length)
      console.log('fetchByDate binary bytes:', Array.from(binary))

      const response = await $grpc.dtakologs.getDate(grpcRequest)
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
      const response = await $grpc.dtakologs.getDateRange({
        startDateTime: request.startDateTime,
        endDateTime: request.endDateTime,
        vehicleCd: request.vehicleCd,
      })
      return response.dtakologs.map(convertDtakolog)
    } catch (e) {
      error.value = e as Error
      status.value = 'error'
      console.error('Failed to fetch by date range:', e)
      return []
    }
  }

  return {
    data: readonly(data),
    status: readonly(status),
    error: readonly(error),
    fetchCurrentListAll,
    fetchByDate,
    fetchByDateRange,
    fetchCurrentListSelect,
  }
}
