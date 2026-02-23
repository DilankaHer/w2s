import { useFocusEffect, useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useState } from 'react'
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
import type { Session } from '@shared/types/sessions.types'
import { deleteSessionService, getSessionsService } from '../services/sessions.service'
import { colors } from '../theme/colors'

type SessionListItem = Session & {
  completedAt?: string | null
  sessionTime?: string | null
  exerciseCount?: number
  setCount?: number
  isFromDefaultWorkout?: boolean
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

function SessionScreen() {
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const navigation = useNavigation()

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getSessionsService()
      setSessions((Array.isArray(data) ? data : []) as SessionListItem[])
    } catch (err) {
      setSessions([])
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err instanceof Error ? err.message : 'Failed to load sessions',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useFocusEffect(
    useCallback(() => {
      loadSessions()
    }, [loadSessions])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    loadSessions()
  }

  const handleSessionClick = (session: SessionListItem) => {
    ;(navigation as any).navigate('SessionDetail', {
      id: session.id,
      initialCreatedAt: session.createdAt,
      initialCompletedAt: session.completedAt ?? undefined,
    })
  }

  const handleDeleteSession = (sessionId: string) => {
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
              const msg = await deleteSessionService(sessionId)
              await loadSessions()
              Toast.show({ type: 'success', text1: 'Success', text2: msg })
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err instanceof Error ? err.message : 'Failed to delete session. Please try again.',
              })
            } finally {
              setDeletingSessionId(null)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return <View style={styles.container} />
  }

  const hasNoSessions = sessions.length === 0

  const renderRightActions = (sessionId: string) => (
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
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {sessions.map((session) => (
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
                  <View style={styles.sessionTitleRow}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {session.name?.trim() || 'Workout'}
                    </Text>
                    {session.isFromDefaultWorkout ? (
                      <View style={styles.defaultTag}>
                        <Text style={styles.defaultTagText}>Default</Text>
                      </View>
                    ) : (
                      <View style={styles.customTag}>
                        <Text style={styles.customTagText}>Custom</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.sessionMetaRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.sessionMetaText}>{formatSessionDate(session.createdAt)}</Text>
                  </View>
                  <View style={styles.sessionMetaRow}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.sessionMetaText}>{formatDuration(session)}</Text>
                  </View>
                  <Text style={styles.sessionSummary}>
                    {`${session.exerciseCount ?? 0} exercise${(session.exerciseCount ?? 0) !== 1 ? 's' : ''} • ${session.setCount ?? 0} set${(session.setCount ?? 0) !== 1 ? 's' : ''}`}
                  </Text>
                  {!session.completedAt && (
                    <View style={styles.statusChipIncomplete}>
                      <Text style={styles.statusChipIncompleteText}>Incomplete</Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name="chevron-back-outline"
                  size={18}
                  color={colors.error}
                  style={styles.swipeHintIcon}
                />
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
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sessionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  defaultTag: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentText,
  },
  customTag: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  customTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentText,
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
  swipeHintIcon: {
    opacity: 0.4,
  },
})

export default SessionScreen

