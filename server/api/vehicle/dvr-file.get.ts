/**
 * DVR 動画ファイル (`.vdf`、NET780 独自コンテナ形式) のダウンロード。
 * Refs ohishi-exp/browser-render-rust#14。
 *
 * `comp_id` は解決済み account (tenant_id 由来) から取り、クライアントには渡させない
 * (テナント越境で他社の動画を取得できてしまうのを防ぐ)。`support_id`/`vehicle_cd`/
 * `filename` は `/api/vehicle/dvr` が返した通知一覧から得たものをクエリで渡す想定。
 */
import type { H3Event } from "h3";
import { buildDvrFileUrl, downloadDvrFile, login, createCookieJar } from "../../utils/theearth-venus-client";
import { resolveDtakoAccount } from "../../utils/dtako-accounts";

function cfEnv(event: H3Event): Record<string, unknown> {
  return (event.context.cloudflare as { env?: Record<string, unknown> } | undefined)?.env ?? {};
}

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const tenantId = (event.context.auth as { tenant_id?: string } | undefined)?.tenant_id;
  if (!tenantId) {
    throw createError({ statusCode: 403, statusMessage: "tenant_id が取得できません" });
  }

  const env = cfEnv(event);
  const account = await resolveDtakoAccount(env.DTAKO_ACCOUNTS, tenantId);
  if (!account) {
    throw createError({
      statusCode: 503,
      statusMessage: `DTAKO_ACCOUNTS に tenant_id=${tenantId} の企業情報が見つかりません (未投入または未対応テナント)`,
    });
  }

  const query = getQuery(event);
  const supportId = query.support_id;
  const vehicleCd = query.vehicle_cd;
  const filename = query.filename;
  if (typeof supportId !== "string" || typeof vehicleCd !== "string" || typeof filename !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "support_id / vehicle_cd / filename がすべて必要です",
    });
  }

  try {
    const url = buildDvrFileUrl(account.compId, supportId, vehicleCd, filename);
    const jar = createCookieJar();
    await login(jar, { compId: account.compId, userName: account.userName, userPass: account.userPass });
    const buf = await downloadDvrFile(jar, url);

    setResponseHeader(event, "content-type", "application/octet-stream");
    setResponseHeader(event, "content-disposition", `attachment; filename="${filename}.vdf"`);
    return new Uint8Array(buf);
  } catch (e) {
    throw createError({
      statusCode: 502,
      statusMessage: e instanceof Error ? e.message : "DVR 動画ファイルの取得に失敗しました",
    });
  }
});
