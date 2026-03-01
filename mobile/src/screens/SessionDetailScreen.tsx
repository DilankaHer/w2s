import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { Swipeable } from 'react-native-gesture-handler'
import * as Crypto from 'expo-crypto'
import type { SessionById } from '../database/database.types'
import type { UpdateSessionInput } from '../database/interfaces/session.interfaces'
import type { RootStackParamList } from '../../App'
import { createSessionService, deleteSessionService, getSessionByIdService, updateSessionService } from '../services/sessions.service'
import { checkWorkoutNameExistsService, createWorkoutBySessionService, updateWorkoutBySessionService } from '../services/workouts.service'
import { colors } from '../theme/colors'

type SessionDetailRouteProp = RouteProp<RootStackParamList, 'SessionDetail'>
type SessionSetItem = NonNullable<SessionById>['sessionExercises'][number]['sessionSets'][number]
type UISessionSet = SessionSetItem & { isCompleted: boolean }
type UISessionExercise = {
  id: string
  sessionId: string
  exerciseId: string
  order: number
  exerciseName: string
  meta: string | null
  sets: UISessionSet[]
}
type UISession = {
  id: string
  name: string
  workoutId: string | null
  createdAt: string
  completedAt: string | null
  sessionTime: string | null
  isFromDefaultWorkout?: boolean
  derivedWorkoutId?: string | null
  updatedWorkoutAt?: string | null
  sessionExercises: UISessionExercise[]
}

function renumberExerciseOrder(exercises: UISessionExercise[]): UISessionExercise[] {
  return exercises.map((se, index) => ({ ...se, order: index + 1 }))
}

function renumberSets(sets: UISessionSet[]): UISessionSet[] {
  return sets.map((s, index) => ({ ...s, setNumber: index + 1 }))
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function mapSharedToUi(shared: SessionById | null | undefined): UISession {
  if (!shared) {
    return {
      id: '',
      name: '',
      workoutId: null,
      createdAt: '',
      completedAt: null,
      sessionTime: null,
      sessionExercises: [],
    }
  }
  const completed = shared.completedAt != null
  return {
    id: shared.id,
    name: shared.name,
    workoutId: shared.workoutId ?? null,
    createdAt: shared.createdAt,
    completedAt: shared.completedAt ?? null,
    sessionTime: shared.sessionTime ?? null,
    isFromDefaultWorkout: shared.isFromDefaultWorkout,
    derivedWorkoutId: shared.derivedWorkoutId ?? null,
    updatedWorkoutAt: shared.updatedWorkoutAt ?? null,
    sessionExercises: (shared.sessionExercises ?? []).map((se) => {
      const body = se.exercise?.bodyPart?.name
      const equip = se.exercise?.equipment?.name
      const meta = [body, equip].filter(Boolean).join(' · ') || null
      return {
        id: se.id,
        sessionId: se.sessionId,
        exerciseId: se.exerciseId,
        order: se.order,
        exerciseName: se.exercise?.name ?? 'Exercise',
        meta,
        sets: (se.sessionSets ?? []).map((s) => ({
          ...s,
          isCompleted: completed ? true : false,
        })),
      }
    }),
  }
}

export default function SessionDetailScreen() {
  const route = useRoute<SessionDetailRouteProp>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const insets = useSafeAreaInsets()
  const { id, selectedExercise, replacingSessionExerciseId } = route.params

  const [session, setSession] = useState<UISession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [startingNew, setStartingNew] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [nowTickMs, setNowTickMs] = useState<number>(0)
  const [showCreateWorkoutModal, setShowCreateWorkoutModal] = useState(false)
  const [createWorkoutName, setCreateWorkoutName] = useState('')
  const [creatingWorkout, setCreatingWorkout] = useState(false)
  const [updatingWorkout, setUpdatingWorkout] = useState(false)
  const [createWorkoutNameExists, setCreateWorkoutNameExists] = useState(false)
  const [checkingCreateWorkoutName, setCheckingCreateWorkoutName] = useState(false)

  const isReadOnly = session?.completedAt != null
  const canCreateWorkout = !!session?.completedAt && !session?.derivedWorkoutId
  const canUpdateWorkout =
    !!session?.completedAt &&
    !!session?.workoutId &&
    !session?.isFromDefaultWorkout &&
    !session?.updatedWorkoutAt

  useEffect(() => {
    let active = true
    if (!showCreateWorkoutModal) return
    const name = createWorkoutName.trim()
    if (!name) {
      setCreateWorkoutNameExists(false)
      setCheckingCreateWorkoutName(false)
      return
    }

    setCheckingCreateWorkoutName(true)
    const t = setTimeout(async () => {
      try {
        const exists = await checkWorkoutNameExistsService(name)
        if (!active) return
        setCreateWorkoutNameExists(exists)
      } catch {
        if (!active) return
        setCreateWorkoutNameExists(false)
      } finally {
        if (!active) return
        setCheckingCreateWorkoutName(false)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(t)
    }
  }, [createWorkoutName, showCreateWorkoutModal])

  useEffect(() => {
    if (!session) return
    if (session.completedAt) return

    // Tick once per second so the timer updates continuously.
    setNowTickMs(Date.now())
    const intervalId = setInterval(() => setNowTickMs(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [session?.id, session?.createdAt, session?.completedAt])

  const openExercisePicker = useCallback(
    (replacingId: string | null) => {
      if (!session || isReadOnly) return
      const excludedExerciseIds =
        typeof replacingId === 'string'
          ? session.sessionExercises
              .filter((se) => se.id !== replacingId)
              .map((se) => se.exerciseId)
          : session.sessionExercises.map((se) => se.exerciseId)
      navigation.navigate('ExercisePicker', {
        pickerFor: 'session',
        sessionId: session.id,
        returnToRouteKey: route.key,
        excludedExerciseIds,
        ...(typeof replacingId === 'string' ? { replacingSessionExerciseId: replacingId } : {}),
      } as any)
    },
    [isReadOnly, navigation, route.key, session]
  )

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSessionByIdService(id)
      if (!data) {
        setSession(null)
        setError('Session not found')
        return
      }
      setSession(mapSharedToUi(data))
      setCreateWorkoutName(data.name ?? '')
      setDirty(false)
    } catch (err) {
      setSession(null)
      setError(err instanceof Error ? err.message : 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [id])

  const refreshSession = useCallback(async () => {
    const data = await getSessionByIdService(id)
    if (!data) throw new Error('Session not found')
    setSession(mapSharedToUi(data))
    setCreateWorkoutName(data.name ?? '')
  }, [id])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  useFocusEffect(
    useCallback(() => {
      // Don't overwrite local edits when returning from picker or while editing.
      if (dirty) return
      if (selectedExercise) return
      fetchSession()
    }, [fetchSession, dirty, selectedExercise])
  )

  const elapsedSeconds = useMemo(() => {
    if (!session) return 0
    const startMs = new Date(session.createdAt).getTime()
    const endMs = session.completedAt ? new Date(session.completedAt).getTime() : (nowTickMs > 0 ? nowTickMs : Date.now())
    return Math.max(0, Math.floor((endMs - startMs) / 1000))
  }, [session, nowTickMs])

  const hasAnyZeroReps = useMemo(() => {
    if (!session) return false
    return session.sessionExercises.some((se) => se.sets.some((s) => (s.reps ?? 0) <= 0))
  }, [session])

  const completedSetsCount = useMemo(() => {
    if (!session) return 0
    return session.sessionExercises.reduce((acc, se) => acc + se.sets.filter((s) => s.isCompleted === true).length, 0)
  }, [session])

  const totalSets = useMemo(() => {
    if (!session) return 0
    return session.sessionExercises.reduce((acc, se) => acc + se.sets.length, 0)
  }, [session])

  const hasIncompleteSets = useMemo(() => {
    if (!session) return false
    return session.sessionExercises.some((se) => se.sets.some((s) => s.isCompleted !== true))
  }, [session])

  const updateSetField = useCallback((sessionExerciseId: string, setId: string, field: 'reps' | 'weight', value: number) => {
    setSession((prev) => {
      if (!prev || prev.completedAt) return prev
      setDirty(true)
      return {
        ...prev,
        sessionExercises: prev.sessionExercises.map((se) => {
          if (se.id !== sessionExerciseId) return se
          return {
            ...se,
            sets: se.sets.map((s) => {
              if (s.id !== setId) return s
              const next = { ...s, [field]: value }
              if (field === 'reps' && (value ?? 0) <= 0) next.isCompleted = false
              return next
            }),
          }
        }),
      }
    })
  }, [])

  const toggleSetComplete = useCallback((sessionExerciseId: string, setId: string) => {
    setSession((prev) => {
      if (!prev || prev.completedAt) return prev
      setDirty(true)
      return {
        ...prev,
        sessionExercises: prev.sessionExercises.map((se) => {
          if (se.id !== sessionExerciseId) return se
          return {
            ...se,
            sets: se.sets.map((s) => {
              if (s.id !== setId) return s
              if (!s.isCompleted && (s.reps ?? 0) <= 0) return s
              return { ...s, isCompleted: !s.isCompleted }
            }),
          }
        }),
      }
    })
  }, [])

  const addSet = useCallback((sessionExerciseId: string) => {
    setSession((prev) => {
      if (!prev || prev.completedAt) return prev
      const nextExercises = prev.sessionExercises.map((se) => {
        if (se.id !== sessionExerciseId) return se
        const last = se.sets[se.sets.length - 1]
        const nextSet: UISessionSet = {
          id: Crypto.randomUUID(),
          sessionExerciseId: se.id,
          setNumber: se.sets.length + 1,
          reps: last?.reps ?? 0,
          weight: last?.weight ?? 0,
          isCompleted: false,
          isSynced: false,
        }
        return { ...se, sets: [...se.sets, nextSet] }
      })
      setDirty(true)
      return { ...prev, sessionExercises: nextExercises }
    })
  }, [])

  const removeSet = useCallback((sessionExerciseId: string, setId: string) => {
    setSession((prev) => {
      if (!prev || prev.completedAt) return prev
      const nextExercises = prev.sessionExercises.map((se) => {
        if (se.id !== sessionExerciseId) return se
        if (se.sets.length <= 1) return se
        const filtered = se.sets.filter((s) => s.id !== setId)
        return { ...se, sets: renumberSets(filtered) }
      })
      setDirty(true)
      return { ...prev, sessionExercises: nextExercises }
    })
  }, [])

  const removeExercise = useCallback((sessionExerciseId: string) => {
    setSession((prev) => {
      if (!prev || prev.completedAt) return prev
      const next = renumberExerciseOrder(prev.sessionExercises.filter((se) => se.id !== sessionExerciseId))
      setDirty(true)
      return { ...prev, sessionExercises: next }
    })
  }, [])

  // Consume picker selection (add/replace exercise), then clear params.
  useFocusEffect(
    useCallback(() => {
      if (!selectedExercise) return
      if (!session || isReadOnly) return

      ;(navigation as any).setParams({ selectedExercise: undefined, replacingSessionExerciseId: undefined })

      setSession((prev) => {
        if (!prev || prev.completedAt) return prev

        const existsElsewhere = prev.sessionExercises.some((se) => se.exerciseId === selectedExercise.id)
        const target =
          typeof replacingSessionExerciseId === 'string'
            ? prev.sessionExercises.find((se) => se.id === replacingSessionExerciseId)
            : null

        if (existsElsewhere) {
          const isReplacingSame = target?.exerciseId === selectedExercise.id
          if (!isReplacingSame) {
            Toast.show({
              type: 'error',
              text1: 'Already added',
              text2: 'That exercise is already in this session.',
            })
            return prev
          }
        }

        if (typeof replacingSessionExerciseId === 'string' && target) {
          const nextExercises = prev.sessionExercises.map((se) =>
            se.id === replacingSessionExerciseId
              ? {
                  ...se,
                  exerciseId: selectedExercise.id,
                  exerciseName: selectedExercise.name,
                  meta: null,
                  sets: se.sets.map((s) => ({ ...s, isCompleted: false })),
                }
              : se
          )
          setDirty(true)
          return { ...prev, sessionExercises: nextExercises }
        }

        const nextOrder =
          prev.sessionExercises.length > 0
            ? Math.max(...prev.sessionExercises.map((se) => se.order ?? 0)) + 1
            : 1
        const newExercise: UISessionExercise = {
          id: Crypto.randomUUID(),
          sessionId: prev.id,
          exerciseId: selectedExercise.id,
          order: nextOrder,
          exerciseName: selectedExercise.name,
          meta: null,
          sets: [
            {
              id: Crypto.randomUUID(),
              sessionExerciseId: '',
              setNumber: 1,
              reps: 0,
              weight: 0,
              isCompleted: false,
              isSynced: false,
            },
          ],
        }
        newExercise.sets = newExercise.sets.map((s) => ({ ...s, sessionExerciseId: newExercise.id }))

        setDirty(true)
        return { ...prev, sessionExercises: [...prev.sessionExercises, newExercise] }
      })
    }, [selectedExercise, replacingSessionExerciseId, session, isReadOnly, navigation])
  )

  const buildUpdatePayload = useCallback((mode: 'proceed' | 'autocomplete'): UpdateSessionInput | null => {
    if (!session) return null
    const now = new Date()

    const sessionExercisesUnordered: UpdateSessionInput['sessionExercises'] = session.sessionExercises
      .map((se) => {
        const sets = mode === 'autocomplete' ? se.sets : se.sets.filter((s) => s.isCompleted === true)
        return {
          id: se.id,
          sessionId: session.id,
          exerciseId: se.exerciseId,
          order: se.order,
          sessionSets: sets.map((s) => ({
            id: s.id,
            setNumber: s.setNumber,
            reps: s.reps,
            weight: s.weight,
            sessionExerciseId: se.id,
          })),
        }
      })
      .filter((se) => (se.sessionSets?.length ?? 0) > 0)

    // If "Proceed" filters out exercises with zero completed sets, re-number so order stays contiguous.
    const sessionExercises: UpdateSessionInput['sessionExercises'] = sessionExercisesUnordered.map((se, index) => ({
      ...se,
      order: index + 1,
    }))

    return {
      id: session.id,
      name: session.name,
      completedAt: now.toISOString(),
      sessionTime: formatTime(Math.floor((now.getTime() - new Date(session.createdAt).getTime()) / 1000)),
      sessionExercises,
    }
  }, [session])

  const doComplete = useCallback(async (mode: 'proceed' | 'autocomplete') => {
    if (!session) return
    if (hasAnyZeroReps) return

    const payload = buildUpdatePayload(mode)
    if (!payload) return

    try {
      setCompleting(true)
      const updated = await updateSessionService(payload)
      if (!updated) throw new Error('Failed to complete session')
      setSession(mapSharedToUi(updated))
      setDirty(false)
      Toast.show({ type: 'success', text1: 'Session completed' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to complete session'
      setError(msg)
      Toast.show({ type: 'error', text1: 'Error', text2: msg })
    } finally {
      setCompleting(false)
    }
  }, [buildUpdatePayload, hasAnyZeroReps, session])

  const handleCompletePress = useCallback(() => {
    if (!session || session.completedAt) return
    if (hasAnyZeroReps) return

    if (hasIncompleteSets) {
      Alert.alert(
        'Incomplete sets',
        'You have incomplete sets. Autocomplete them before finishing?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed', onPress: () => doComplete('proceed') },
          { text: 'Autocomplete', onPress: () => doComplete('autocomplete') },
        ]
      )
      return
    }

    doComplete('proceed')
  }, [doComplete, hasAnyZeroReps, hasIncompleteSets, session])

  const handleCancelWorkout = useCallback(() => {
    if (!session || session.completedAt) return
    Alert.alert('Cancel workout?', 'This will delete the session.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true)
            const msg = await deleteSessionService(session.id)
            Toast.show({ type: 'success', text1: 'Success', text2: msg })
            navigation.navigate('MainTabs' as never)
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete session'
            Toast.show({ type: 'error', text1: 'Error', text2: msg })
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }, [navigation, session])

  const handlePerformAgain = useCallback(async () => {
    if (!session) return
    try {
      setStartingNew(true)
      const next = await createSessionService(session.id, '')
      if (!next) throw new Error('Failed to create session')
      navigation.navigate('SessionDetail', { id: next.id, initialSession: next })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start again'
      Toast.show({ type: 'error', text1: 'Error', text2: msg })
    } finally {
      setStartingNew(false)
    }
  }, [navigation, session])

  const handleCreateWorkout = useCallback(async () => {
    if (!session || !session.completedAt) return
    if (!createWorkoutName.trim() || createWorkoutNameExists) return
    try {
      setCreatingWorkout(true)
      const msg = await createWorkoutBySessionService(session.id, createWorkoutName.trim() || session.name)
      Toast.show({ type: 'success', text1: 'Success', text2: msg })
      setShowCreateWorkoutModal(false)
      await refreshSession()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create workout'
      Toast.show({ type: 'error', text1: 'Error', text2: msg })
    } finally {
      setCreatingWorkout(false)
    }
  }, [createWorkoutName, refreshSession, session])

  const handleUpdateWorkout = useCallback(async () => {
    if (!session || !session.completedAt) return
    Alert.alert(
      'Update workout?',
      'This will overwrite the workout template with the exercises and sets from this session.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdatingWorkout(true)
              const msg = await updateWorkoutBySessionService(session.id)
              Toast.show({ type: 'success', text1: 'Success', text2: msg })
              await refreshSession()
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to update workout'
              Toast.show({ type: 'error', text1: 'Error', text2: msg })
            } finally {
              setUpdatingWorkout(false)
            }
          },
        },
      ]
    )
  }, [refreshSession, session])

  const handleGoToWorkouts = useCallback(() => {
    navigation.navigate('MainTabs' as never)
  }, [navigation])

  if (loading) {
    return <View style={[styles.container, { backgroundColor: colors.screen }]} />
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Session not found'}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={fetchSession}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const disableComplete = completing || deleting || hasAnyZeroReps || completedSetsCount === 0

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Modal
        transparent
        visible={showCreateWorkoutModal}
        animationType="fade"
        onRequestClose={() => setShowCreateWorkoutModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Workout</Text>
            <Text style={styles.modalSubtitle}>Name your new workout template</Text>
            <View style={styles.modalInputWrap}>
              <TextInput
                style={styles.modalInput}
                value={createWorkoutName}
                onChangeText={setCreateWorkoutName}
                placeholder="Workout name"
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
              {createWorkoutNameExists ? (
                <Text style={styles.modalErrorText}>Workout name already exists</Text>
              ) : null}
            </View>
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, creatingWorkout && styles.buttonDisabled]}
                onPress={() => setShowCreateWorkoutModal(false)}
                disabled={creatingWorkout}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (creatingWorkout || checkingCreateWorkoutName || createWorkoutNameExists || !createWorkoutName.trim()) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleCreateWorkout}
                disabled={creatingWorkout || checkingCreateWorkoutName || createWorkoutNameExists || !createWorkoutName.trim()}
              >
                <Text style={styles.primaryButtonText}>{creatingWorkout ? 'Creating…' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.headerCard}>
          <TextInput
            style={styles.titleInput}
            value={session.name}
            editable={!session.completedAt}
            onChangeText={(text) => {
              setDirty(true)
              setSession((prev) => (prev && !prev.completedAt ? { ...prev, name: text } : prev))
            }}
            placeholder="Session name"
            placeholderTextColor={colors.placeholder}
          />
          <Text style={styles.subTitle}>
            {session.completedAt ? 'Completed' : 'In progress'} • {formatTime(elapsedSeconds)}
          </Text>
          <Text style={styles.subTitle}>
            {session.completedAt ? totalSets : completedSetsCount} set{(session.completedAt ? totalSets : completedSetsCount) !== 1 ? 's' : ''} completed
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        ) : null}

        {session.sessionExercises.map((se) => (
          <View key={se.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseTitle}>
                  {se.order}. {se.exerciseName}
                </Text>
                {se.meta ? <Text style={styles.exerciseMeta}>{se.meta}</Text> : null}
              </View>
              {!isReadOnly ? (
                <View style={styles.exerciseActionButtons}>
                  <TouchableOpacity style={styles.exerciseActionButton} onPress={() => openExercisePicker(se.id)}>
                    <Ionicons name="swap-horizontal-outline" size={20} color={colors.success} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.exerciseActionButton} onPress={() => removeExercise(se.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            <View style={styles.setsContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.col]}>Set</Text>
                <Text style={[styles.tableHeaderText, styles.col]}>KG</Text>
                <Text style={[styles.tableHeaderText, styles.col]}>Reps</Text>
                <View style={styles.actionsCol} />
              </View>

              {se.sets.map((s) => {
              const canComplete = (s.reps ?? 0) > 0
              const completed = s.isCompleted === true

              const row = (
                <View
                  style={[
                    styles.row,
                    !isReadOnly && completed && styles.rowCompleted,
                    !session.completedAt &&
                      (s.reps ?? 0) <= 0 &&
                      styles.setRowInvalid,
                  ]}
                >
                  <Text style={styles.setNumber}>{s.setNumber}</Text>
                  <TextInput
                    style={styles.input}
                    value={s.weight === 0 ? '' : String(s.weight)}
                    editable={!session.completedAt}
                    onChangeText={(t) => updateSetField(se.id, s.id, 'weight', parseFloat(t) || 0)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                  />
                  <TextInput
                    style={styles.input}
                    value={s.reps === 0 ? '' : String(s.reps)}
                    editable={!session.completedAt}
                    onChangeText={(t) => updateSetField(se.id, s.id, 'reps', parseInt(t) || 0)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                  />
                  {!isReadOnly ? (
                    <View style={styles.setRowActions}>
                      {se.sets.length > 1 ? (
                        <Ionicons
                          name="chevron-back-outline"
                          size={16}
                          color={colors.error}
                          style={styles.swipeIconHint}
                        />
                      ) : null}
                      <TouchableOpacity
                        style={[
                          styles.checkbox,
                          completed && styles.checkboxChecked,
                          !canComplete && !completed && styles.checkboxDisabled,
                        ]}
                        onPress={() => toggleSetComplete(se.id, s.id)}
                        disabled={!!session.completedAt || (!canComplete && !completed)}
                      >
                        {completed ? <Ionicons name="checkmark" size={16} color={colors.primaryText} /> : null}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.checkboxSpacer} />
                  )}
                </View>
              )

              if (!isReadOnly && se.sets.length > 1) {
                return (
                  <Swipeable
                    key={s.id}
                    renderRightActions={() => (
                      <TouchableOpacity style={styles.swipeDelete} onPress={() => removeSet(se.id, s.id)}>
                        <Ionicons name="trash-outline" size={20} color={colors.primaryText} />
                        <Text style={styles.swipeDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    friction={2}
                    rightThreshold={40}
                  >
                    {row}
                  </Swipeable>
                )
              }

              return <View key={s.id}>{row}</View>
            })}

              {!isReadOnly ? (
                <TouchableOpacity style={styles.addSetButton} onPress={() => addSet(se.id)}>
                  <Ionicons name="add" size={18} color={colors.success} />
                  <Text style={styles.addSetButtonText}>Add Set</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))}

        {!isReadOnly ? (
          <TouchableOpacity style={styles.addExerciseButton} onPress={() => openExercisePicker(null)}>
            <Ionicons name="add" size={20} color={colors.success} />
            <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {!session.completedAt ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, (deleting || completing) && styles.buttonDisabled]}
              onPress={handleCancelWorkout}
              disabled={deleting || completing}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, disableComplete && styles.buttonDisabled]}
              onPress={handleCompletePress}
              disabled={disableComplete}
            >
              <Text style={styles.primaryButtonText}>{completing ? 'Completing…' : 'Complete'}</Text>
            </TouchableOpacity>
          </View>

          {hasAnyZeroReps ? (
            <Text style={styles.helperText}>Complete disabled: reps cannot be 0.</Text>
          ) : completedSetsCount === 0 ? (
            <Text style={styles.helperText}>Complete disabled: mark at least one set completed.</Text>
          ) : null}
        </View>
      ) : (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {(canCreateWorkout || canUpdateWorkout) ? (
            <View style={styles.bottomRow}>
              {canCreateWorkout ? (
                <TouchableOpacity
                  style={[styles.primaryButton, (creatingWorkout || updatingWorkout) && styles.buttonDisabled]}
                  onPress={() => {
                    setCreateWorkoutName(session.name ?? '')
                    setCreateWorkoutNameExists(false)
                    setShowCreateWorkoutModal(true)
                  }}
                  disabled={creatingWorkout || updatingWorkout}
                >
                  <Text style={styles.primaryButtonText}>Create Workout</Text>
                </TouchableOpacity>
              ) : null}
              {canUpdateWorkout ? (
                <TouchableOpacity
                  style={[styles.primaryButton, (creatingWorkout || updatingWorkout) && styles.buttonDisabled]}
                  onPress={handleUpdateWorkout}
                  disabled={creatingWorkout || updatingWorkout}
                >
                  <Text style={styles.primaryButtonText}>{updatingWorkout ? 'Updating…' : 'Update Workout'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleGoToWorkouts}>
              <Text style={styles.secondaryButtonText}>Go to Workouts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, startingNew && styles.buttonDisabled]}
              onPress={handlePerformAgain}
              disabled={startingNew}
            >
              {startingNew ? (
                <ActivityIndicator color={colors.primaryText} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Perform Again</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screen },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.screen },
  headerCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  titleInput: { fontSize: 22, fontWeight: '800', color: colors.text, paddingVertical: 0, marginBottom: 6 },
  subTitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  errorText: { fontSize: 16, color: colors.error, textAlign: 'center', marginBottom: 12 },
  errorBox: { backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.errorBorder, borderRadius: 12, padding: 12, marginBottom: 12 },
  errorBoxText: { color: colors.errorText, fontSize: 14 },
  exerciseCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  exerciseHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  exerciseTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  exerciseMeta: { fontSize: 13, color: colors.textSecondary, marginBottom: 0 },
  exerciseActionButtons: { flexDirection: 'row', gap: 8 },
  exerciseActionButton: { padding: 6 },
  setsContainer: { marginTop: 0 },
  setRowInvalid: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.accent,
    borderBottomColor: colors.accent,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  tableHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardElevated, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, gap: 8, marginBottom: 8 },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textAlign: 'center', textTransform: 'uppercase' },
  col: { flex: 1 },
  actionsCol: { width: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowCompleted: { backgroundColor: colors.successBgDark },
  setNumber: { flex: 1, textAlign: 'center', color: colors.text, fontWeight: '700' },
  input: { flex: 1, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6, textAlign: 'center', color: colors.text, backgroundColor: colors.inputBg },
  setRowActions: { width: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  swipeIconHint: { opacity: 0.4 },
  checkbox: { width: 28, height: 28, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screen },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkboxDisabled: { opacity: 0.4 },
  checkboxSpacer: { width: 44, height: 28 },
  swipeDelete: { backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center', width: 72 },
  swipeDeleteText: { color: colors.primaryText, fontSize: 11, fontWeight: '700', marginTop: 4 },
  addSetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, marginTop: 6 },
  addSetButtonText: { color: colors.success, fontSize: 14, fontWeight: '700' },
  addExerciseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginBottom: 16 },
  addExerciseButtonText: { color: colors.success, fontSize: 16, fontWeight: '700' },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.screen, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  bottomRow: { flexDirection: 'row', gap: 10 },
  helperText: { fontSize: 12, color: colors.textSecondary },
  primaryButton: { flex: 1, backgroundColor: colors.success, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.successText, fontSize: 16, fontWeight: '800' },
  secondaryButton: { flex: 1, backgroundColor: colors.card, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  inlineErrorText: { color: colors.error, fontSize: 12, fontWeight: '600', marginBottom: 10 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  modalInputWrap: {
    gap: 4,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.inputBg,
  },
  modalErrorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  modalRow: { flexDirection: 'row', gap: 10 },
})

