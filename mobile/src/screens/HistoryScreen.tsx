import { useFocusEffect, useNavigation } from '@react-navigation/native'
import React, { useCallback, useState } from 'react'
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { trpc } from '../api/client'
import { useAuth } from '../hooks/useAuth'

interface Session {
  id: number
  workoutId: number | null
  createdAt: string
  completedAt: string | null
  sessionTime: string | null
}

function HistoryScreen() {
  const { workoutInfo, isLoading, checkAuth, isAuthenticated, serverDown, checkServerOnFocus } = useAuth()
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const navigation = useNavigation()

  useFocusEffect(
    useCallback(() => {
      checkServerOnFocus()
    }, [checkServerOnFocus])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    if (isAuthenticated) {
      await checkAuth()
    }
    setRefreshing(false)
  }

  const handleSessionClick = (sessionItem: { id: number; createdAt: string }) => {
    navigation.navigate('SessionDetail' as never, {
      id: sessionItem.id,
      initialCreatedAt: sessionItem.createdAt,
    } as never)
  }

  const handleDeleteSession = (sessionId: number) => {
    Alert.alert(
      'Are you sure?',
      'This action cannot be undone!',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, delete it!',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingSessionId(sessionId)
              await trpc.sessions.delete.mutate({ id: sessionId })
              await checkAuth({ silent: true })
              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Session deleted',
              })
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete session. Please try again.',
              })
            } finally {
              setDeletingSessionId(null)
            }
          },
        },
      ]
    )
  }

  const displaySessions = isAuthenticated && workoutInfo
    ? (serverDown ? (workoutInfo.sessions ?? []) : !isLoading ? (workoutInfo.sessions ?? []) : [])
    : []
  const hasNoSessions = isAuthenticated
    ? (serverDown && workoutInfo ? displaySessions.length === 0 : !isLoading && workoutInfo !== null && displaySessions.length === 0)
    : true

  if (serverDown && isAuthenticated && workoutInfo === null) {
    return <View style={[styles.container, { backgroundColor: '#fff' }]} />
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyTitleRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
              <Text style={styles.emptyTitleLoginLink}>Log in</Text>
            </TouchableOpacity>
            <Text style={styles.emptyTitle}> to see your history</Text>
          </View>
          <Text style={styles.emptyText}>
            Your workout sessions will appear here once you log in and complete workouts.
          </Text>
        </View>
      </View>
    )
  }

  if (isLoading && !(serverDown && isAuthenticated && workoutInfo !== null)) {
    return <View style={styles.container} />
  }

  return (
    <View style={styles.container}>
      {hasNoSessions ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Sessions Yet</Text>
          <Text style={styles.emptyText}>
            Your workout sessions will appear here once you start tracking workouts.
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {displaySessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <TouchableOpacity
                style={styles.sessionContent}
                onPress={() => handleSessionClick(session)}
              >
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionDate}>
                    {new Date(session.createdAt).toLocaleString()}
                  </Text>
                  {session.sessionTime && (
                    <Text style={styles.sessionTime}>• {session.sessionTime}</Text>
                  )}
                </View>
                {session.completedAt ? (
                  <Text style={styles.completedText}>
                    Completed: {new Date(session.completedAt).toLocaleString()}
                  </Text>
                ) : (
                  <Text style={styles.inProgressText}>In Progress</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSession(session.id)}
                disabled={deletingSessionId === session.id}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyTitleLoginLink: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionContent: {
    flex: 1,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  sessionTime: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  completedText: {
    fontSize: 14,
    color: '#059669',
    marginTop: 4,
  },
  inProgressText: {
    fontSize: 14,
    color: '#D97706',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 24,
    color: '#DC2626',
    fontWeight: 'bold',
  },
})

export default HistoryScreen
