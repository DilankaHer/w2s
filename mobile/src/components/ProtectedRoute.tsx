import { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'

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
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4B5563" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  if (!isAuthenticated || error?.message === 'UNAUTHORIZED') {
    return null
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#4B5563',
  },
})
