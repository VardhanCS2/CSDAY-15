import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCart } from '@/hooks/use-cart'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
import type { ReactNode } from 'react'

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  useCart()

  useEffect(() => {
    void useAuthStore.getState().initialize()
  }, [])

  useEffect(() => {
    const expireSession = () => {
      useAuthStore.getState().expireSession()
      queryClient.removeQueries({ queryKey: ['cart'] })
    }
    window.addEventListener('session-expired', expireSession)
    return () => window.removeEventListener('session-expired', expireSession)
  }, [queryClient])

  useEffect(() => {
    if (!user) useCartStore.getState().clear()
  }, [user])

  return children
}
