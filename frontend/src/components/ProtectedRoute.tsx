import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, error } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading) {
      // Redirect to login if unauthorized (401) or not authenticated
      if (error?.message === 'UNAUTHORIZED' || !isAuthenticated) {
        navigate('/login')
      }
    }
  }, [isAuthenticated, isLoading, error, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || error?.message === 'UNAUTHORIZED') {
    return null
  }

  return <>{children}</>
}
