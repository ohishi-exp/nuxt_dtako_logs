import { describe, expect, it } from 'vitest'
import { resolveDtakoAccount } from '../../server/utils/dtako-accounts'

const ACCOUNTS_JSON = JSON.stringify([
  { comp_id: '27324455', user_name: 'user1', user_pass: 'pass1', tenant_id: 'tenant-a' },
  { comp_id: '75700192', user_name: 'user2', user_pass: 'pass2', tenant_id: 'tenant-b' },
])

describe('resolveDtakoAccount', () => {
  it('resolves an account by tenant_id from a plain string binding', async () => {
    const account = await resolveDtakoAccount(ACCOUNTS_JSON, 'tenant-b')
    expect(account).toEqual({ compId: '75700192', userName: 'user2', userPass: 'pass2', tenantId: 'tenant-b' })
  })

  it('resolves an account from a Secrets Store style binding (.get())', async () => {
    const binding = { get: async () => ACCOUNTS_JSON }
    const account = await resolveDtakoAccount(binding, 'tenant-a')
    expect(account?.compId).toBe('27324455')
  })

  it('returns null when the binding is unset', async () => {
    expect(await resolveDtakoAccount(undefined, 'tenant-a')).toBeNull()
  })

  it('returns null when no account matches the tenant_id', async () => {
    expect(await resolveDtakoAccount(ACCOUNTS_JSON, 'tenant-z')).toBeNull()
  })

  it('returns null and logs when the binding is not valid JSON', async () => {
    expect(await resolveDtakoAccount('not json', 'tenant-a')).toBeNull()
  })
})
