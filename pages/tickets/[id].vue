<template>
  <ClientOnly>
    <div class="p-4">
      <div class="no-print flex items-center gap-3 mb-3">
        <UButton size="xs" variant="ghost" icon="i-heroicons-arrow-left" @click="$router.push('/tickets')">一覧</UButton>
        <h1 class="text-lg font-bold">起票詳細</h1>
        <div class="flex-1" />
        <UButton size="xs" @click="doPrint">印刷</UButton>
        <AuthToolbar />
      </div>

      <div v-if="!ticket && loaded" class="text-sm text-red-500">起票が見つかりません。</div>

      <div v-if="ticket" class="print-area mx-auto">
        <!-- メタ -->
        <section class="mb-4">
          <h2 class="text-base font-semibold mb-1">基本情報</h2>
          <dl class="grid grid-cols-[8em_1fr] gap-y-1 gap-x-2 text-sm">
            <dt class="text-gray-500">起票 ID</dt>
            <dd class="font-mono">{{ ticket.id }}</dd>
            <dt class="text-gray-500">発生日時</dt>
            <dd>{{ fmtDateTime(ticket.source_email_received_at) }}</dd>
            <dt class="text-gray-500">車両</dt>
            <dd>{{ ticket.vehicle_name }}<span v-if="ticket.vehicle_code"> ({{ ticket.vehicle_code }})</span></dd>
            <dt class="text-gray-500">エラー種別</dt>
            <dd>{{ ticket.error_kind }}</dd>
            <dt class="text-gray-500">ステータス</dt>
            <dd>{{ ticket.status }}</dd>
            <dt class="text-gray-500">subject</dt>
            <dd>{{ ticket.source_email_subject ?? '-' }}</dd>
          </dl>
        </section>

        <!-- F-VOS3020 設定 -->
        <section v-if="ticket.scraped_payload || ticket.unko_no" class="mb-4">
          <h2 class="text-base font-semibold mb-1">F-VOS3020 設定 / 該当運行</h2>
          <dl class="grid grid-cols-[8em_1fr] gap-y-1 gap-x-2 text-sm">
            <dt class="text-gray-500">運行 No</dt>
            <dd>{{ ticket.unko_no ?? '-' }}</dd>
            <dt class="text-gray-500">開始</dt>
            <dd>{{ ticket.operation_started_at ? fmtDateTime(ticket.operation_started_at) : '-' }}</dd>
            <dt class="text-gray-500">終了</dt>
            <dd>{{ ticket.operation_ended_at ? fmtDateTime(ticket.operation_ended_at) : '-' }}</dd>
            <dt class="text-gray-500">comp_id</dt>
            <dd>{{ ticket.comp_id ?? '-' }}</dd>
          </dl>
          <pre v-if="ticket.scraped_payload" class="text-xs mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">{{ scrapedPretty }}</pre>
        </section>

        <!-- QR (close 用) -->
        <section class="mb-4 flex items-center gap-4">
          <div>
            <h2 class="text-base font-semibold mb-1">close QR</h2>
            <p class="text-xs text-gray-500">スキャンで close ページを開きます。</p>
            <p class="text-[10px] text-gray-400 font-mono break-all mt-1">{{ closeUrl }}</p>
          </div>
          <img v-if="qrDataUrl" :src="qrDataUrl" class="print-qr" alt="close QR" />
        </section>

        <footer class="text-xs text-gray-500 mt-4 print-footer">
          印刷: {{ printedAt }} / status: {{ ticket.status }}
        </footer>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'

const route = useRoute()
const { fetchById } = useDtakoTickets()

const ticket = ref<import('~/composables/useDtakoTickets').DtakoTicketView | null>(null)
const loaded = ref(false)
const qrDataUrl = ref<string>('')

const closeUrl = computed(() => {
  if (!ticket.value) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/tickets/close?token=${encodeURIComponent(ticket.value.close_token)}`
})

const scrapedPretty = computed(() => {
  if (!ticket.value?.scraped_payload) return ''
  try {
    return JSON.stringify(ticket.value.scraped_payload, null, 2)
  } catch {
    return String(ticket.value.scraped_payload)
  }
})

const printedAt = computed(() => fmtDateTime(new Date().toISOString()))

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function doPrint() {
  if (typeof window !== 'undefined') window.print()
}

onMounted(async () => {
  const id = String(route.params.id)
  ticket.value = await fetchById(id)
  loaded.value = true
  if (ticket.value && closeUrl.value) {
    try {
      qrDataUrl.value = await QRCode.toDataURL(closeUrl.value, { margin: 1, width: 240 })
    } catch (e) {
      console.error('QR generation failed', e)
    }
  }
})
</script>

<style scoped>
@media print {
  :global(.no-print) { display: none !important; }
  .print-area { width: 18cm; }
  .print-qr { width: 5cm; height: 5cm; }
  pre { white-space: pre-wrap; word-break: break-all; }
}
.print-qr { width: 240px; height: 240px; }
</style>
