const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,30}$/

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value)
}

export function isValidUsername(value: string): boolean {
  return USERNAME_REGEX.test(value)
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) return 'Password must have at least 8 characters.'
  if (!/[A-Z]/.test(value)) return 'Password must include at least 1 uppercase letter.'
  if (!/[a-z]/.test(value)) return 'Password must include at least 1 lowercase letter.'
  if (!/\d/.test(value)) return 'Password must include at least 1 number.'
  return null
}
