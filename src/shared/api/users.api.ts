import { http } from '@/shared/api/http';

export interface UserSearchItem {
  id: number;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
}

export interface UserProfileItem {
  id: number;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  created_at: string;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  has_pending_request: boolean;
}

export async function searchUsersApi(username: string, limit = 8): Promise<UserSearchItem[]> {
  const response = await http.get('/users/search', {
    params: {
      username,
      limit,
    },
  });

  return response.data?.data ?? [];
}

export async function getUserProfileApi(userId: number): Promise<UserProfileItem> {
  const response = await http.get(`/users/${userId}`);
  return response.data?.data as UserProfileItem;
}
