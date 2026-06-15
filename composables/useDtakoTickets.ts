/**
 * Dtako Tickets Composable
 *
 * dtako 車両エラー起票 (ticket) の取得・close を行う。
 * email-receiver から起票 → nuxt_dtako_logs で一覧/詳細/印刷 → QR scan で close。
 *
 * Refs ippoan/email-receiver#1 / ippoan/rust-alc-api#414
 */

export type DtakoTicketStatus = 'open' | 'scraping' | 'scraped' | 'closed'

export interface DtakoTicketView {
  id: string
  tenant_id: string
  source: string
  source_email_subject: string | null
  source_email_from: string | null
  source_email_message_id: string | null
  source_email_received_at: string
  vehicle_name: string
  vehicle_code: string | null
  error_kind: string
  status: DtakoTicketStatus
  comp_id: string | null
  unko_no: string | null
  operation_started_at: string | null
  operation_ended_at: string | null
  scraped_payload: Record<string, unknown> | null
  settings_zip_r2_key: string | null
  close_token: string
  closed_at: string | null
  closed_by: string | null
  raw_email_text: string | null
  created_at: string
  updated_at: string
}

export interface DtakoTicketCloseResult {
  id: string | null
  closed: boolean
}

export function useDtakoTickets() {
  const { token } = useAuth()
  const list = ref<DtakoTicketView[]>([])
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
   * 起票一覧を取得。status filter (open / scraping / scraped / closed) を任意指定。
   */
  async function fetchList(filter: { status?: DtakoTicketStatus } = {}) {
    status.value = 'pending'
    error.value = null

    try {
      const params = new URLSearchParams()
      if (filter.status) params.set('status', filter.status)
      const qs = params.toString()
      const url = qs ? `/api/proxy/dtako/tickets?${qs}` : '/api/proxy/dtako/tickets'
      const response = await $fetch<DtakoTicketView[]>(url, {
        headers: authHeaders(),
      })
      list.value = response
      status.value = 'success'
      return response
    } catch (e) {
      error.value = e as Error
      status.value = 'error'
      console.error('Failed to fetch dtako tickets:', e)
      return []
    }
  }

  /**
   * 起票詳細を取得。
   */
  async function fetchById(id: string) {
    try {
      return await $fetch<DtakoTicketView>(`/api/proxy/dtako/tickets/${id}`, {
        headers: authHeaders(),
      })
    } catch (e) {
      error.value = e as Error
      console.error('Failed to fetch dtako ticket:', e)
      return null
    }
  }

  /**
   * close_token で起票を close する。認証不要 (QR scan 経路)。
   */
  async function closeByToken(closeToken: string, closedBy?: string) {
    try {
      return await $fetch<DtakoTicketCloseResult>('/api/proxy/dtako/tickets/close', {
        method: 'POST',
        body: { close_token: closeToken, closed_by: closedBy ?? null },
      })
    } catch (e) {
      error.value = e as Error
      console.error('Failed to close dtako ticket:', e)
      return null
    }
  }

  return {
    list,
    status: readonly(status),
    error: readonly(error),
    fetchList,
    fetchById,
    closeByToken,
  }
}
