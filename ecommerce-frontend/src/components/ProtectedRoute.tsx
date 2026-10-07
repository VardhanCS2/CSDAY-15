import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { token, user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <main className="route-loading">Loading your account...</main>
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}