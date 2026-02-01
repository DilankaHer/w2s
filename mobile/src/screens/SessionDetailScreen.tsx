import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import type { RootStackParamList } from '../../App'
import { trpc } from '../api/client'
import { getApiErrorMessage } from '../api/errorMessage'
import { useAuth } from '../hooks/useAuth'
import type { Session, SessionSet } from '../types'

type SessionDetailRouteProp = RouteProp<RootStackParamList, 'SessionDetail'>

// Helper function to map session data
const mapSessionData = (sessionData: any): Session | null => {
  if (!sessionData) return null
  try {
    return {
      id: sessionData.id,
      name: sessionData.name,
      createdAt: sessionData.createdAt,
      completedAt: sessionData.completedAt,
      workoutId: sessionData.workoutId ?? undefined,
      sessionTime: sessionData.sessionTime ?? undefined,
      sessionExercises: (sessionData.sessionExercises || []).map((se: any) => ({
        id: se.id,
        order: se.order,
        exercise: se.exercise,
        sets: (se.sessionSets || se.sets || []).map((set: any) => ({
          id: set.id,
          setNumber: set.setNumber,
          reps: set.reps ?? set.targetReps ?? 0,
          weight: set.weight ?? set.targetWeight ?? 0,
          isCompleted: set.isCompleted ?? false,
        })),
      })),
    }
  } catch (err) {
    console.error('Error mapping session data:', err)
    return null
  }
}

function SessionDetailScreen() {
  const route = useRoute<SessionDetailRouteProp>()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { checkAuth, isAuthenticated } = useAuth()
  const { id, initialSession: initialSessionParam, initialCreatedAt: initialCreatedAtParam } = route.params
  const [session, setSession] = useState<Session | null>(() =>
    initialSessionParam ? mapSessionData(initialSessionParam) : null
  )
  const [loading, setLoading] = useState(() => !initialSessionParam)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(() => {
    const s = initialSessionParam ? mapSessionData(initialSessionParam) : null
    if (s && !s.completedAt) {
      return Math.max(0, Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 1000))
    }
    if (initialCreatedAtParam) {
      return Math.max(0, Math.floor((Date.now() - new Date(initialCreatedAtParam).getTime()) / 1000))
    }
    return 0
  })
  const [deleting, setDeleting] = useState(false)
  const [startingNew, setStartingNew] = useState(false)
  const [editingSets, setEditingSets] = useState<Map<number, { reps: number; weight: number }>>(new Map())
  const [showCompletionSummary, setShowCompletionSummary] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [templateErrorSource, setTemplateErrorSource] = useState<'update' | 'create' | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateSuccess, setTemplateSuccess] = useState(false)
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  useEffect(() => {
    if (!id) return
    if (initialSessionParam && mapSessionData(initialSessionParam)) return
    fetchSession(id)
  }, [id, initialSessionParam])

  const fetchSession = async (sessionId: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await trpc.sessions.getById.query({ id: sessionId })
      if (!data) {
        setError('Session not found')
        return
      }
      const mappedSession = mapSessionData(data)
      if (mappedSession) {
        setSession(mappedSession)
      } else {
        setError('Failed to process session data')
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'An error occurred'))
      console.error('Error fetching session:', err)
    } finally {
      setLoading(false)
    }
  }

  // Timer effect: run when we have session (and not completed) or when loading with initialCreatedAt (e.g. from History)
  useEffect(() => {
    if (session?.completedAt) {
      const startTime = new Date(session.createdAt).getTime()
      const endTime = new Date(session.completedAt).getTime()
      setElapsedTime(Math.max(0, Math.floor((endTime - startTime) / 1000)))
      return
    }

    const startTimeMs = session
      ? new Date(session.createdAt).getTime()
      : initialCreatedAtParam
        ? new Date(initialCreatedAtParam).getTime()
        : null

    if (startTimeMs === null) return

    const updateElapsed = () => {
      setElapsedTime(Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000)))
    }
    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [session, initialCreatedAtParam])

  const toggleSetComplete = async (set: SessionSet) => {
    const newIsCompleted = !set.isCompleted
    try {
      await trpc.sessions.updateSessionSets.mutate({
        setId: set.id,
        setNumber: set.setNumber,
        isCompleted: newIsCompleted,
      })

      setSession((prev) => {
        if (!prev) return null
        return {
          ...prev,
          sessionExercises: prev.sessionExercises.map((se) => ({
            ...se,
            sets: se.sets.map((s) =>
              s.id === set.id
                ? { ...s, isCompleted: newIsCompleted }
                : s
            ),
          })),
        }
      })
    } catch (err) {
      console.error('Error updating set completion:', err)
      setError(getApiErrorMessage(err, 'Failed to update set completion'))
    }
  }

  const initializeEditingSet = (set: SessionSet) => {
    setEditingSets((prev) => {
      if (!prev.has(set.id)) {
        const newMap = new Map(prev)
        newMap.set(set.id, {
          reps: set.reps ?? 0,
          weight: set.weight ?? 0,
        })
        return newMap
      }
      return prev
    })
  }

  const updateSetValue = (setId: number, field: 'reps' | 'weight', value: number) => {
    setEditingSets((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(setId)
      if (!current) {
        const set = session?.sessionExercises
          .flatMap(se => se.sets)
          .find(s => s.id === setId)
        newMap.set(setId, {
          reps: set?.reps ?? 0,
          weight: set?.weight ?? 0,
          [field]: value,
        })
      } else {
        newMap.set(setId, { ...current, [field]: value })
      }
      return newMap
    })
  }

  const saveSetUpdate = async (set: SessionSet) => {
    const edited = editingSets.get(set.id)
    if (!edited) return

    try {
      await trpc.sessions.updateSessionSets.mutate({
        setId: set.id,
        setNumber: set.setNumber,
        reps: edited.reps,
        weight: edited.weight,
        isCompleted: set.isCompleted,
      })

      setSession((prev) => {
        if (!prev) return null
        return {
          ...prev,
          sessionExercises: prev.sessionExercises.map((se) => ({
            ...se,
            sets: se.sets.map((s) =>
              s.id === set.id
                ? {
                    ...s,
                    reps: edited.reps,
                    weight: edited.weight,
                  }
                : s
            ),
          })),
        }
      })

      setEditingSets((prev) => {
        const newMap = new Map(prev)
        newMap.delete(set.id)
        return newMap
      })
    } catch (err) {
      console.error('Error updating set:', err)
      setError(getApiErrorMessage(err, 'Failed to update set'))
    }
  }

  const handleCompleteWorkout = async () => {
    if (!session) return

    if (!isAuthenticated) {
      Alert.alert(
        'Save session?',
        'To save this session to your history, log in. Proceed without logging in? This session will not be saved.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: "Don't save",
            style: 'destructive',
            onPress: async () => {
              try {
                setCompleting(true)
                await trpc.sessions.delete.mutate({ id: session.id })
                navigation.navigate('MainTabs' as never)
              } catch (err) {
                console.error('Error deleting session:', err)
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to delete session. Please try again.',
                })
              } finally {
                setCompleting(false)
              }
            },
          },
          {
            text: 'Log in',
            onPress: () => {
              navigation.navigate('Login' as never, {
                completeSessionId: session.id,
                sessionCreatedAt: session.createdAt,
              } as never)
            },
          },
        ]
      )
      return
    }

    try {
      setCompleting(true)
      setError(null)

      const updatedSession = await trpc.sessions.update.mutate({
        id: session.id,
        createdAt: new Date(session.createdAt),
        completedAt: new Date(),
      })

      const mappedSession = mapSessionData(updatedSession)
      if (mappedSession) {
        setSession(mappedSession)
      }
      setShowCompletionSummary(true)
      await checkAuth()
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Workout completed and saved.',
      })
    } catch (err) {
      console.error('Error completing workout:', err)
      setError(getApiErrorMessage(err, 'Failed to complete workout'))
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to complete workout. Please try again.',
      })
    } finally {
      setCompleting(false)
    }
  }

  const handleCancelWorkout = () => {
    if (!session) return

    Alert.alert(
      'Cancel Workout?',
      'Are you sure you want to cancel this workout? This action cannot be undone!',
      [
        {
          text: 'No, keep it',
          style: 'cancel',
        },
        {
          text: 'Yes, cancel it!',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true)
              setError(null)
              await trpc.sessions.delete.mutate({ id: session.id })
              // Refresh workout info to update sessions list
              await checkAuth()
              navigation.navigate('MainTabs' as never)
            } catch (err) {
              console.error('Error canceling workout:', err)
              setError(getApiErrorMessage(err, 'Failed to cancel workout'))
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const handleStartNewWorkout = async () => {
    if (!session) return

    try {
      setStartingNew(true)
      setError(null)

      const newSession = await trpc.sessions.create.mutate({ sessionId: session.id })

      navigation.navigate('SessionDetail' as never, { id: newSession.id } as never)
    } catch (err) {
      console.error('Error starting new workout:', err)
      setError(getApiErrorMessage(err, 'Failed to start new workout'))
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to start new workout. Please try again.',
      })
    } finally {
      setStartingNew(false)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!session?.workoutId) return
    try {
      setTemplateLoading(true)
      setTemplateError(null)
      setTemplateErrorSource(null)
      await trpc.workouts.updateBySession.mutate({
        sessionId: session.id,
        workoutId: session.workoutId,
      })
      setTemplateSuccess(true)
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Template updated.',
      })
      await checkAuth()
      handleGoToTemplates()
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to update template. Please try again.')
      setTemplateError(msg)
      setTemplateErrorSource('update')
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update template. Please try again.',
      })
    } finally {
      setTemplateLoading(false)
    }
  }

  const handleCreateTemplatePress = () => {
    setNewTemplateName(session?.name ?? '')
    setTemplateError(null)
    setShowCreateTemplateModal(true)
  }

  const handleCreateTemplateConfirm = async () => {
    if (!session || !newTemplateName.trim()) return
    try {
      setTemplateLoading(true)
      setTemplateError(null)
      setTemplateErrorSource(null)
      await trpc.workouts.createBySession.mutate({
        sessionId: session.id,
        name: newTemplateName.trim(),
      })
      setTemplateSuccess(true)
      setShowCreateTemplateModal(false)
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Template created.',
      })
      await checkAuth()
      handleGoToTemplates()
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to create template. Please try again.')
      setTemplateError(msg)
      setTemplateErrorSource('create')
      setShowCreateTemplateModal(false)
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create template. Please try again.',
      })
    } finally {
      setTemplateLoading(false)
    }
  }

  const handleGoToTemplates = () => {
    navigation.navigate('MainTabs' as never, { screen: 'Templates' } as never)
  }

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds))
    const hrs = Math.floor(s / 3600)
    const mins = Math.floor((s % 3600) / 60)
    const secs = s % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Only show error if we're not loading
  if (!loading && error && !session) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    )
  }

  // Only show "Session not found" if we're not loading and there's no session
  if (!loading && !session) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    )
  }

  // Show nothing while loading unless we have initialCreatedAt (then show timer immediately)
  if (loading && !session) {
    if (initialCreatedAtParam) {
      return (
        <View style={styles.container}>
          <View style={[styles.headerCard, styles.loadingHeader]}>
            <Text style={styles.loadingText}>Loading session…</Text>
            <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
          </View>
        </View>
      )
    }
    return null
  }

  const allSets = session.sessionExercises.flatMap((ex) => ex.sets)
  const completedCount = allSets.filter(s => s.isCompleted).length

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <Text style={styles.sessionName}>{session.name}</Text>
            <Text style={styles.sessionDate}>
              Session started: {new Date(session.createdAt).toLocaleString()}
            </Text>
            {session.completedAt && (
              <Text style={styles.completedDate}>
                Completed: {new Date(session.completedAt).toLocaleString()}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {!session.completedAt && (
              <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
            )}
            {session.completedAt && !showCompletionSummary && (
              <TouchableOpacity
                style={styles.performAgainButton}
                onPress={handleStartNewWorkout}
                disabled={startingNew}
              >
                <Text style={styles.performAgainButtonText}>Perform Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        )}

        {session.sessionExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercises in this workout</Text>
          </View>
        ) : (
          <View style={styles.exercisesContainer}>
            {session.sessionExercises.map((sessionExercise) => (
              <View key={sessionExercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>
                  {sessionExercise.order + 1}. {sessionExercise.exercise.name}
                </Text>

                {sessionExercise.sets.length === 0 ? (
                  <Text style={styles.noSetsText}>No sets configured</Text>
                ) : (
                  <View style={styles.setsContainer}>
                    <View style={styles.tableHeader}>
                      <Text style={styles.tableHeaderText}>Set</Text>
                      <Text style={styles.tableHeaderText}>Weight (kg)</Text>
                      <Text style={styles.tableHeaderText}>Reps</Text>
                      {!session.completedAt && (
                        <Text style={styles.tableHeaderText}>Complete</Text>
                      )}
                    </View>
                    {sessionExercise.sets.map((set) => {
                      const edited = editingSets.get(set.id)
                      const displayWeight = edited?.weight ?? set.weight ?? 0
                      const displayReps = edited?.reps ?? set.reps ?? 0

                      return (
                        <View
                          key={set.id}
                          style={[
                            styles.setRow,
                            set.isCompleted && styles.completedSetRow,
                          ]}
                        >
                          <Text style={styles.setNumber}>{set.setNumber}</Text>
                          {!session.completedAt ? (
                            <TextInput
                              style={styles.setInput}
                              value={displayWeight === 0 ? '' : displayWeight.toString()}
                              onFocus={() => initializeEditingSet(set)}
                              onChangeText={(text) => {
                                const val = text === '' ? 0 : parseFloat(text) || 0
                                updateSetValue(set.id, 'weight', val)
                              }}
                              onBlur={() => {
                                const edited = editingSets.get(set.id)
                                if (edited) {
                                  saveSetUpdate(set)
                                }
                              }}
                              keyboardType="numeric"
                              placeholder="0"
                            />
                          ) : (
                            <Text style={styles.setValue}>{set.weight ?? 0}</Text>
                          )}
                          {!session.completedAt ? (
                            <TextInput
                              style={styles.setInput}
                              value={displayReps === 0 ? '' : displayReps.toString()}
                              onFocus={() => initializeEditingSet(set)}
                              onChangeText={(text) => {
                                const val = text === '' ? 0 : parseInt(text) || 0
                                updateSetValue(set.id, 'reps', val)
                              }}
                              onBlur={() => {
                                const edited = editingSets.get(set.id)
                                if (edited) {
                                  saveSetUpdate(set)
                                }
                              }}
                              keyboardType="numeric"
                              placeholder="0"
                            />
                          ) : (
                            <Text style={styles.setValue}>{set.reps ?? 0}</Text>
                          )}
                          {!session.completedAt && (
                            <Switch
                              value={set.isCompleted}
                              onValueChange={() => toggleSetComplete(set)}
                              trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                              thumbColor="#fff"
                            />
                          )}
                        </View>
                      )
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {!session.completedAt && (
          <View style={[styles.actionButtons, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={[styles.cancelButton, (deleting || completing) && styles.buttonDisabled]}
              onPress={handleCancelWorkout}
              disabled={deleting || completing}
            >
              <Text style={styles.cancelButtonText}>Cancel Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeButton, (completing || deleting) && styles.buttonDisabled]}
              onPress={handleCompleteWorkout}
              disabled={completing || deleting}
            >
              <Text style={styles.completeButtonText}>
                {completedCount > 0
                  ? `Complete Workout (${completedCount}/${allSets.length})`
                  : 'Complete Workout'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {session.completedAt && showCompletionSummary && (
          <View style={[styles.summaryBlock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.summaryTitle}>Session summary</Text>
            <Text style={styles.summaryName}>{session.name}</Text>
            <Text style={styles.summaryMeta}>
              Duration: {session.sessionTime ?? (session.completedAt && session.createdAt
                ? formatTime(Math.floor((new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime()) / 1000))
                : formatTime(elapsedTime))}
            </Text>
            <Text style={styles.summaryMeta}>
              {session.sessionExercises.length} exercise(s), {allSets.filter(s => s.isCompleted).length}/{allSets.length} sets completed
            </Text>
            {templateError && (
              <View style={styles.templateErrorBox}>
                <Text style={styles.templateErrorText}>{templateError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={
                    templateErrorSource === 'create'
                      ? () => setShowCreateTemplateModal(true)
                      : handleUpdateTemplate
                  }
                  disabled={templateLoading}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            {templateSuccess && (
              <Text style={styles.templateSuccessText}>Template {session.workoutId != null ? 'updated' : 'created'}.</Text>
            )}
            <View style={styles.summaryButtons}>
              {session.workoutId != null && (
                <TouchableOpacity
                  style={[styles.templateActionButton, templateLoading && styles.buttonDisabled]}
                  onPress={handleUpdateTemplate}
                  disabled={templateLoading}
                >
                  {templateLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.templateActionButtonText}>Update Template</Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.templateActionButton, templateLoading && styles.buttonDisabled]}
                onPress={handleCreateTemplatePress}
                disabled={templateLoading}
              >
                {templateLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.templateActionButtonText}>Create Template</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.goToTemplatesButton}
                onPress={handleGoToTemplates}
              >
                <Text style={styles.goToTemplatesButtonText}>Go to Templates</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {session.completedAt && !showCompletionSummary && (
          <View style={styles.completedMessage}>
            <Text style={styles.completedMessageText}>Workout completed!</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showCreateTemplateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateTemplateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New template name</Text>
            <TextInput
              style={styles.modalInput}
              value={newTemplateName}
              onChangeText={setNewTemplateName}
              placeholder="Template name"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCreateTemplateModal(false)
                  setTemplateError(null)
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, (!newTemplateName.trim() || templateLoading) && styles.buttonDisabled]}
                onPress={handleCreateTemplateConfirm}
                disabled={!newTemplateName.trim() || templateLoading}
              >
                {templateLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  errorContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingHeader: {
    margin: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerContent: {
    marginBottom: 8,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  sessionName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  sessionDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  completedDate: {
    fontSize: 14,
    color: '#059669',
    marginTop: 4,
  },
  timer: {
    fontSize: 24,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#374151',
  },
  performAgainButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  performAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBoxText: {
    color: '#DC2626',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  exercisesContainer: {
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  noSetsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  setsContainer: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  completedSetRow: {
    backgroundColor: '#ECFDF5',
  },
  setNumber: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  setValue: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  completedMessage: {
    marginTop: 24,
    alignItems: 'center',
  },
  completedMessageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
  },
  summaryBlock: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  summaryName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  summaryMeta: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  templateErrorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  templateErrorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  templateSuccessText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginTop: 8,
  },
  summaryButtons: {
    marginTop: 16,
    gap: 12,
  },
  templateActionButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  templateActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  goToTemplatesButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  goToTemplatesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  modalConfirmButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default SessionDetailScreen
