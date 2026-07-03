/**
 * theearth-np.com (ASP.NET WebForms + WCF `.svc`) へのブラウザレス HTTP クライアント。
 *
 * ohishi-exp/browser-render-rust#14 の実機トレースに基づく:
 * - login は ohishi-exp/dtako-scraper#22 と同じ cookie フロー
 * - VenusBridgeService (`.svc`) は `POST {svc}/{MethodName}` に JSON body →
 *   `{"d": ...}` の JSON を返す WCF AJAX-enabled service
 *
 * `VehicleStateTableForBranchEx` (現在地) は issue #14 時点で実データ PoC が
 * 無かったため、リクエスト body・レスポンス項目名は推測。パース側は候補フィールド名を
 * 複数試し、解決できなければ `locationResolved: false` + raw を返す (「黙って200」対策
 * の派生 — 分からないものを分かった顔で返さない)。DVR 通知 (`Monitoring_DvrNotification2`)
 * は issue #14 で具体的なパラメータ・パスパターンまで確認済み。
 */

const BASE_URL = "https://theearth-np.com";
const LOGIN_PATH = "/F-OES1010[Login].aspx";
const VENUS_BRIDGE_PATH = "/Bridge/B-GOS0010[VenusBridgeService].svc";

export class TheearthClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TheearthClientError";
  }
}

export type FetchLike = typeof fetch;

// ---------------------------------------------------------------------------
// Cookie jar (dtako-scraper-relay の theearth-client.ts と同一実装)
// ---------------------------------------------------------------------------

export interface CookieJar {
  cookies: Map<string, string>;
}

export function createCookieJar(): CookieJar {
  return { cookies: new Map() };
}

function extractSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie();
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

export function ingestSetCookie(jar: CookieJar, headers: Headers): void {
  for (const raw of extractSetCookieHeaders(headers)) {
    const pair = raw.split(";", 1)[0];
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!name) continue;
    jar.cookies.set(name, value);
  }
}

export function cookieHeader(jar: CookieJar): string {
  return Array.from(jar.cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function fetchWithJar(
  jar: CookieJar,
  url: string,
  init: RequestInit,
  fetchImpl: FetchLike,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const cookie = cookieHeader(jar);
  if (cookie) headers.set("cookie", cookie);
  const res = await fetchImpl(url, { ...init, headers, redirect: "manual" });
  ingestSetCookie(jar, res.headers);
  return res;
}

// ---------------------------------------------------------------------------
// ログイン (dtako-scraper-relay の theearth-client.ts と同じ実機確認済みフィールド)
// ---------------------------------------------------------------------------

export interface LoginParams {
  compId: string;
  userName: string;
  userPass: string;
}

function findTagById(html: string, id: string): string | null {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<input\\b[^>]*\\bid=["']${escapedId}["'][^>]*>`, "i");
  return html.match(re)?.[0] ?? null;
}

interface FormFieldRef {
  name: string;
  value: string;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function findFormFieldById(html: string, id: string): FormFieldRef | null {
  const tag = findTagById(html, id);
  if (!tag) return null;
  const nameMatch = tag.match(/\bname=["']([^"']+)["']/i);
  if (!nameMatch) return null;
  const valueMatch = tag.match(/\bvalue=["']([^"']*)["']/i);
  return {
    name: nameMatch[1],
    value: valueMatch ? decodeHtmlEntities(valueMatch[1]) : "",
  };
}

const HIDDEN_FIELD_NAMES = [
  "__VIEWSTATE",
  "__VIEWSTATEGENERATOR",
  "__EVENTVALIDATION",
  "__PREVIOUSPAGE",
] as const;

function extractHiddenFields(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of HIDDEN_FIELD_NAMES) {
    const field = findFormFieldById(html, name);
    if (field) result[name] = field.value;
  }
  return result;
}

function looksLoggedIn(html: string): boolean {
  return html.includes("Button1st_2") || html.includes("Button1st_7");
}

function looksLikeOverlapSessionForm(html: string): boolean {
  return html.includes("txtOverlapSessionID") || html.includes("btnForced");
}

async function postForm(
  jar: CookieJar,
  url: string,
  body: URLSearchParams,
  fetchImpl: FetchLike,
): Promise<Response> {
  return fetchWithJar(
    jar,
    url,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded; charset=utf-8" },
      body: body.toString(),
    },
    fetchImpl,
  );
}

export async function login(
  jar: CookieJar,
  params: LoginParams,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const loginUrl = `${BASE_URL}${LOGIN_PATH}?mode=timeout`;

  const getRes = await fetchWithJar(jar, loginUrl, { method: "GET" }, fetchImpl);
  const html = await getRes.text();
  const hidden = extractHiddenFields(html);

  const body = new URLSearchParams({
    ...hidden,
    txtID2: params.compId,
    txtID1: params.userName,
    txtPass: params.userPass,
    btnLogin: "ログイン",
  });

  const postRes = await postForm(jar, loginUrl, body, fetchImpl);

  if (postRes.status >= 300 && postRes.status < 400) {
    const location = postRes.headers.get("location");
    if (location) {
      const followRes = await fetchWithJar(
        jar,
        new URL(location, loginUrl).toString(),
        { method: "GET" },
        fetchImpl,
      );
      await followRes.text();
    }
    return;
  }

  const postHtml = await postRes.text();

  if (looksLikeOverlapSessionForm(postHtml)) {
    const hidden2 = extractHiddenFields(postHtml);
    const btnForced = findFormFieldById(postHtml, "btnForced");
    if (!btnForced) {
      throw new TheearthClientError(
        "セッション重複フォームを検出したが btnForced が見つかりません (ページ仕様変更の可能性)",
      );
    }
    const forcedBody = new URLSearchParams({
      ...hidden2,
      [btnForced.name]: btnForced.value || "ログイン",
    });
    const forcedRes = await postForm(jar, loginUrl, forcedBody, fetchImpl);
    if (forcedRes.status >= 300 && forcedRes.status < 400) return;
    const forcedHtml = await forcedRes.text();
    if (!looksLoggedIn(forcedHtml)) {
      throw new TheearthClientError("強制ログインに失敗しました");
    }
    return;
  }

  if (!looksLoggedIn(postHtml)) {
    throw new TheearthClientError(
      "ログインに失敗しました (ログイン後の画面を検出できません。ID/パスワード誤り、またはサイト仕様変更の可能性)",
    );
  }
}

// ---------------------------------------------------------------------------
// VenusBridgeService (WCF `.svc`、JSON POST)
// ---------------------------------------------------------------------------

/** `POST {VenusBridgeService}/{methodName}` を叩き `{"d": ...}` の `d` を返す。
 * HTML エラーページ (ログイン切れ等) を JSON として誤扱いしないよう、
 * content-type と `d` フィールドの存在を必ず検証する (「黙って200」対策)。 */
export async function callVenusBridgeMethod(
  jar: CookieJar,
  methodName: string,
  body: Record<string, unknown>,
  fetchImpl: FetchLike = fetch,
): Promise<unknown> {
  const url = `${BASE_URL}${VENUS_BRIDGE_PATH}/${methodName}`;
  const res = await fetchWithJar(
    jar,
    url,
    {
      method: "POST",
      headers: { "content-type": "application/json; charset=UTF-8" },
      body: JSON.stringify(body),
    },
    fetchImpl,
  );

  if (!res.ok) {
    throw new TheearthClientError(`VenusBridge ${methodName} が HTTP ${res.status} を返しました`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    const text = await res.text();
    throw new TheearthClientError(
      `VenusBridge ${methodName} が JSON ではなく "${contentType || "unknown"}" を返しました ` +
        `(先頭200文字: ${text.slice(0, 200)}) — ログイン切れ、またはサイト仕様変更の可能性`,
    );
  }

  const json = (await res.json()) as unknown;
  if (json === null || typeof json !== "object" || !("d" in json)) {
    throw new TheearthClientError(
      `VenusBridge ${methodName} のレスポンスに "d" フィールドがありません: ${JSON.stringify(json).slice(0, 200)}`,
    );
  }
  return (json as { d: unknown }).d;
}

function toItemArray(d: unknown): Array<Record<string, unknown>> | null {
  if (Array.isArray(d)) return d as Array<Record<string, unknown>>;
  if (d && typeof d === "object") {
    const rows = (d as { rows?: unknown; Rows?: unknown; Table?: unknown }).rows
      ?? (d as { Rows?: unknown }).Rows
      ?? (d as { Table?: unknown }).Table;
    if (Array.isArray(rows)) return rows as Array<Record<string, unknown>>;
  }
  return null;
}

function pickNumberField(record: Record<string, unknown>, candidates: readonly string[]): number | null {
  for (const key of candidates) {
    if (key in record) {
      const v = record[key];
      const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function pickStringField(record: Record<string, unknown>, candidates: readonly string[]): string | null {
  for (const key of candidates) {
    if (key in record && record[key] != null) return String(record[key]);
  }
  return null;
}

// --- 現在地 (VehicleStateTableForBranchEx、レスポンス形式は推測・未実機検証) ---

const LAT_FIELD_CANDIDATES = ["GPSLatitude", "Latitude", "Lat"] as const;
const LNG_FIELD_CANDIDATES = ["GPSLongitude", "Longitude", "Lng", "Lon"] as const;
const VEHICLE_CD_CANDIDATES = ["VehicleCD", "VehicleCd", "vehicleCd"] as const;
const VEHICLE_NAME_CANDIDATES = ["VehicleName", "vehicleName"] as const;

export interface VehicleState {
  /** 生のレスポンス項目。フィールド名推測が外れていてもここから確認できる。 */
  raw: Record<string, unknown>;
  vehicleCd: string | null;
  vehicleName: string | null;
  latitude: number | null;
  longitude: number | null;
  /** true なら現在地フィールドを解決できた。false は「分からなかった」ことを明示する
   * (raw を見ずに緯度経度 0,0 等を誤表示しないためのフラグ)。 */
  locationResolved: boolean;
}

export interface VehicleStateParams {
  branchCd?: string;
}

export async function getVehicleStates(
  jar: CookieJar,
  params: VehicleStateParams,
  fetchImpl: FetchLike = fetch,
): Promise<VehicleState[]> {
  const d = await callVenusBridgeMethod(
    jar,
    "VehicleStateTableForBranchEx",
    { branchCd: params.branchCd ?? "", sort: ",,0,100" },
    fetchImpl,
  );

  const items = toItemArray(d);
  if (!items) {
    throw new TheearthClientError(
      `VehicleStateTableForBranchEx のレスポンス形式が想定と異なります (配列でも {rows:[]} でもありません): ` +
        `${JSON.stringify(d).slice(0, 300)}`,
    );
  }

  return items.map((raw) => {
    const latitude = pickNumberField(raw, LAT_FIELD_CANDIDATES);
    const longitude = pickNumberField(raw, LNG_FIELD_CANDIDATES);
    return {
      raw,
      vehicleCd: pickStringField(raw, VEHICLE_CD_CANDIDATES),
      vehicleName: pickStringField(raw, VEHICLE_NAME_CANDIDATES),
      latitude,
      longitude,
      locationResolved: latitude !== null && longitude !== null,
    };
  });
}

// --- DVR 動画通知 (Monitoring_DvrNotification2、issue #14 で実機確認済み) ---

const DVR_VEHICLE_CD_CANDIDATES = ["vehicle_cd", "VehicleCD", "VehicleCd"] as const;
const DVR_VEHICLE_NAME_CANDIDATES = ["vehicle_name", "VehicleName"] as const;
const DVR_SERIAL_NO_CANDIDATES = ["serial_no", "SerialNo"] as const;
const DVR_FILE_NAME_CANDIDATES = ["file_name", "FileName"] as const;
const DVR_FILE_PATH_CANDIDATES = ["file_path", "FilePath"] as const;
const DVR_EVENT_TYPE_CANDIDATES = ["event_type", "EventType"] as const;
const DVR_DATETIME_CANDIDATES = ["dvr_datetime", "DvrDatetime", "DvrDateTime"] as const;
const DVR_DRIVER_NAME_CANDIDATES = ["driver_name", "DriverName"] as const;

export interface DvrNotification {
  raw: Record<string, unknown>;
  vehicleCd: string | null;
  vehicleName: string | null;
  serialNo: string | null;
  fileName: string | null;
  filePath: string | null;
  eventType: string | null;
  dvrDatetime: string | null;
  driverName: string | null;
}

export async function getDvrNotifications(
  jar: CookieJar,
  fetchImpl: FetchLike = fetch,
): Promise<DvrNotification[]> {
  // sort 引数形式: "fieldName,dir,pageIndex,pageSize" (Refs browser-render-rust#14)
  const d = await callVenusBridgeMethod(jar, "Monitoring_DvrNotification2", { sort: ",,0,100" }, fetchImpl);

  const items = toItemArray(d);
  if (!items) {
    throw new TheearthClientError(
      `Monitoring_DvrNotification2 のレスポンス形式が想定と異なります (配列でも {rows:[]} でもありません): ` +
        `${JSON.stringify(d).slice(0, 300)}`,
    );
  }

  return items.map((raw) => ({
    raw,
    vehicleCd: pickStringField(raw, DVR_VEHICLE_CD_CANDIDATES),
    vehicleName: pickStringField(raw, DVR_VEHICLE_NAME_CANDIDATES),
    serialNo: pickStringField(raw, DVR_SERIAL_NO_CANDIDATES),
    fileName: pickStringField(raw, DVR_FILE_NAME_CANDIDATES),
    filePath: pickStringField(raw, DVR_FILE_PATH_CANDIDATES),
    eventType: pickStringField(raw, DVR_EVENT_TYPE_CANDIDATES),
    dvrDatetime: pickStringField(raw, DVR_DATETIME_CANDIDATES),
    driverName: pickStringField(raw, DVR_DRIVER_NAME_CANDIDATES),
  }));
}

// --- DVR 動画ファイル (決定論的パス、issue #14 で実機確認済み) ---

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

function assertSafeSegment(name: string, value: string): void {
  if (!SAFE_SEGMENT.test(value)) {
    throw new TheearthClientError(`不正な DVR ファイルパスセグメント (${name}): ${value}`);
  }
}

/** `/dvrData/{comp_id}/{support_id}/{vehicleCD}/{filename}/{filename}.vdf` という
 * 決定論的パスを組み立てる (Refs browser-render-rust#14)。各セグメントは英数字/アンダー
 * スコア/ハイフンのみを許可し、path traversal / 想定外パスへの SSRF を防ぐ。 */
export function buildDvrFileUrl(
  compId: string,
  supportId: string,
  vehicleCd: string,
  filename: string,
): string {
  assertSafeSegment("compId", compId);
  assertSafeSegment("supportId", supportId);
  assertSafeSegment("vehicleCd", vehicleCd);
  assertSafeSegment("filename", filename);
  return `${BASE_URL}/dvrData/${compId}/${supportId}/${vehicleCd}/${filename}/${filename}.vdf`;
}

const VDF_MAGIC = [0x4e, 0x45, 0x54, 0x37, 0x38, 0x30]; // ASCII "NET780"

/** `.vdf` (NET780 独自コンテナ) のマジックバイトを検証する。「黙って200」対策。 */
export function assertVdfMagic(buf: ArrayBuffer): void {
  const bytes = new Uint8Array(buf);
  const ok = VDF_MAGIC.every((b, i) => bytes[i] === b);
  if (!ok) {
    throw new TheearthClientError(
      `取得したデータが NET780 (.vdf) 形式ではありません (${bytes.length} bytes) — ` +
        "ログイン切れ、またはファイルパスの想定違いの可能性があります",
    );
  }
}

export async function downloadDvrFile(
  jar: CookieJar,
  url: string,
  fetchImpl: FetchLike = fetch,
): Promise<ArrayBuffer> {
  const res = await fetchWithJar(jar, url, { method: "GET" }, fetchImpl);
  if (!res.ok) {
    throw new TheearthClientError(`DVR ファイル取得が HTTP ${res.status} を返しました`);
  }
  const buf = await res.arrayBuffer();
  assertVdfMagic(buf);
  return buf;
}
