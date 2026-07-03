/**
 * `DTAKO_ACCOUNTS` (ohishi-exp/dtako-scraper の Rust 版・ohishi-exp/nuxt-dtako-admin の
 * dtako-scraper-relay DO と同一 JSON shape) を tenant_id で引くヘルパ。
 *
 * theearth-np.com へのログインには comp_id (企業CD) + user_name + user_pass が要るが、
 * この Worker が知っているのは (auth-worker introspect が返す) rust-alc-api の
 * tenant_id だけなので、DTAKO_ACCOUNTS の `tenant_id` フィールドで対応する企業の
 * credential を解決する。
 */

export interface DtakoAccount {
  compId: string;
  userName: string;
  userPass: string;
  tenantId: string;
}

interface DtakoAccountRaw {
  comp_id: string;
  user_name: string;
  user_pass: string;
  tenant_id: string;
}

/** Secrets Store binding (`.get()`) / 文字列 のいずれでも値を取り出す。 */
async function resolveSecret(binding: unknown): Promise<string | null> {
  if (typeof binding === "string") return binding;
  if (binding && typeof (binding as { get?: unknown }).get === "function") {
    return (await (binding as { get(): Promise<string> }).get()) ?? null;
  }
  return null;
}

export async function resolveDtakoAccount(
  dtakoAccountsBinding: unknown,
  tenantId: string,
): Promise<DtakoAccount | null> {
  const raw = await resolveSecret(dtakoAccountsBinding);
  if (!raw) return null;

  let accounts: DtakoAccountRaw[];
  try {
    accounts = JSON.parse(raw);
  } catch {
    console.error("dtako-accounts: DTAKO_ACCOUNTS is not valid JSON");
    return null;
  }

  const found = accounts.find((a) => a.tenant_id === tenantId);
  if (!found) return null;

  return {
    compId: found.comp_id,
    userName: found.user_name,
    userPass: found.user_pass,
    tenantId: found.tenant_id,
  };
}
