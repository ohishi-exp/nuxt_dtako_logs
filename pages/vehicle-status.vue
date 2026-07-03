<template>
  <ClientOnly>
    <div class="p-4">
      <div class="flex items-center gap-3 mb-3 no-print">
        <h1 class="text-lg font-bold">動態管理 (現在地・DVR動画)</h1>
        <UButton size="xs" @click="reloadVehicles">現在地 再読込</UButton>
        <UButton size="xs" @click="reloadDvr">DVR通知 再読込</UButton>
        <span v-if="status === 'pending'" class="text-sm text-gray-500">読込中...</span>
        <span v-if="error" class="text-sm text-red-500">{{ error.message }}</span>
        <div class="flex-1" />
        <AuthToolbar />
      </div>

      <p class="text-xs text-gray-500 mb-2">
        現在地は theearth-np の VenusBridgeService 実データ未検証のため、緯度経度を解決できなかった
        車両は「未解決」と表示されます (Refs ohishi-exp/browser-render-rust#14)。
      </p>

      <h2 class="font-semibold mt-4 mb-1">現在地</h2>
      <UTable :rows="vehicles" :columns="vehicleColumns" :ui="{ wrapper: 'border border-white' }">
        <template #locationResolved-data="{ row }">
          <span v-if="row.locationResolved">{{ row.latitude }}, {{ row.longitude }}</span>
          <span v-else class="text-yellow-600">未解決 (raw参照)</span>
        </template>
      </UTable>
      <p v-if="vehicles.length === 0" class="text-sm text-gray-500 mt-2">車両情報がありません。</p>

      <h2 class="font-semibold mt-6 mb-1">DVR 動画通知</h2>
      <UTable :rows="notifications" :columns="dvrColumns" :ui="{ wrapper: 'border border-white' }">
        <template #fileName-data="{ row }">
          <UButton
            v-if="row.fileName && row.vehicleCd"
            size="xs"
            :to="buildDvrDownloadUrl(row.serialNo ?? '', row.vehicleCd, row.fileName)"
            target="_blank"
          >
            {{ row.fileName }}
          </UButton>
          <span v-else>-</span>
        </template>
      </UTable>
      <p v-if="notifications.length === 0" class="text-sm text-gray-500 mt-2">DVR 動画通知がありません。</p>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
const { vehicles, notifications, status, error, fetchVehicleStatus, fetchDvrNotifications, buildDvrDownloadUrl } =
  useVehicleStatus()

const vehicleColumns = [
  { key: 'vehicleCd', label: '車両CD' },
  { key: 'vehicleName', label: '車両名' },
  { key: 'locationResolved', label: '現在地' },
]

const dvrColumns = [
  { key: 'vehicleCd', label: '車両CD' },
  { key: 'vehicleName', label: '車両名' },
  { key: 'dvrDatetime', label: '日時' },
  { key: 'eventType', label: 'イベント' },
  { key: 'driverName', label: '運転者' },
  { key: 'fileName', label: 'ファイル' },
]

async function reloadVehicles() {
  await fetchVehicleStatus()
}

async function reloadDvr() {
  await fetchDvrNotifications()
}

onMounted(() => {
  reloadVehicles()
  reloadDvr()
})
</script>
