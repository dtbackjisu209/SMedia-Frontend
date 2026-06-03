export interface ProfileSearchUser {
  id: number
  username: string
  full_name: string | null
  avatar_url: string | null
  is_private: boolean
}

export interface ProfilePostMedia {
  media_url: string
  media_type: 'image' | 'video'
  position: number
}

export interface ProfilePost {
  id: number
  caption: string | null
  location: string | null
  created_at: string
  like_count: number
  comment_count: number
  media_count: number
  thumbnail: string | null
  media: ProfilePostMedia[]
}

export interface ProfileHighlightStory {
  id: number
  media_url: string
  media_type: 'image' | 'video'
  created_at: string
  expires_at: string
}

export interface ProfileHighlight {
  id: number
  title: string
  cover_media_url: string | null
  created_at: string
  story_count: number
  stories: ProfileHighlightStory[]
}

export interface ProfileView {
  id: number
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  is_private: boolean
  created_at: string
  follower_count: number
  following_count: number
  post_count: number
  is_following: boolean
  has_pending_request: boolean
  highlights: ProfileHighlight[]
  posts: ProfilePost[]
}

export interface ProfileUpdatePayload {
  username?: string
  full_name?: string | null
  bio?: string | null
  avatar_url?: string | null
  is_private?: boolean
}

export interface ProfilePasswordPayload {
  current_password: string
  new_password: string
}
