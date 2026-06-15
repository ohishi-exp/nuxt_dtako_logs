import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import {
  isLive, mockFetch, stubOk, stubReject,
  assertMock,
  setupApi, teardownApi, jwtToken,
} from '../helpers/api-test-env'

import { ref } from 'vue'
;(globalThis as any).useAuth = () => ({ token: ref(jwtToken) })
if (!isLive) {
  ;(globalThis as any).$fetch = mockFetch
}

import { useDtakoTickets } from '../../composables/useDtakoTickets'
import type { DtakoTicketView } from '../../composables/useDtakoTickets'

const sampleTicket: DtakoTicketView = {
  id: 'aaaa1111-bbbb-2222-cccc-333344445555',
  tenant_id: '11111111-1111-1111-1111-111111111111',
  source: 'email',
  source_email_subject: '(16) SDカードエラー',
  source_email_from: 'noreply@example.com',
  source_email_message_id: '<msg-1@example.com>',
  source_email_received_at: '2026-06-15T08:00:00Z',
  vehicle_name: '(16) 十勝800か16',
  vehicle_code: 'V016',
  error_kind: 'sd_card_error',
  status: 'open',
  comp_id: null,
  unko_no: null,
  operation_started_at: null,
  operation_ended_at: null,
  scraped_payload: null,
  settings_zip_r2_key: null,
  close_token: 'deadbeefcafef00d1234567890abcdef',
  closed_at: null,
  closed_by: null,
  raw_email_text: null,
  created_at: '2026-06-15T08:00:00Z',
  updated_at: '2026-06-15T08:00:00Z',
}

beforeAll(async () => {
  if (isLive) await setupApi()
})

beforeEach(async () => {
  await setupApi()
})

afterEach(() => {
  teardownApi()
})

describe('fetchList', () => {
  it('returns tickets on success and updates list state', async () => {
    stubOk([sampleTicket])
    const { list, status, fetchList } = useDtakoTickets()

    const result = await fetchList()

    if (isLive) {
      expect(Array.isArray(result)).toBe(true)
      return
    }
    expect(status.value).toBe('success')
    expect(list.value).toHaveLength(1)
    expect(result).toHaveLength(1)
    expect(list.value[0].id).toBe(sampleTicket.id)
    assertMock(() => {
      expect(mockFetch.mock.calls[0][0]).toBe('/api/proxy/dtako/tickets')
    })
  })

  it('passes status filter as query param', async () => {
    stubOk([])
    const { fetchList } = useDtakoTickets()

    await fetchList({ status: 'open' })

    assertMock(() => {
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('/api/proxy/dtako/tickets?')
      expect(url).toContain('status=open')
    })
  })

  it('returns empty array and sets error state on failure', async () => {
    stubReject(new Error('boom'))
    const { fetchList, status, error } = useDtakoTickets()

    const result = await fetchList()

    if (isLive) return
    expect(result).toEqual([])
    expect(status.value).toBe('error')
    expect(error.value).toBeTruthy()
  })

  it('includes Authorization header', async () => {
    stubOk([])
    const { fetchList } = useDtakoTickets()

    await fetchList()

    assertMock(() => {
      const opts = mockFetch.mock.calls[0][1] as { headers: Record<string, string> }
      expect(opts.headers.Authorization).toBe(`Bearer ${jwtToken}`)
    })
  })
})

describe('fetchById', () => {
  it('returns ticket on success', async () => {
    stubOk(sampleTicket)
    const { fetchById } = useDtakoTickets()

    const r = await fetchById(sampleTicket.id)

    if (isLive) return
    expect(r?.id).toBe(sampleTicket.id)
    assertMock(() => {
      expect(mockFetch.mock.calls[0][0]).toBe(`/api/proxy/dtako/tickets/${sampleTicket.id}`)
    })
  })

  it('returns null on failure', async () => {
    stubReject(new Error('not found'))
    const { fetchById } = useDtakoTickets()

    const r = await fetchById('missing-id')

    if (isLive) return
    expect(r).toBeNull()
  })
})

describe('closeByToken', () => {
  it('returns close result on success', async () => {
    stubOk({ id: sampleTicket.id, closed: true })
    const { closeByToken } = useDtakoTickets()

    const r = await closeByToken(sampleTicket.close_token, 'driver-A')

    if (isLive) return
    expect(r?.closed).toBe(true)
    expect(r?.id).toBe(sampleTicket.id)
    assertMock(() => {
      const [url, opts] = mockFetch.mock.calls[0] as [string, { method: string; body: Record<string, unknown> }]
      expect(url).toBe('/api/proxy/dtako/tickets/close')
      expect(opts.method).toBe('POST')
      expect(opts.body).toEqual({ close_token: sampleTicket.close_token, closed_by: 'driver-A' })
    })
  })

  it('defaults closed_by to null when omitted', async () => {
    stubOk({ id: null, closed: false })
    const { closeByToken } = useDtakoTickets()

    await closeByToken(sampleTicket.close_token)

    assertMock(() => {
      const opts = mockFetch.mock.calls[0][1] as { body: Record<string, unknown> }
      expect(opts.body.closed_by).toBeNull()
    })
  })

  it('returns null on failure', async () => {
    stubReject(new Error('500'))
    const { closeByToken } = useDtakoTickets()

    const r = await closeByToken('bad-token')

    if (isLive) return
    expect(r).toBeNull()
  })
})
