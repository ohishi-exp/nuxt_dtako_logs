import { ref } from 'vue'

export function useAuth() {
  return { token: ref('mock-token') }
}

export const AuthToolbar = {}
