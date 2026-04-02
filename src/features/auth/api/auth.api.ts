import { http } from '@/shared/api/http'
import axios from 'axios'

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  username: string
  fullName: string
  email: string
  password: string
}

interface LoginResponse {
  accessToken: string
  userId: string
}

interface RegisterResponse {
  userId: string
  message: string
}

interface BackendAuthPayload {
  accessToken?: string
  token?: string
  userId?: string | number
  user_id?: string | number
  message?: string
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

function extractApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const responseMessage = (error.response?.data as { message?: string } | undefined)?.message
    throw new Error(responseMessage || error.message)
  }
  throw error instanceof Error ? error : new Error('Unexpected authentication error.')
}

export async function loginApi(payload: LoginPayload): Promise<LoginResponse> {
  try {
    const response = await http.post('/auth/login', payload)
    const authData = unwrapData<BackendAuthPayload>(response.data)
    const accessToken = authData.accessToken ?? authData.token ?? ''
    const userId = String(authData.userId ?? authData.user_id ?? '')

    if (!accessToken) {
      throw new Error('Login response does not include access token.')
    }

    if (!userId) {
      throw new Error('Login response does not include userId.')
    }

    return {
      accessToken,
      userId,
    }
  } catch (error) {
    extractApiError(error)
  }
}

export async function registerApi(payload: RegisterPayload): Promise<RegisterResponse> {
  try {
    const response = await http.post('/auth/register', {
      username: payload.username,
      email: payload.email,
      password: payload.password,
      full_name: payload.fullName,
    })
    const authData = unwrapData<BackendAuthPayload>(response.data)

    return {
      userId: String(authData.userId ?? authData.user_id ?? ''),
      message: authData.message ?? 'User created successfully',
    }
  } catch (error) {
    extractApiError(error)
  }
}

export async function logoutApi(): Promise<void> {
  await http.post('/auth/logout')
}
