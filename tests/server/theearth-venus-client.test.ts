import { describe, expect, it } from 'vitest'
import {
  assertVdfMagic,
  buildDvrFileUrl,
  callVenusBridgeMethod,
  cookieHeader,
  createCookieJar,
  downloadDvrFile,
  getDvrNotifications,
  getVehicleStates,
  ingestSetCookie,
  login,
  TheearthClientError,
  type FetchLike,
} from '../../server/utils/theearth-venus-client'

const VDF_BYTES = new Uint8Array([0x4e, 0x45, 0x54, 0x37, 0x38, 0x30, 0x01, 0x02])

function html(body: string): Response {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

function jsonResponse(body: unknown, contentType = 'application/json; charset=utf-8'): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': contentType } })
}

function redirect(location: string | null): Response {
  const headers = new Headers()
  if (location) headers.set('location', location)
  return new Response(null, { status: 302, headers })
}

function sequenceFetch(responses: Response[]): FetchLike {
  let i = 0
  return (async () => {
    const res = responses[i]
    i += 1
    if (!res) throw new Error(`unexpected extra fetch call (#${i})`)
    return res
  }) as FetchLike
}

const LOGIN_PAGE_HTML = `<html><body>
  <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="VS123==" />
</body></html>`
const LOGIN_SUCCESS_HTML = `<html><body>ようこそ<span id="Button1st_2"></span></body></html>`
const LOGIN_FAILURE_HTML = `<html><body>ID またはパスワードが正しくありません</body></html>`
const OVERLAP_SESSION_HTML = `<html><body>
  <input type="hidden" name="txtOverlapSessionID" id="txtOverlapSessionID" value="dummy" />
  <input type="submit" id="btnForced" name="ctl00$MainContent$btnForced" value="強制ログイン" />
</body></html>`
const OVERLAP_SESSION_NO_BUTTON_HTML = `<html><body>
  <input type="hidden" name="txtOverlapSessionID" id="txtOverlapSessionID" value="dummy" />
</body></html>`

describe('cookie jar', () => {
  it('ingests Set-Cookie and builds the Cookie header', () => {
    const jar = createCookieJar()
    const headers = new Headers()
    headers.append('set-cookie', 'sid=abc; Path=/')
    ingestSetCookie(jar, headers)
    expect(cookieHeader(jar)).toBe('sid=abc')
  })

  it('falls back to a single set-cookie header when getSetCookie is unavailable', () => {
    const jar = createCookieJar()
    const fakeHeaders = { get: (name: string) => (name === 'set-cookie' ? 'sid=xyz' : null) } as unknown as Headers
    ingestSetCookie(jar, fakeHeaders)
    expect(cookieHeader(jar)).toBe('sid=xyz')
  })
})

describe('login (shared with dtako-scraper-relay theearth-client)', () => {
  it('succeeds via the logged-in marker', async () => {
    const fetchImpl = sequenceFetch([html(LOGIN_PAGE_HTML), html(LOGIN_SUCCESS_HTML)])
    const jar = createCookieJar()
    await expect(
      login(jar, { compId: '27324455', userName: 'user1', userPass: 'pass1' }, fetchImpl),
    ).resolves.toBeUndefined()
  })

  it('succeeds via redirect', async () => {
    const fetchImpl = sequenceFetch([html(LOGIN_PAGE_HTML), redirect('/F-VOS0010.aspx'), html('ok')])
    const jar = createCookieJar()
    await login(jar, { compId: '27324455', userName: 'user1', userPass: 'pass1' }, fetchImpl)
  })

  it('throws when neither a redirect nor the logged-in marker appears', async () => {
    const fetchImpl = sequenceFetch([html(LOGIN_PAGE_HTML), html(LOGIN_FAILURE_HTML)])
    const jar = createCookieJar()
    await expect(
      login(jar, { compId: '27324455', userName: 'user1', userPass: 'pass1' }, fetchImpl),
    ).rejects.toThrow(TheearthClientError)
  })

  it('follows the forced-login flow on overlap session and succeeds via redirect', async () => {
    const fetchImpl = sequenceFetch([html(LOGIN_PAGE_HTML), html(OVERLAP_SESSION_HTML), redirect('/ok')])
    const jar = createCookieJar()
    await login(jar, { compId: '27324455', userName: 'user1', userPass: 'pass1' }, fetchImpl)
  })

  it('follows the forced-login flow on overlap session and succeeds via logged-in marker', async () => {
    const fetchImpl = sequenceFetch([html(LOGIN_PAGE_HTML), html(OVERLAP_SESSION_HTML), html(LOGIN_SUCCESS_HTML)])
    const jar = createCookieJar()
    await login(jar, { compId: '27324455', userName: 'user1', userPass: 'pass1' }, fetchImpl)
  })

  it('throws when the forced-login flow does not reach the logged-in page', async () => {
    const fetchImpl = sequenceFetch([html(LOGIN_PAGE_HTML), html(OVERLAP_SESSION_HTML), html(LOGIN_FAILURE_HTML)])
    const jar = createCookieJar()
    await expect(
      login(jar, { compId: '27324455', userName: 'user1', userPass: 'pass1' }, fetchImpl),
    ).rejects.toThrow('強制ログインに失敗しました')
  })

  it('throws when an overlap session form is detected but btnForced is missing', async () => {
    const fetchImpl = sequenceFetch([html(LOGIN_PAGE_HTML), html(OVERLAP_SESSION_NO_BUTTON_HTML)])
    const jar = createCookieJar()
    await expect(
      login(jar, { compId: '27324455', userName: 'user1', userPass: 'pass1' }, fetchImpl),
    ).rejects.toThrow('btnForced')
  })
})

describe('callVenusBridgeMethod', () => {
  it('unwraps the "d" field on success', async () => {
    const fetchImpl = sequenceFetch([jsonResponse({ d: { hello: 'world' } })])
    const jar = createCookieJar()
    const d = await callVenusBridgeMethod(jar, 'SomeMethod', {}, fetchImpl)
    expect(d).toEqual({ hello: 'world' })
  })

  it('throws on non-2xx status', async () => {
    const fetchImpl = sequenceFetch([new Response('err', { status: 500 })])
    const jar = createCookieJar()
    await expect(callVenusBridgeMethod(jar, 'SomeMethod', {}, fetchImpl)).rejects.toThrow(TheearthClientError)
  })

  it('throws when the response is not JSON (silent-200 guard)', async () => {
    const fetchImpl = sequenceFetch([html('<html>ログインしてください</html>')])
    const jar = createCookieJar()
    await expect(callVenusBridgeMethod(jar, 'SomeMethod', {}, fetchImpl)).rejects.toThrow(TheearthClientError)
  })

  it('throws when the response has no Content-Type header at all', async () => {
    const fetchImpl = sequenceFetch([new Response(new TextEncoder().encode('oops'), { status: 200 })])
    const jar = createCookieJar()
    await expect(callVenusBridgeMethod(jar, 'SomeMethod', {}, fetchImpl)).rejects.toThrow('unknown')
  })

  it('throws when the JSON response has no "d" field', async () => {
    const fetchImpl = sequenceFetch([jsonResponse({ notD: 1 })])
    const jar = createCookieJar()
    await expect(callVenusBridgeMethod(jar, 'SomeMethod', {}, fetchImpl)).rejects.toThrow('"d" フィールド')
  })
})

describe('getVehicleStates', () => {
  it('resolves lat/lng from an array response using known field names', async () => {
    const fetchImpl = sequenceFetch([
      jsonResponse({
        d: [
          { VehicleCD: '1001', VehicleName: 'Truck A', GPSLatitude: 35.6, GPSLongitude: 139.7 },
          { VehicleCD: '1002', VehicleName: 'Truck B' },
        ],
      }),
    ])
    const jar = createCookieJar()
    const states = await getVehicleStates(jar, {}, fetchImpl)
    expect(states).toHaveLength(2)
    expect(states[0]).toMatchObject({
      vehicleCd: '1001',
      vehicleName: 'Truck A',
      latitude: 35.6,
      longitude: 139.7,
      locationResolved: true,
    })
    expect(states[1]?.locationResolved).toBe(false)
    expect(states[1]?.raw).toEqual({ VehicleCD: '1002', VehicleName: 'Truck B' })
  })

  it('parses lat/lng given as numeric strings', async () => {
    const fetchImpl = sequenceFetch([
      jsonResponse({ d: [{ VehicleCD: '1003', GPSLatitude: '35.6', GPSLongitude: '139.7' }] }),
    ])
    const jar = createCookieJar()
    const states = await getVehicleStates(jar, {}, fetchImpl)
    expect(states[0]).toMatchObject({ latitude: 35.6, longitude: 139.7, locationResolved: true })
  })

  it('resolves a {rows:[]} wrapped response', async () => {
    const fetchImpl = sequenceFetch([jsonResponse({ d: { rows: [{ VehicleCD: '2001' }] } })])
    const jar = createCookieJar()
    const states = await getVehicleStates(jar, { branchCd: '01' }, fetchImpl)
    expect(states).toHaveLength(1)
    expect(states[0]?.vehicleCd).toBe('2001')
  })

  it('resolves a {Rows:[]} wrapped response (PascalCase fallback)', async () => {
    const fetchImpl = sequenceFetch([jsonResponse({ d: { Rows: [{ VehicleCD: '3001' }] } })])
    const jar = createCookieJar()
    const states = await getVehicleStates(jar, {}, fetchImpl)
    expect(states[0]?.vehicleCd).toBe('3001')
  })

  it('resolves a {Table:[]} wrapped response (DataTable-style fallback)', async () => {
    const fetchImpl = sequenceFetch([jsonResponse({ d: { Table: [{ VehicleCD: '4001' }] } })])
    const jar = createCookieJar()
    const states = await getVehicleStates(jar, {}, fetchImpl)
    expect(states[0]?.vehicleCd).toBe('4001')
  })

  it('throws loudly when the response shape is unrecognized', async () => {
    const fetchImpl = sequenceFetch([jsonResponse({ d: 'unexpected string' })])
    const jar = createCookieJar()
    await expect(getVehicleStates(jar, {}, fetchImpl)).rejects.toThrow(TheearthClientError)
  })
})

describe('getDvrNotifications', () => {
  it('maps known field names', async () => {
    const fetchImpl = sequenceFetch([
      jsonResponse({
        d: [
          {
            vehicle_cd: '1001',
            vehicle_name: 'Truck A',
            serial_no: 'SN1',
            file_name: '20260701_230059-27324455-1-1318-20260702_072616-E',
            file_path: '',
            event_type: 'alert',
            dvr_datetime: '2026-07-01T23:00:59',
            driver_name: '山田太郎',
          },
        ],
      }),
    ])
    const jar = createCookieJar()
    const notifications = await getDvrNotifications(jar, fetchImpl)
    expect(notifications).toEqual([
      {
        raw: expect.any(Object),
        vehicleCd: '1001',
        vehicleName: 'Truck A',
        serialNo: 'SN1',
        fileName: '20260701_230059-27324455-1-1318-20260702_072616-E',
        filePath: '',
        eventType: 'alert',
        dvrDatetime: '2026-07-01T23:00:59',
        driverName: '山田太郎',
      },
    ])
  })

  it('throws loudly when the response shape is unrecognized', async () => {
    const fetchImpl = sequenceFetch([jsonResponse({ d: 42 })])
    const jar = createCookieJar()
    await expect(getDvrNotifications(jar, fetchImpl)).rejects.toThrow(TheearthClientError)
  })
})

describe('buildDvrFileUrl', () => {
  it('builds the deterministic path', () => {
    expect(buildDvrFileUrl('27324455', '1', '1318', '20260701_230059-27324455-1-1318-20260702_072616-E')).toBe(
      'https://theearth-np.com/dvrData/27324455/1/1318/20260701_230059-27324455-1-1318-20260702_072616-E/20260701_230059-27324455-1-1318-20260702_072616-E.vdf',
    )
  })

  it('rejects segments with path traversal / unsafe characters', () => {
    expect(() => buildDvrFileUrl('27324455', '../etc', '1318', 'a')).toThrow(TheearthClientError)
    expect(() => buildDvrFileUrl('27324455', '1', '1318', 'a/b')).toThrow(TheearthClientError)
    expect(() => buildDvrFileUrl('27324455', '1', '1318', 'a.vdf')).toThrow(TheearthClientError)
  })
})

describe('assertVdfMagic / downloadDvrFile', () => {
  it('accepts a buffer with the NET780 magic bytes', () => {
    expect(() => assertVdfMagic(VDF_BYTES.buffer as ArrayBuffer)).not.toThrow()
  })

  it('rejects a buffer without the NET780 magic bytes', () => {
    expect(() => assertVdfMagic(new Uint8Array([0, 0, 0, 0, 0, 0]).buffer as ArrayBuffer)).toThrow(
      TheearthClientError,
    )
  })

  it('downloadDvrFile validates status and magic bytes', async () => {
    const fetchImpl = sequenceFetch([new Response(VDF_BYTES, { status: 200 })])
    const jar = createCookieJar()
    const buf = await downloadDvrFile(jar, 'https://theearth-np.com/dvrData/x', fetchImpl)
    expect(new Uint8Array(buf).slice(0, 6)).toEqual(VDF_BYTES.slice(0, 6))
  })

  it('downloadDvrFile throws on non-2xx status', async () => {
    const fetchImpl = sequenceFetch([new Response('nope', { status: 404 })])
    const jar = createCookieJar()
    await expect(downloadDvrFile(jar, 'https://theearth-np.com/dvrData/x', fetchImpl)).rejects.toThrow(
      TheearthClientError,
    )
  })
})
