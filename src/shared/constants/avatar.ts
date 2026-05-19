import defaultAvatarSvg from '@/assets/default-avatar.svg'

/**
 * Default avatar image to display when a user has no avatar_url.
 * Import this constant instead of hardcoding URLs across components.
 */
export const DEFAULT_AVATAR: string = defaultAvatarSvg

/**
 * Reject browser-blocked local filesystem paths such as file:///C:/... or C:\...
 */
export function sanitizeBrowserAssetUrl(url?: string | null): string | null {
  const value = url?.trim()
  if (!value) return null

  if (/^file:/i.test(value)) return null
  if (/^[a-zA-Z]:[\\/]/.test(value)) return null
  if (/^\\\\/.test(value)) return null

  return value
}

/**
 * Returns the avatar URL if available, otherwise the default avatar.
 */
export function resolveAvatar(url?: string | null): string {
  return sanitizeBrowserAssetUrl(url) ?? DEFAULT_AVATAR
}

/**
 * Returns a safe media URL for browser rendering.
 */
export function resolveMediaUrl(url?: string | null): string {
  return sanitizeBrowserAssetUrl(url) ?? ''
}
