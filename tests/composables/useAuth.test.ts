import { describe, it, expect } from 'vitest'
import { useAuth, AuthToolbar } from '~/composables/useAuth'

describe('useAuth re-export', () => {
  it('exports useAuth function', () => {
    expect(typeof useAuth).toBe('function')
  })

  it('exports AuthToolbar', () => {
    expect(AuthToolbar).toBeDefined()
  })

  it('useAuth returns token', () => {
    const { token } = useAuth()
    expect(token).toBeDefined()
  })
})
