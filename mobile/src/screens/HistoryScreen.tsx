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
import { Swipeable } from 'react-native-gesture-handler'
import Toast from 'react-native-toast-message'
import Ionicons from '@expo/vector-icons/Ionicons'
import { trpc } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../theme/colors'

interface SessionListItem {
  id: number
  workoutId: number | null
  createdAt: string
  completedAt: string | null
  sessionTime: string | null
  name?: string
  exerciseCount?: number
  setCount?: number
}

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(session: SessionListItem): string {
  if (session.sessionTime) return session.sessionTime
  if (session.completedAt) {
    const start = new Date(session.createdAt).getTime()
    const end = new Date(session.completedAt).getTime()
    const mins = Math.round((end - start) / 60000)
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `${h}h ${m}m` : `${h}h`
  }
  return '—'
}

function HistoryScreen() {
  const { workoutInfo, isLoading, checkAuth, isAuthenticated, serverDown, checkServerOnFocus } = useAuth()
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const navigation = useNavigation()

  useFocusEffect(
    useCallback(() => {
      checkServerOnFocus()
      if (isAuthenticated) checkAuth({ silent: true })
    }, [checkServerOnFocus, checkAuth, isAuthenticated])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    if (isAuthenticated) await checkAuth()
    setRefreshing(false)
  }

  const handleSessionClick = (session: SessionListItem) => {
    navigation.navigate('SessionDetail' as never, {
      id: session.id,
      initialCreatedAt: session.createdAt,
      initialCompletedAt: session.completedAt ?? undefined,
    } as never)
  }

  const handleDeleteSession = (sessionId: number) => {
    Alert.alert(
      'Are you sure?',
      'This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, delete it!',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingSessionId(sessionId)
              await trpc.sessions.delete.mutate({ id: sessionId })
              await checkAuth({ silent: true })
              Toast.show({ type: 'success', text1: 'Success', text2: 'Session deleted' })
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

  const displaySessions =
    isAuthenticated && workoutInfo
      ? serverDown
        ? workoutInfo.sessions ?? []
        : !isLoading
          ? workoutInfo.sessions ?? []
          : []
      : []

  const hasNoSessions =
    isAuthenticated &&
    (serverDown && workoutInfo ? displaySessions.length === 0 : !isLoading && workoutInfo !== null && displaySessions.length === 0)

  if (serverDown && isAuthenticated && workoutInfo === null) {
    return <View style={[styles.container, { backgroundColor: colors.screen }]} />
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyTitleRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
              <Text style={styles.emptyTitleLoginLink}>Log in</Text>
            </TouchableOpacity>
            <Text style={styles.emptyTitle}> to see your sessions</Text>
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

  const renderRightActions = (sessionId: number) => (
    <TouchableOpacity
      style={styles.swipeDelete}
      onPress={() => handleDeleteSession(sessionId)}
      disabled={deletingSessionId === sessionId}
    >
      <Ionicons name="trash-outline" size={24} color={colors.primaryText} />
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </TouchableOpacity>
  )

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.headerBlock}>
            <Text style={styles.headerSubtitle}>
              {displaySessions.length} session{displaySessions.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {displaySessions.map((session) => (
            <Swipeable
              key={session.id}
              renderRightActions={() => renderRightActions(session.id)}
              friction={2}
              rightThreshold={40}
            >
              <TouchableOpacity
                style={styles.sessionCard}
                onPress={() => handleSessionClick(session)}
                activeOpacity={0.7}
              >
                <View style={styles.sessionCardInner}>
                  <Text style={styles.sessionTitle}>{session.name?.trim() || 'Workout'}</Text>
                  <View style={styles.sessionMetaRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.sessionMetaText}>{formatSessionDate(session.createdAt)}</Text>
                  </View>
                  <View style={styles.sessionMetaRow}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.sessionMetaText}>{formatDuration(session)}</Text>
                  </View>
                  <Text style={styles.sessionSummary}>
                    {session.exerciseCount != null && session.setCount != null
                      ? `${session.exerciseCount} exercise${session.exerciseCount !== 1 ? 's' : ''} • ${session.setCount} set${session.setCount !== 1 ? 's' : ''}`
                      : '— exercises • — sets'}
                  </Text>
                  {!session.completedAt && (
                    <View style={styles.statusChipIncomplete}>
                      <Text style={styles.statusChipIncompleteText}>Incomplete</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </Swipeable>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  headerBlock: {
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    color: colors.text,
    marginBottom: 8,
  },
  emptyTitleLoginLink: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionCardInner: {
    flex: 1,
    marginRight: 8,
  },
  sessionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sessionMetaText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sessionSummary: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  statusChipIncomplete: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.warningBg,
  },
  statusChipIncompleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningText,
  },
  swipeDelete: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  swipeDeleteText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
})

export default HistoryScreen
