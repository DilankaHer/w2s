import { useNavigation } from '@react-navigation/native'
import React, { useState } from 'react'
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { trpc } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../theme/colors'

interface Session {
  id: number
  workoutId: number | null
  createdAt: string
  completedAt: string | null
  sessionTime: string | null
}

function LandingScreen() {
  const { workoutInfo, isLoading, checkAuth } = useAuth()
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)
  const navigation = useNavigation()

  // Only derive lists after API has finished (avoids flash of empty state)
  const templates = !isLoading && workoutInfo ? (workoutInfo.workouts ?? []) : []
  const sessions = !isLoading && workoutInfo ? (workoutInfo.sessions ?? []) : []
  const displayedSessions = showAllSessions ? sessions : sessions.slice(0, 5)

  const handleTemplateClick = (id: number) => {
    navigation.navigate('TemplateDetail' as never, { id } as never)
  }

  const handleSessionClick = (sessionItem: { id: number; createdAt: string; completedAt: string | null }) => {
    navigation.navigate('SessionDetail' as never, {
      id: sessionItem.id,
      initialCreatedAt: sessionItem.createdAt,
      initialCompletedAt: sessionItem.completedAt ?? undefined,
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
              await checkAuth()
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

  // Only show "Get Started" / empty states after API call is done
  const hasNoWorkoutInfo =
    !isLoading &&
    workoutInfo &&
    (!workoutInfo.workouts || workoutInfo.workouts.length === 0) &&
    (!workoutInfo.sessions || workoutInfo.sessions.length === 0)

  // Don't render content until API call is done (avoids flash)
  if (isLoading) {
    return <View style={[styles.container, styles.content]} />
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {hasNoWorkoutInfo && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Get Started</Text>
          <Text style={styles.infoText}>
            You don't have any workouts or sessions yet. Create your first workout to get started!
          </Text>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => navigation.navigate('CreateTemplate' as never)}
          >
            <Text style={styles.infoButtonText}>Create Your First Workout</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workouts</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateTemplate' as never)}
        >
          <Text style={styles.createButtonText}>Create Workout</Text>
        </TouchableOpacity>
      </View>

      {templates.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No workouts found</Text>
        </View>
      ) : (
        <View style={styles.templatesContainer}>
          {templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => handleTemplateClick(template.id)}
            >
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateDate}>
                Created: {new Date(template.createdAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.sessionsSection}>
        <View style={styles.sessionsHeader}>
          <Text style={styles.sessionsTitle}>Previous Sessions</Text>
          {sessions.length > 5 && (
            <TouchableOpacity onPress={() => setShowAllSessions(!showAllSessions)}>
              <Text style={styles.viewAllText}>
                {showAllSessions ? 'Show Less' : 'View All'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sessions found</Text>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {displayedSessions.map((session) => (
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
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  content: {
    padding: 16,
  },
  infoBox: {
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  infoButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  infoButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  createButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  templatesContainer: {
    marginBottom: 32,
  },
  templateCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  templateName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  templateDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sessionsSection: {
    marginTop: 16,
  },
  sessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  sessionsList: {
    marginTop: 8,
  },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textSecondary,
  },
  sessionTime: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 8,
  },
  completedText: {
    fontSize: 14,
    color: colors.success,
    marginTop: 4,
  },
  inProgressText: {
    fontSize: 14,
    color: colors.warning,
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 24,
    color: colors.error,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
})

export default LandingScreen
