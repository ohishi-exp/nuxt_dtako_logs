/**
 * DVR 動画通知一覧 (VenusBridgeService `Monitoring_DvrNotification2`)。
 * Refs ohishi-exp/browser-render-rust#14 (実機トレース済み)。
 */
import type { H3Event } from "h3";
import { getDvrNotifications, login, createCookieJar } from "../../utils/theearth-venus-client";
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

  try {
    const jar = createCookieJar();
    await login(jar, { compId: account.compId, userName: account.userName, userPass: account.userPass });
    const notifications = await getDvrNotifications(jar);
    return { notifications };
  } catch (e) {
    throw createError({
      statusCode: 502,
      statusMessage: e instanceof Error ? e.message : "DVR 動画通知の取得に失敗しました",
    });
  }
});
