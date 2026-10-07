import axios from 'axios'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { ApiEnvelope } from '@/types/models'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { Accept: 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('access_token')) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.dispatchEvent(new Event('session-expired'))
    }
    return Promise.reject(error)
  },
)

export function responseData<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  return response.data.data
}

export function errorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Something went wrong.'
  }
  const responseError = error as AxiosError<{ detail?: unknown; message?: string }>
  const detail = responseError.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map((item: unknown) => {
      if (typeof item === 'object' && item !== null && 'msg' in item && typeof item.msg === 'string') return item.msg
      return 'Invalid request.'
    }).join(', ')
  }
  if (typeof detail === 'string') return detail
  return responseError.response?.data?.message || responseError.message || 'Something went wrong.'
}