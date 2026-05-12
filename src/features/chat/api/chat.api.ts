import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

export type ChatSearchUser = {
  id: number
  username: string
  full_name: string | null
  avatar_url: string | null
}

export type ChatGroupCandidate = ChatSearchUser

export type ChatConversationSettingsInput = {
  requesterId: number
  nickname?: string | null
  muteMode?: '1h' | '8h' | '24h' | 'forever' | 'unmute'
}

export const chatApi = {
  getUserConversations: (userId: number) =>
    http.get(`/conversations/user/${userId}`).then((r) => r.data.data),

  getOrCreatePrivateChat: (myId: number, targetUserId: number) =>
    http.post('/conversations/private', { myId, targetUserId }).then((r) => r.data.data),

  createGroupChat: (name: string, memberIds: number[]) =>
    http.post('/conversations/group', { name, memberIds }).then((r) => r.data.data),

  getMessages: (conversationId: string | number, viewerUserId?: number, limit = 50, page = 1) =>
    http
      .get(`/conversations/${conversationId}/messages`, {
        params: { limit, page, viewerUserId },
      })
      .then((r) => r.data.data),

  getMembers: (conversationId: string | number) =>
    http.get(`/conversations/${conversationId}/members`).then((r) => r.data.data),

  inviteMember: (conversationId: string | number, userId: number, requesterId: number) =>
    http.post(`/conversations/${conversationId}/members`, { userId, requesterId }).then((r) => r.data.data),

  removeMember: (conversationId: string | number, userId: number, requesterId: number) =>
    http.delete(`/conversations/${conversationId}/members/${userId}`, { params: { requesterId } }).then((r) => r.data.data),

  updateConversationSettings: (conversationId: string | number, payload: ChatConversationSettingsInput) =>
    http.patch(`/conversations/${conversationId}/settings`, payload).then((r) => r.data.data),

  searchUsers: (keyword: string, excludeUserId?: number) =>
    http
      .get('/conversations/search-users', {
        params: {
          keyword,
          excludeUserId,
        },
      })
      .then((r) => r.data.data as ChatSearchUser[]),

  getGroupCandidates: (userId: number) =>
    http.get('/conversations/group-candidates', { params: { userId } }).then((r) => r.data.data as ChatGroupCandidate[]),
}
