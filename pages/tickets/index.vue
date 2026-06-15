<template>
  <ClientOnly>
    <div class="p-4">
      <div class="flex items-center gap-3 mb-3 no-print">
        <h1 class="text-lg font-bold">dtako 起票 (tickets)</h1>
        <USelect v-model="statusFilter" :options="statusOptions" />
        <UButton size="xs" @click="reload">再読込</UButton>
        <span v-if="status === 'pending'" class="text-sm text-gray-500">読込中...</span>
        <span v-if="error" class="text-sm text-red-500">{{ error.message }}</span>
        <div class="flex-1" />
        <AuthToolbar />
      </div>

      <UTable :rows="rows" :columns="columns" @select="onSelect" :ui="{
        wrapper: 'border border-white',
        tr: { active: 'hover:bg-gray-200 dark:hover:bg-gray-100/50 cursor-pointer' },
      }">
        <template #status-data="{ row }">
          <span :class="badgeClass(row.status)" class="px-2 py-0.5 rounded text-xs">{{ row.status }}</span>
        </template>
        <template #source_email_received_at-data="{ row }">
          {{ fmtDateTime(row.source_email_received_at) }}
        </template>
      </UTable>

      <p v-if="rows.length === 0 && status === 'success'" class="text-sm text-gray-500 mt-2">
        該当する起票はありません。
      </p>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { DtakoTicketStatus, DtakoTicketView } from '~/composables/useDtakoTickets'

const router = useRouter()
const { list, status, error, fetchList } = useDtakoTickets()

const statusFilter = ref<'all' | DtakoTicketStatus>('all')
const statusOptions = [
  { value: 'all', label: 'すべて' },
  { value: 'open', label: 'open' },
  { value: 'scraping', label: 'scraping' },
  { value: 'scraped', label: 'scraped' },
  { value: 'closed', label: 'closed' },
]

const columns = [
  { key: 'source_email_received_at', label: '受信日時' },
  { key: 'vehicle_name', label: '車両' },
  { key: 'error_kind', label: 'エラー種別' },
  { key: 'status', label: 'ステータス' },
  { key: 'unko_no', label: '運行 No' },
]

const rows = computed<DtakoTicketView[]>(() => list.value)

async function reload() {
  const filter = statusFilter.value === 'all' ? {} : { status: statusFilter.value }
  await fetchList(filter)
}

function onSelect(row: DtakoTicketView) {
  router.push(`/tickets/${row.id}`)
}

function badgeClass(s: DtakoTicketStatus) {
  switch (s) {
    case 'open': return 'bg-yellow-200 text-yellow-900'
    case 'scraping': return 'bg-blue-200 text-blue-900'
    case 'scraped': return 'bg-green-200 text-green-900'
    case 'closed': return 'bg-gray-300 text-gray-700'
  }
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

watch(statusFilter, reload)
onMounted(reload)
</script>
