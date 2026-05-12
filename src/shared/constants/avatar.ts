import defaultAvatarSvg from '@/assets/default-avatar.svg'

/**
 * Default avatar image to display when a user has no avatar_url.
 * Import this constant instead of hardcoding URLs across components.
 */
export const DEFAULT_AVATAR: string = defaultAvatarSvg

/**
 * Returns the avatar URL if available, otherwise the default avatar.
 */
export function resolveAvatar(url?: string | null): string {
  return url?.trim() ? url : DEFAULT_AVATAR
}
