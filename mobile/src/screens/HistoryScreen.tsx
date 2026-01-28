import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { useNavigation, useIsFocused } from '@react-navigation/native'
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
  const { workoutInfo, isLoading, checkAuth } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const navigation = useNavigation()
  const isFocused = useIsFocused()
  const lastRefreshRef = useRef<number>(0)

  // Refresh when screen comes into focus (but not too frequently)
  useEffect(() => {
    if (isFocused) {
      const now = Date.now()
      // Only refresh if it's been more than 1 second since last refresh
      if (now - lastRefreshRef.current > 1000) {
        lastRefreshRef.current = now
        checkAuth()
      }
    }
  }, [isFocused, checkAuth])

  useEffect(() => {
    if (!isLoading) {
      if (workoutInfo) {
        const sessionsData = workoutInfo.sessions || []
        console.log('HistoryScreen - workoutInfo:', workoutInfo)
        console.log('HistoryScreen - sessions array:', sessionsData)
        console.log('HistoryScreen - sessions length:', sessionsData.length)
        setSessions(sessionsData)
      } else {
        console.log('HistoryScreen - no workoutInfo')
        setSessions([])
      }
    }
  }, [workoutInfo, isLoading])

  const onRefresh = async () => {
    setRefreshing(true)
    await checkAuth()
    setRefreshing(false)
  }

  const handleSessionClick = (id: number) => {
    navigation.navigate('SessionDetail' as never, { id } as never)
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
              setSessions((prev) => prev.filter((s) => s.id !== sessionId))
              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Session deleted',
              })
            } catch (err) {
              console.error('Error deleting session:', err)
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err instanceof Error ? err.message : 'Failed to delete session',
              })
            } finally {
              setDeletingSessionId(null)
            }
          },
        },
      ]
    )
  }

  // Only show "No sessions yet" if we're not loading, workoutInfo has been loaded, and there are no sessions
  const hasNoSessions = !isLoading && workoutInfo !== null && (!sessions || sessions.length === 0)

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
          {sessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <TouchableOpacity
                style={styles.sessionContent}
                onPress={() => handleSessionClick(session.id)}
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
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
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
