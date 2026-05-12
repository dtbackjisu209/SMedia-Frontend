export interface ProfileSearchItem {
  id: number
  username: string
  full_name: string | null
  avatar_url: string | null
  is_private: boolean
}

export interface ProfileMediaItem {
  media_url: string
  media_type: 'image' | 'video'
  position: number
}

export interface ProfilePostItem {
  id: number
  caption: string | null
  location: string | null
  created_at: string
  like_count: number
  comment_count: number
  media_count: number
  thumbnail: string | null
  media: ProfileMediaItem[]
}

export interface ProfileViewItem {
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
  posts: ProfilePostItem[]
}

export interface ProfileUpdateInput {
  username?: string
  full_name?: string | null
  bio?: string | null
  avatar_url?: string | null
  is_private?: boolean
}

export interface ProfilePasswordChangeInput {
  current_password: string
  new_password: string
}
