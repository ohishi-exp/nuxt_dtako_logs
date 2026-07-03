/**
 * 車両現在地 (VenusBridgeService `VehicleStateTableForBranchEx`)。
 *
 * ohishi-exp/browser-render-rust#14 のブラウザレス化に基づき、Chromium を使わず
 * この Worker が直接 theearth-np.com にログイン + JSON POST する。レスポンス形式は
 * issue #14 時点で実データ未検証のため、`VehicleState.locationResolved` で
 * 緯度経度を解決できたかを明示する (推測が外れていても raw で確認できる)。
 */
import type { H3Event } from "h3";
import { getVehicleStates, login, createCookieJar } from "../../utils/theearth-venus-client";
import { resolveDtakoAccount } from "../../utils/dtako-accounts";

function cfEnv(event: H3Event): Record<string, unknown> {
  return (event.context.cloudflare as { env?: Record<string, unknown> } | undefined)?.env ?? {};
}

export default defineEventHandler(async (event) => {
  // requireAuth (server/utils/auth.ts) は introspect 後 event.context.auth に
  // {active, tenant_id, ...} をセットする (@ippoan/auth-client/server の副作用)。
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

  const branchCd = getQuery(event).branch_cd;

  try {
    const jar = createCookieJar();
    await login(jar, { compId: account.compId, userName: account.userName, userPass: account.userPass });
    const states = await getVehicleStates(jar, { branchCd: typeof branchCd === "string" ? branchCd : undefined });
    return { vehicles: states };
  } catch (e) {
    throw createError({
      statusCode: 502,
      statusMessage: e instanceof Error ? e.message : "車両現在地の取得に失敗しました",
    });
  }
});
