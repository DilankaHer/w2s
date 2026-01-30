import { useNavigation } from '@react-navigation/native'
import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, error } = useAuth()
  const navigation = useNavigation()

  useEffect(() => {
    if (!isLoading) {
      // Redirect to login if unauthorized (401) or not authenticated
      if (error?.message === 'UNAUTHORIZED' || !isAuthenticated) {
        navigation.navigate('Login' as never)
      }
    }
  }, [isAuthenticated, isLoading, error, navigation])

  if (isLoading) {
    return null
  }

  if (!isAuthenticated || error?.message === 'UNAUTHORIZED') {
    return null
  }

  return <>{children}</>
}
