function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
  return atob(padded)
}

export function getCurrentViewerId() {
  try {
    const storedUserId = Number(localStorage.getItem('user_id'))
    if (Number.isFinite(storedUserId) && storedUserId > 0) {
      return storedUserId
    }

    const token = localStorage.getItem('access_token')
    if (!token) return null

    const [, payload] = token.split('.')
    if (!payload) return null

    const decoded = JSON.parse(decodeBase64Url(payload)) as { id?: string | number }
    const id = Number(decoded.id)
    return Number.isFinite(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function normalizeViewerId(value: unknown) {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}
