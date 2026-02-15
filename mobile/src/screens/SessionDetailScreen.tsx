import { useFocusEffect } from '@react-navigation/native'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Expo vector-icons types
// @ts-ignore - module resolved at runtime
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import type { RootStackParamList } from '../../App'
import { trpc } from '../api/client'
import { getApiErrorMessage } from '../api/errorMessage'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../theme/colors'
import type { Exercise, Session, SessionExercise, SessionSet } from '../types'
import { buildSessionUpdatePayload } from '../utils/buildSessionUpdatePayload'

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
      isSyncedOnce: sessionData.isSyncedOnce ?? false,
      isFromDefaultTemplate: sessionData.isFromDefaultTemplate ?? false,
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
    return null
  }
}

function SessionDetailScreen() {
  const route = useRoute<SessionDetailRouteProp>()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { checkAuth, isAuthenticated } = useAuth()
  const { id, initialSession: initialSessionParam, initialCreatedAt: initialCreatedAtParam, initialCompletedAt: initialCompletedAtParam, selectedExercise: selectedExerciseParam } = route.params
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
  const [showCompletionSummary, setShowCompletionSummary] = useState(() => {
    // If we're loading a completed session from history, show summary immediately
    return !!initialCompletedAtParam
  })
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [templateErrorSource, setTemplateErrorSource] = useState<'update' | 'create' | null>(null)
  const [templateUpdateLoading, setTemplateUpdateLoading] = useState(false)
  const [templateCreateLoading, setTemplateCreateLoading] = useState(false)
  const [templateSuccess, setTemplateSuccess] = useState(false)
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exercisesLoading, setExercisesLoading] = useState(false)
  const [removedSessionExerciseIds, setRemovedSessionExerciseIds] = useState<number[]>([])
  const [removedSessionSetIds, setRemovedSessionSetIds] = useState<number[]>([])
  const nextTempIdRef = useRef(-1)
  const exercisesFetchedRef = useRef(false)

  useEffect(() => {
    if (!id) return
    if (initialSessionParam && mapSessionData(initialSessionParam)) return
    fetchSession(id)
  }, [id, initialSessionParam])

  // Automatically show completion summary if session is completed when loaded
  useEffect(() => {
    if (session?.completedAt && !showCompletionSummary) {
      setShowCompletionSummary(true)
    }
  }, [session?.completedAt, showCompletionSummary])

  const fetchExercises = async () => {
    try {
      setExercisesLoading(true)
      const data = await trpc.exercises.list.query()
      setExercises(Array.isArray(data) ? data : [])
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: getApiErrorMessage(err, 'Failed to load exercises'),
      })
    } finally {
      setExercisesLoading(false)
    }
  }

  // Pre-fetch exercises when session is loaded so "Add Exercise" uses cached list
  useEffect(() => {
    if (!session || exercisesFetchedRef.current) return
    exercisesFetchedRef.current = true
    fetchExercises()
  }, [session])

  // Handle return from Exercises picker with selected exercise (add locally, no API)
  useFocusEffect(
    useCallback(() => {
      const selected = selectedExerciseParam
      if (!selected || !session) return
      addExerciseToSession(selected)
      ;(navigation as any).setParams({ selectedExercise: undefined })
    }, [selectedExerciseParam, session, navigation])
  )

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

  const addExerciseToSession = (exercise: Exercise) => {
    if (!session) return
    const newOrder = session.sessionExercises.length > 0
      ? Math.max(...session.sessionExercises.map(se => se.order)) + 1
      : 1
    const exerciseTempId = nextTempIdRef.current--
    const firstSetId = nextTempIdRef.current--
    const newSessionExercise: SessionExercise = {
      id: exerciseTempId,
      order: newOrder,
      exercise,
      sets: [
        {
          id: firstSetId,
          setNumber: 1,
          reps: 0,
          weight: 0,
          isCompleted: false,
        },
      ],
    }
    setSession((prev) =>
      prev
        ? {
            ...prev,
            sessionExercises: [...prev.sessionExercises, newSessionExercise],
          }
        : null
    )
    setShowAddExerciseModal(false)
  }

  const openExercisePicker = useCallback(() => {
    if (!session?.id) return
    ;(navigation as any).navigate('ExercisePicker', {
      pickerFor: 'session',
      sessionId: session.id,
    })
  }, [navigation, session?.id])

  const addSetToExercise = (sessionExercise: SessionExercise) => {
    if (!session) return
    const maxSetNumber =
      sessionExercise.sets.length === 0
        ? 0
        : Math.max(...sessionExercise.sets.map((s) => s.setNumber))
    const prevSet = sessionExercise.sets[sessionExercise.sets.length - 1]
    const prevEdited = prevSet ? editingSets.get(prevSet.id) : undefined
    const defaultReps = prevEdited?.reps ?? prevSet?.reps ?? 0
    const defaultWeight = prevEdited?.weight ?? prevSet?.weight ?? 0
    const newSetId = nextTempIdRef.current--
    const newSet: SessionSet = {
      id: newSetId,
      setNumber: maxSetNumber + 1,
      reps: defaultReps,
      weight: defaultWeight,
      isCompleted: false,
    }
    setEditingSets((prev) => {
      const next = new Map(prev)
      next.set(newSetId, { reps: defaultReps, weight: defaultWeight })
      return next
    })
    setSession((prev) => {
      if (!prev) return null
      return {
        ...prev,
        sessionExercises: prev.sessionExercises.map((se) =>
          se.id === sessionExercise.id
            ? { ...se, sets: [...se.sets, newSet] }
            : se
        ),
      }
    })
  }

  const removeExerciseFromSession = (sessionExercise: SessionExercise) => {
    if (sessionExercise.id > 0) {
      setRemovedSessionExerciseIds((prev) => [...prev, sessionExercise.id])
    }
    setSession((prev) => {
      if (!prev) return null
      const filtered = prev.sessionExercises.filter((se) => se.id !== sessionExercise.id)
      return {
        ...prev,
        sessionExercises: filtered.map((se, index) => ({ ...se, order: index + 1 })),
      }
    })
  }

  const removeSetFromSession = (sessionExercise: SessionExercise, set: SessionSet) => {
    if (set.id > 0) {
      setRemovedSessionSetIds((prev) => [...prev, set.id])
    }
    setSession((prev) => {
      if (!prev) return null
      const newSets = sessionExercise.sets.filter((s) => s.id !== set.id).map((s, i) => ({ ...s, setNumber: i + 1 }))
      return {
        ...prev,
        sessionExercises: prev.sessionExercises.map((se) =>
          se.id === sessionExercise.id ? { ...se, sets: newSets } : se
        ),
      }
    })
    setEditingSets((prev) => {
      const next = new Map(prev)
      next.delete(set.id)
      return next
    })
  }

  const saveSetUpdate = (set: SessionSet) => {
    const edited = editingSets.get(set.id)
    if (!edited) return

    // If weight or reps become zero, uncomplete the set
    const shouldUncomplete = edited.reps === 0 || edited.weight === 0

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
                  isCompleted: shouldUncomplete ? false : s.isCompleted,
                }
              : s
          ),
        })),
      }
    })
    // Don't remove from editingSets here: when user moves to the other field (e.g. weight → reps),
    // we'd re-initialize from stale session and the value they just typed would reset.
  }

  const canSetBeCompleted = (set: SessionSet): boolean => {
    const edited = editingSets.get(set.id)
    const weight = edited?.weight ?? set.weight ?? 0
    const reps = edited?.reps ?? set.reps ?? 0
    return weight > 0 && reps > 0
  }

  const toggleSetComplete = (set: SessionSet) => {
    // If trying to complete, check if weight and reps are both > 0
    if (!set.isCompleted && !canSetBeCompleted(set)) {
      return
    }
    
    const newIsCompleted = !set.isCompleted
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
  }

  const handleCompleteWorkout = async () => {
    if (!session) return

    if (!isAuthenticated) {
      // For guests, mark session as completed locally and show summary
      // They can save it later by logging in
      try {
        setCompleting(true)
        const completedAt = new Date()
        setSession((prev) => {
          if (!prev) return null
          return {
            ...prev,
            completedAt: completedAt.toISOString(),
          }
        })
        setShowCompletionSummary(true)
        Toast.show({
          type: 'success',
          text1: 'Workout completed',
          text2: 'Log in to save this session and create workouts.',
        })
      } finally {
        setCompleting(false)
      }
      return
    }

    try {
      setCompleting(true)
      setError(null)

      const payload = buildSessionUpdatePayload(session, new Date(), editingSets, removedSessionExerciseIds, removedSessionSetIds)
      const updatedSession = await trpc.sessions.update.mutate(payload)

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

      ;(navigation as any).navigate('SessionDetail', { id: newSession.id })
    } catch (err) {
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
      setTemplateUpdateLoading(true)
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
        text2: 'Workout updated.',
      })
      await checkAuth()
      handleGoToTemplates()
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to update workout. Please try again.')
      setTemplateError(msg)
      setTemplateErrorSource('update')
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update workout. Please try again.',
      })
    } finally {
      setTemplateUpdateLoading(false)
    }
  }

  const handleSaveSessionPress = () => {
    if (!session) return

    // Show login dialog for guests
    Alert.alert(
      'Login required',
      'To save this session to your history, please log in or create an account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log in / Sign up',
          onPress: () => {
            const nav = navigation as any
            nav.navigate('Login', {
              completeSessionId: session.id,
              sessionCreatedAt: session.createdAt,
              session,
              removedSessionExerciseIds,
              createTemplate: false,
            })
          },
        },
      ]
    )
  }

  const handleCreateTemplatePress = () => {
    if (!session) return

    // Show template name modal first (for both guests and authenticated users)
    setNewTemplateName(session?.name ?? '')
    setTemplateError(null)
    setShowCreateTemplateModal(true)
  }

  const handleCreateTemplateConfirm = async () => {
    if (!session || !newTemplateName.trim()) return

    // If not authenticated, redirect to login with template name
    if (!isAuthenticated) {
      setShowCreateTemplateModal(false)
      Alert.alert(
        'Login required',
        'To create a workout, please log in or create an account.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log in / Sign up',
            onPress: () => {
              const nav = navigation as any
              nav.navigate('Login', {
                completeSessionId: session.id,
                sessionCreatedAt: session.createdAt,
                session,
                removedSessionExerciseIds,
                createTemplate: true,
                templateName: newTemplateName.trim(),
              })
            },
          },
        ]
      )
      return
    }

    // Authenticated users can create template directly
    try {
      setTemplateCreateLoading(true)
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
        text2: 'Workout created.',
      })
      await checkAuth()
      handleGoToTemplates()
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to create workout. Please try again.')
      setTemplateError(msg)
      setTemplateErrorSource('create')
      setShowCreateTemplateModal(false)
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create workout. Please try again.',
      })
    } finally {
      setTemplateCreateLoading(false)
    }
  }

  const handleGoToTemplates = () => {
    ;(navigation as any).navigate('MainTabs', { screen: 'Templates' })
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
  // But don't show timer if session is completed (from history)
  if (loading && !session) {
    if (initialCreatedAtParam && !initialCompletedAtParam) {
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

  if (!session) return null

  const allSets = session.sessionExercises.flatMap((ex) => ex.sets)
  const totalSets = allSets.length
  const completedSetsCount = allSets.filter((s) => s.isCompleted === true).length
  const hasAtLeastOneCompletedSet = completedSetsCount > 0

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
            {!session.completedAt ? (
              <Text style={styles.sessionDate}>
                Session started: {new Date(session.createdAt).toLocaleString()}
              </Text>
            ) : (
              <>
                <View style={styles.headerMetaRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.headerMetaText}>
                    {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.headerMetaRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.headerMetaText}>
                    {session.sessionTime ?? (session.completedAt && session.createdAt
                      ? formatTime(Math.floor((new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime()) / 1000))
                      : formatTime(elapsedTime))}
                  </Text>
                </View>
                <Text style={styles.setsCompletedLine}>
                  {session.completedAt ? totalSets : completedSetsCount} set{(session.completedAt ? totalSets : completedSetsCount) !== 1 ? 's' : ''} completed
                </Text>
              </>
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
            {!session.completedAt && (
              <TouchableOpacity
                style={styles.addExerciseButton}
                onPress={openExercisePicker}
              >
                <Ionicons name="add" size={20} color={colors.success} />
                <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.exercisesContainer}>
            {session.completedAt && (
              <Text style={styles.exercisesSectionTitle}>Exercises</Text>
            )}
            {session.sessionExercises.map((sessionExercise, index) => (
              <View key={sessionExercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseCardHeader}>
                  <Text style={styles.exerciseName}>
                    {index + 1}. {sessionExercise.exercise.name}
                  </Text>
                  {!session.completedAt && (
                    <TouchableOpacity
                      style={styles.removeExerciseButton}
                      onPress={() => removeExerciseFromSession(sessionExercise)}
                    >
                      <Text style={styles.removeExerciseButtonText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {sessionExercise.sets.length === 0 ? (
                  <Text style={styles.noSetsText}>No sets configured</Text>
                ) : (
                  <View style={styles.setsContainer}>
                    <View style={styles.tableHeader}>
                      <Text style={styles.tableHeaderText}>Set</Text>
                      <Text style={styles.tableHeaderText}>kg</Text>
                      <Text style={styles.tableHeaderText}>Reps</Text>
                      {!session.completedAt && (
                        <Text style={styles.tableHeaderText}>Done</Text>
                      )}
                    </View>
                    {sessionExercise.sets.map((set) => {
                      const edited = editingSets.get(set.id)
                      const displayWeight = edited?.weight ?? set.weight ?? 0
                      const displayReps = edited?.reps ?? set.reps ?? 0
                      const isCompleted = set.isCompleted ?? false
                      const canComplete = canSetBeCompleted(set)

                      const setRowContent = (
                        <View
                          style={[
                            styles.setRow,
                            isCompleted && styles.completedSetRow,
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
                                const ed = editingSets.get(set.id)
                                if (ed) saveSetUpdate(set)
                              }}
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor={colors.placeholder}
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
                                const ed = editingSets.get(set.id)
                                if (ed) saveSetUpdate(set)
                              }}
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor={colors.placeholder}
                            />
                          ) : (
                            <Text style={styles.setValue}>{set.reps ?? 0}</Text>
                          )}
                          {!session.completedAt && (
                            <TouchableOpacity
                              style={styles.checkboxContainer}
                              onPress={() => toggleSetComplete(set)}
                              disabled={!canComplete && !isCompleted}
                            >
                              <View
                                style={[
                                  styles.checkbox,
                                  isCompleted && styles.checkboxChecked,
                                  !canComplete && !isCompleted && styles.checkboxDisabled,
                                ]}
                              >
                                {isCompleted && (
                                  <Text style={styles.checkboxCheckmark}>✓</Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          )}
                        </View>
                      )

                      if (!session.completedAt) {
                        return (
                          <Swipeable
                            key={set.id}
                            renderRightActions={() => (
                              <TouchableOpacity
                                style={styles.swipeSetDelete}
                                onPress={() => removeSetFromSession(sessionExercise, set)}
                              >
                                <Ionicons name="trash-outline" size={20} color={colors.primaryText} />
                                <Text style={styles.swipeSetDeleteText}>Delete</Text>
                              </TouchableOpacity>
                            )}
                            friction={2}
                            rightThreshold={40}
                          >
                            {setRowContent}
                          </Swipeable>
                        )
                      }
                      return <View key={set.id}>{setRowContent}</View>
                    })}
                  </View>
                )}
                {!session.completedAt && (
                  <TouchableOpacity
                    style={styles.addSetButton}
                    onPress={() => addSetToExercise(sessionExercise)}
                  >
                    <Ionicons name="add" size={18} color={colors.success} />
                    <Text style={styles.addSetButtonText}>Add Set</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {!session.completedAt && (
              <TouchableOpacity
                style={styles.addExerciseButton}
                onPress={openExercisePicker}
              >
                <Ionicons name="add" size={20} color={colors.success} />
                <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            )}
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
              style={[
                styles.completeButton, 
                (!hasAtLeastOneCompletedSet || completing || deleting) && styles.buttonDisabled
              ]}
              onPress={handleCompleteWorkout}
              disabled={!hasAtLeastOneCompletedSet || completing || deleting}
            >
              <Text style={styles.completeButtonText}>Complete Workout</Text>
            </TouchableOpacity>
          </View>
        )}

        {session.completedAt && showCompletionSummary && (
          <View style={[styles.summaryBlock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
                  disabled={templateUpdateLoading || templateCreateLoading}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            {!isAuthenticated && (
              <View style={styles.guestMessageBox}>
                <Text style={styles.guestMessageText}>
                  Log in to save this session and create workouts.
                </Text>
              </View>
            )}
            <View style={styles.summaryButtons}>
              <TouchableOpacity
                style={[styles.performAgainButton, styles.performAgainButtonBlock, startingNew && styles.buttonDisabled]}
                onPress={handleStartNewWorkout}
                disabled={startingNew}
              >
                {startingNew ? (
                  <ActivityIndicator color={colors.primaryText} size="small" />
                ) : (
                  <Text style={styles.performAgainButtonText}>Perform Again</Text>
                )}
              </TouchableOpacity>
              {!isAuthenticated && (
                <>
                  <TouchableOpacity
                    style={styles.saveSessionButton}
                    onPress={handleSaveSessionPress}
                  >
                    <Text style={styles.saveSessionButtonText}>Save Session</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.goToTemplatesButton}
                    onPress={handleGoToTemplates}
                  >
                    <Text style={styles.goToTemplatesButtonText}>Go to Workouts</Text>
                  </TouchableOpacity>
                </>
              )}
              {session.workoutId != null && isAuthenticated && !session.isSyncedOnce && !session.isFromDefaultTemplate && (
                <TouchableOpacity
                  style={[styles.templateActionButton, templateUpdateLoading && styles.buttonDisabled]}
                  onPress={handleUpdateTemplate}
                  disabled={templateUpdateLoading}
                >
                  {templateUpdateLoading ? (
                    <ActivityIndicator color={colors.primaryText} size="small" />
                  ) : (
                    <Text style={styles.templateActionButtonText}>Update Workout</Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.templateActionButton, templateCreateLoading && styles.buttonDisabled]}
                onPress={handleCreateTemplatePress}
                disabled={templateCreateLoading}
              >
                {templateCreateLoading ? (
                  <ActivityIndicator color={colors.primaryText} size="small" />
                ) : (
                  <Text style={styles.templateActionButtonText}>Create Workout</Text>
                )}
              </TouchableOpacity>
              {isAuthenticated && (
                <TouchableOpacity
                  style={styles.goToTemplatesButton}
                  onPress={handleGoToTemplates}
                >
                  <Text style={styles.goToTemplatesButtonText}>Go to Workouts</Text>
                </TouchableOpacity>
              )}
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
            <Text style={styles.modalTitle}>New workout name</Text>
            <TextInput
              style={styles.modalInput}
              value={newTemplateName}
              onChangeText={setNewTemplateName}
              placeholder="Workout name"
              placeholderTextColor={colors.placeholder}
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
                style={[styles.modalConfirmButton, (!newTemplateName.trim() || templateCreateLoading) && styles.buttonDisabled]}
                onPress={handleCreateTemplateConfirm}
                disabled={!newTemplateName.trim() || templateCreateLoading}
              >
                {templateCreateLoading ? (
                  <ActivityIndicator color={colors.primaryText} size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddExerciseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddExerciseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setShowAddExerciseModal(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            {exercisesLoading ? (
              <View style={styles.modalEmpty}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.modalEmptyText}>Loading exercises…</Text>
              </View>
            ) : (() => {
              const availableExercises = exercises.filter(
                (ex) => !session.sessionExercises.some((se) => se.exercise.id === ex.id)
              )
              return availableExercises.length > 0 ? (
                <ScrollView style={styles.modalList}>
                  {availableExercises.map((exercise) => (
                    <TouchableOpacity
                      key={exercise.id}
                      style={styles.modalItem}
                      onPress={() => addExerciseToSession(exercise)}
                    >
                      <Text style={styles.modalItemText}>{exercise.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>
                    {exercises.length === 0
                      ? 'No exercises available'
                      : 'All exercises already added'}
                  </Text>
                </View>
              )
            })()}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  headerCard: {
    backgroundColor: colors.card,
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
    color: colors.textSecondary,
  },
  headerContent: {
    marginBottom: 8,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  headerMetaText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  setsCompletedLine: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  sessionName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  sessionDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  completedDate: {
    fontSize: 14,
    color: colors.success,
    marginTop: 4,
  },
  timer: {
    fontSize: 24,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: colors.textSecondary,
  },
  performAgainButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  performAgainButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBoxText: {
    color: colors.errorText,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  exercisesContainer: {
    gap: 16,
  },
  exercisesSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  removeExerciseButton: {
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeExerciseButtonText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    marginTop: 8,
  },
  addSetButtonText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  swipeSetDelete: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    marginVertical: 0,
    marginRight: 0,
  },
  swipeSetDeleteText: {
    color: colors.primaryText,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginBottom: 16,
  },
  addExerciseButtonText: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '600',
  },
  performAgainButtonBlock: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  noSetsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  setsContainer: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.cardElevated,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  completedSetRow: {
    backgroundColor: colors.successBgDark,
  },
  setNumber: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  checkboxContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxDisabled: {
    opacity: 0.4,
    backgroundColor: colors.disabledBg,
    borderColor: colors.border,
  },
  checkboxCheckmark: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 4,
    backgroundColor: colors.inputBg,
    color: colors.text,
  },
  setValue: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    color: colors.primaryText,
    fontSize: 18,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  completeButtonText: {
    color: colors.successText,
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
    color: colors.success,
  },
  summaryBlock: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  summaryMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  templateErrorBox: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  templateErrorText: {
    color: colors.errorText,
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  templateSuccessText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginTop: 8,
  },
  guestMessageBox: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  guestMessageText: {
    color: colors.warningText,
    fontSize: 14,
    textAlign: 'center',
  },
  summaryButtons: {
    marginTop: 16,
    gap: 12,
  },
  templateActionButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  templateActionButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  saveSessionButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveSessionButtonText: {
    color: colors.successText,
    fontSize: 16,
    fontWeight: '600',
  },
  goToTemplatesButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  goToTemplatesButtonText: {
    color: colors.successText,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.modal,
    borderRadius: 8,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  modalList: {
    maxHeight: 320,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: colors.inputBg,
    color: colors.text,
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
    color: colors.textSecondary,
    fontSize: 16,
  },
  modalConfirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalConfirmButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
})

export default SessionDetailScreen
