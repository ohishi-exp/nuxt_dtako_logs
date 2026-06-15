<template>
  <ClientOnly>
    <div class="p-6 max-w-md mx-auto">
      <h1 class="text-lg font-bold mb-3">起票 close</h1>

      <div v-if="state === 'pending'" class="text-sm text-gray-600">
        close 中...
      </div>

      <div v-else-if="state === 'success'" class="text-sm">
        <p class="text-green-700 font-semibold mb-2">close しました。</p>
        <p v-if="resultId" class="text-xs text-gray-500 font-mono break-all">id: {{ resultId }}</p>
      </div>

      <div v-else-if="state === 'noop'" class="text-sm">
        <p class="text-gray-700">この起票はすでに close 済みか、対象が見つかりません。</p>
      </div>

      <div v-else-if="state === 'missing-token'" class="text-sm text-red-600">
        token が指定されていません。
      </div>

      <div v-else-if="state === 'error'" class="text-sm text-red-600">
        close に失敗しました。時間をおいて再度お試しください。
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
// 認証不要。QR スキャン経由で開かれる。
definePageMeta({ auth: false })

const route = useRoute()
const { closeByToken } = useDtakoTickets()

type State = 'idle' | 'pending' | 'success' | 'noop' | 'missing-token' | 'error'
const state = ref<State>('idle')
const resultId = ref<string | null>(null)

onMounted(async () => {
  const token = String(route.query.token ?? '').trim()
  if (!token) {
    state.value = 'missing-token'
    return
  }
  state.value = 'pending'
  const r = await closeByToken(token)
  if (!r) {
    state.value = 'error'
    return
  }
  if (r.closed && r.id) {
    resultId.value = r.id
    state.value = 'success'
  } else {
    state.value = 'noop'
  }
})
</script>
