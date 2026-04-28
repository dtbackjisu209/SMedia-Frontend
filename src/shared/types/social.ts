export interface User {
  id: string
  username: string
  fullName: string
  email: string
  avatarUrl?: string
}

export interface Post {
  id: string
  caption: string
  location: string
  createdAt: string
  author: {
    id: string
    username: string
    fullName: string
    avatarUrl: string
  }
  isLiked: boolean
  likeCount: number
  commentCount: number
  tags: string[]
  thumbnail: string
  mediaCount: number
  media: Array<{
    mediaUrl: string
    mediaType: 'image' | 'video'
    position: number
  }>
}

export interface NotificationItem {
  id: string
  type: string
  content: string
  referenceId?: string | null
  createdAt: string
  read: boolean
  targetPath: string | null
  kindLabel: string
}

export interface ChatMessage {
  id: string
  senderName: string
  content: string
  createdAt: string
}

export interface ChatThread {
  id: string
  participantName: string
  lastMessage: string
}
