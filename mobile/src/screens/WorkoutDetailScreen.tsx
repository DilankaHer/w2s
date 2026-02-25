import { RouteProp, useFocusEffect, useRoute, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Swipeable } from 'react-native-gesture-handler'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as Crypto from 'expo-crypto'
import type { Exercise, Set as SetType, WorkoutExercise, WorkoutWithExercises } from '@shared/types/workouts.types'
import type { RootStackParamList } from '../../App'
import { checkWorkoutNameExistsService, getWorkoutByIdService, updateWorkoutService } from '../services/workouts.service'
import { colors } from '../theme/colors'

type WorkoutDetailRouteProp = RouteProp<RootStackParamList, 'WorkoutDetail'>

function WorkoutDetailScreen() {
  const route = useRoute<WorkoutDetailRouteProp>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const insets = useSafeAreaInsets()
  const id = route.params.id
  const selectedExercise = route.params.selectedExercise
  const replacingWorkoutExerciseId = route.params.replacingWorkoutExerciseId

  const [draft, setDraft] = useState<WorkoutWithExercises | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingSession, setCreatingSession] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [originalWorkoutName, setOriginalWorkoutName] = useState('')
  const [workoutNameExists, setWorkoutNameExists] = useState(false)
  const [checkingWorkoutName, setCheckingWorkoutName] = useState(false)

  const isReadOnly = draft?.isDefaultWorkout === true

  const setDraftAndDirty = useCallback((next: WorkoutWithExercises) => {
    setDraft(next)
    setDirty(true)
  }, [])

  const fetchWorkout = useCallback(async (workoutId: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getWorkoutByIdService(workoutId)
      setDraft(data ?? null)
      setOriginalWorkoutName(data?.name ?? '')
      setWorkoutNameExists(false)
      setDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!draft || isReadOnly) return
    const name = (draft.name ?? '').trim()
    const original = (originalWorkoutName ?? '').trim()

    if (!name || name === original) {
      setWorkoutNameExists(false)
      setCheckingWorkoutName(false)
      return
    }

    setCheckingWorkoutName(true)
    const t = setTimeout(async () => {
      try {
        const exists = await checkWorkoutNameExistsService(name)
        if (!active) return
        setWorkoutNameExists(exists)
      } catch {
        if (!active) return
        setWorkoutNameExists(false)
      } finally {
        if (!active) return
        setCheckingWorkoutName(false)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(t)
    }
  }, [draft?.name, isReadOnly, originalWorkoutName])

  useEffect(() => {
    if (id) {
      fetchWorkout(id)
    }
  }, [id, fetchWorkout])

  useFocusEffect(
    useCallback(() => {
      // Don't overwrite local draft when returning from picker or when there are unsaved edits.
      if (!id) return
      if (dirty) return
      if (selectedExercise) return
      fetchWorkout(id)
    }, [id, fetchWorkout, dirty, selectedExercise])
  )

  // Consume exercise selection from picker (add/replace), then clear params.
  useFocusEffect(
    useCallback(() => {
      if (!selectedExercise) return
      if (isReadOnly) return

      ;(navigation as any).setParams({
        selectedExercise: undefined,
        replacingWorkoutExerciseId: undefined,
      })

      const nextExerciseFull: Exercise = {
        id: selectedExercise.id,
        name: selectedExercise.name,
        link: null,
        info: null,
        imageName: null,
        bodyPart: null,
        equipment: null,
        isDefaultExercise: false,
      }

      setDraft((prev) => {
        if (!prev) return prev

        const target =
          typeof replacingWorkoutExerciseId === 'string'
            ? prev.workoutExercises.find((we) => we.id === replacingWorkoutExerciseId)
            : null

        const existsElsewhere = prev.workoutExercises.some((we) => we.exercise.id === nextExerciseFull.id)
        if (existsElsewhere) {
          const isReplacingSame = target?.exercise.id === nextExerciseFull.id
          if (!isReplacingSame) {
            Toast.show({
              type: 'error',
              text1: 'Already added',
              text2: 'That exercise is already in this workout.',
            })
            return prev
          }
        }

        if (typeof replacingWorkoutExerciseId === 'string') {
          if (!target) return prev
          setDirty(true)
          return {
            ...prev,
            workoutExercises: prev.workoutExercises.map((we) =>
              we.id === replacingWorkoutExerciseId ? { ...we, exercise: nextExerciseFull } : we
            ),
          }
        }

        const nextOrder =
          prev.workoutExercises.length > 0
            ? Math.max(...prev.workoutExercises.map((we) => we.order ?? 0)) + 1
            : 1
        const newWorkoutExercise: WorkoutExercise = {
          id: Crypto.randomUUID(),
          workoutId: prev.id,
          exercise: nextExerciseFull,
          order: nextOrder,
          sets: [
            {
              id: Crypto.randomUUID(),
              workoutExerciseId: '',
              setNumber: 1,
              targetReps: 0,
              targetWeight: 0,
            },
          ],
        }
        newWorkoutExercise.sets = newWorkoutExercise.sets.map((s) => ({
          ...s,
          workoutExerciseId: newWorkoutExercise.id,
        }))

        setDirty(true)
        return { ...prev, workoutExercises: [...prev.workoutExercises, newWorkoutExercise] }
      })
    }, [
      selectedExercise,
      replacingWorkoutExerciseId,
      isReadOnly,
      navigation,
    ])
  )

  const updateWorkoutName = useCallback(
    (name: string) => {
      if (!draft || isReadOnly) return
      setDraftAndDirty({ ...draft, name })
    },
    [draft, isReadOnly, setDraftAndDirty]
  )

  const renumberExerciseOrder = useCallback((exercises: WorkoutExercise[]): WorkoutExercise[] => {
    return exercises.map((we, index) => ({ ...we, order: index + 1 }))
  }, [])

  const renumberSets = useCallback((setsList: SetType[]): SetType[] => {
    return setsList.map((s, index) => ({ ...s, setNumber: index + 1 }))
  }, [])

  const addSet = useCallback(
    (workoutExerciseId: string) => {
      if (!draft || isReadOnly) return
      const next = {
        ...draft,
        workoutExercises: draft.workoutExercises.map((we) => {
          if (we.id !== workoutExerciseId) return we
          const last = we.sets[we.sets.length - 1]
          const nextSet: SetType = {
            id: Crypto.randomUUID(),
            workoutExerciseId: we.id,
            setNumber: we.sets.length + 1,
            targetReps: last?.targetReps ?? 0,
            targetWeight: last?.targetWeight ?? 0,
          }
          return { ...we, sets: [...we.sets, nextSet] }
        }),
      }
      setDraftAndDirty(next)
    },
    [draft, isReadOnly, setDraftAndDirty]
  )

  const removeSet = useCallback(
    (workoutExerciseId: string, setId: string) => {
      if (!draft || isReadOnly) return
      const next = {
        ...draft,
        workoutExercises: draft.workoutExercises.map((we) => {
          if (we.id !== workoutExerciseId) return we
          if (we.sets.length <= 1) return we
          const filtered = we.sets.filter((s) => s.id !== setId)
          return { ...we, sets: renumberSets(filtered) }
        }),
      }
      setDraftAndDirty(next)
    },
    [draft, isReadOnly, renumberSets, setDraftAndDirty]
  )

  const updateSetField = useCallback(
    (
      workoutExerciseId: string,
      setId: string,
      field: 'targetReps' | 'targetWeight',
      value: number
    ) => {
      if (!draft || isReadOnly) return
      const next = {
        ...draft,
        workoutExercises: draft.workoutExercises.map((we) => {
          if (we.id !== workoutExerciseId) return we
          return {
            ...we,
            sets: we.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
          }
        }),
      }
      setDraftAndDirty(next)
    },
    [draft, isReadOnly, setDraftAndDirty]
  )

  const removeExercise = useCallback(
    (workoutExerciseId: string) => {
      if (!draft || isReadOnly) return
      const nextExercises = renumberExerciseOrder(
        draft.workoutExercises.filter((we) => we.id !== workoutExerciseId)
      )
      setDraftAndDirty({ ...draft, workoutExercises: nextExercises })
    },
    [draft, isReadOnly, renumberExerciseOrder, setDraftAndDirty]
  )

  const openExercisePicker = useCallback(
    (replacingWorkoutExerciseId: string | null) => {
      if (!draft || isReadOnly) return
      const excludedExerciseIds =
        typeof replacingWorkoutExerciseId === 'string'
          ? draft.workoutExercises
              .filter((we) => we.id !== replacingWorkoutExerciseId)
              .map((we) => we.exercise.id)
          : draft.workoutExercises.map((we) => we.exercise.id)
      navigation.navigate('ExercisePicker', {
        pickerFor: 'workoutDetail',
        returnToRouteKey: route.key,
        excludedExerciseIds,
        ...(typeof replacingWorkoutExerciseId === 'string'
          ? { replacingWorkoutExerciseId }
          : {}),
      } as any)
    },
    [draft, isReadOnly, navigation, route.key]
  )

  const summaryText = useMemo(() => {
    if (!draft) return null
    const exCount = draft.workoutExercises.length
    const setCount = draft.workoutExercises.reduce((acc, ex) => acc + (ex.sets?.length ?? 0), 0)
    if (exCount === 0) return null
    return `${exCount} exercise${exCount !== 1 ? 's' : ''}, ${setCount} sets`
  }, [draft])

  const handleSave = useCallback(async () => {
    if (!draft || isReadOnly || !dirty) return
    if (checkingWorkoutName || workoutNameExists || !draft.name.trim()) return
    setSaving(true)
    try {
      const msg = await updateWorkoutService(draft)
      const refreshed = await getWorkoutByIdService(draft.id)
      const next = refreshed ?? draft
      setDraft(next)
      setOriginalWorkoutName(next.name ?? '')
      setDirty(false)
      Toast.show({ type: 'success', text1: 'Success', text2: msg })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update workout'
      Toast.show({ type: 'error', text1: 'Save failed', text2: message })
    } finally {
      setSaving(false)
    }
  }, [checkingWorkoutName, dirty, draft, getWorkoutByIdService, isReadOnly, workoutNameExists])

  const handleCreateSession = async () => {
    if (!draft) return
    setCreatingSession(true)
    Toast.show({
      type: 'info',
      text1: 'Offline mode',
      text2: 'Starting session from workout will be available when session flow is wired to local.',
    })
    setCreatingSession(false)
  }

  if (!draft && loading) {
    return <View style={[styles.container, styles.errorContainer, { backgroundColor: colors.screen }]} />
  }

  if (!loading && error && !draft) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => id && fetchWorkout(id)}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!loading && !draft) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Workout not found</Text>
      </View>
    )
  }

  if (!draft) {
    return null
  }

  const workoutDetailContent = (
    <>
      <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.nameRow}>
              {isReadOnly ? (
                <Text style={styles.workoutName}>{draft.name}</Text>
              ) : (
                <TextInput
                  style={[
                    styles.workoutNameInput,
                    dirty && styles.workoutNameInputDirty,
                    !draft.name.trim() && styles.workoutNameInputRequired,
                    workoutNameExists && styles.workoutNameInputError,
                  ]}
                  value={draft.name}
                  onChangeText={updateWorkoutName}
                  placeholder="Workout name"
                  placeholderTextColor={colors.placeholder}
                />
              )}
              {!isReadOnly && dirty && (
                <TouchableOpacity
                  style={[
                    styles.saveButtonSmall,
                    (saving || checkingWorkoutName || workoutNameExists || !draft.name.trim()) && styles.buttonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={saving || checkingWorkoutName || workoutNameExists || !draft.name.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Save workout"
                >
                  <Text style={styles.saveButtonSmallText}>
                    {checkingWorkoutName ? 'Checking…' : saving ? 'Saving…' : 'Save'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {!isReadOnly && workoutNameExists ? (
              <Text style={styles.inlineErrorText}>Workout name already exists</Text>
            ) : null}

            {summaryText && (
              <Text style={styles.workoutSummary}>
                {summaryText}
              </Text>
            )}
            <Text style={styles.workoutDate}>
              Created: {new Date(draft.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.startButton, creatingSession && styles.buttonDisabled]}
            onPress={handleCreateSession}
            disabled={creatingSession}
          >
            <Text style={styles.startButtonText}>Start Session</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        )}

        {draft.workoutExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercises in this workout</Text>
            {!isReadOnly && (
              <TouchableOpacity style={styles.addExerciseButton} onPress={() => openExercisePicker(null)}>
                <Ionicons name="add" size={20} color={colors.success} />
                <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.exercisesContainer}>
              {draft.workoutExercises.map((workoutExercise) => (
                <View key={workoutExercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>
                      {workoutExercise.order ?? 0}. {workoutExercise.exercise.name}
                    </Text>
                    {!isReadOnly && (
                      <View style={styles.exerciseActionButtons}>
                        <TouchableOpacity
                          style={styles.exerciseActionButton}
                          onPress={() => openExercisePicker(workoutExercise.id)}
                        >
                          <Ionicons name="swap-horizontal-outline" size={20} color={colors.success} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.exerciseActionButton}
                          onPress={() => removeExercise(workoutExercise.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {(() => {
                    const ex: any = workoutExercise.exercise as any
                    const body = ex?.bodyPart?.name as string | undefined
                    const equip = ex?.equipment?.name as string | undefined
                    const meta = [body, equip].filter(Boolean).join(' · ')
                    if (!meta) return null
                    return <Text style={styles.exerciseMeta}>{meta}</Text>
                  })()}

                  {workoutExercise.sets.length === 0 ? (
                    <Text style={styles.noSetsText}>No sets configured</Text>
                  ) : (
                    <>
                      <View style={styles.setsContainer}>
                        <View style={styles.tableHeaderContainer}>
                          <Text style={[styles.tableHeaderText, styles.tableHeaderColumn]}>Set</Text>
                          <Text style={[styles.tableHeaderText, styles.tableHeaderColumn]}>KG</Text>
                          <Text style={[styles.tableHeaderText, styles.tableHeaderColumn]}>Reps</Text>
                          <View style={styles.tableHeaderActions} />
                        </View>
                        {workoutExercise.sets.map((set) => {
                          const row = (
                            <View
                              style={[
                                styles.setRowContainer,
                                !isReadOnly &&
                                  set.targetReps === 0 &&
                                  styles.setRowInvalid,
                              ]}
                            >
                              <Text style={styles.setNumber}>{set.setNumber}</Text>
                              {isReadOnly ? (
                                <>
                                  <Text style={styles.setValue}>{set.targetWeight}</Text>
                                  <Text style={styles.setValue}>{set.targetReps}</Text>
                                </>
                              ) : (
                                <>
                                  <TextInput
                                    style={styles.setInput}
                                    value={set.targetWeight === 0 ? '' : set.targetWeight.toString()}
                                    onChangeText={(text) =>
                                      updateSetField(
                                        workoutExercise.id,
                                        set.id,
                                        'targetWeight',
                                        parseFloat(text) || 0
                                      )
                                    }
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={colors.placeholder}
                                  />
                                  <TextInput
                                    style={styles.setInput}
                                    value={set.targetReps === 0 ? '' : set.targetReps.toString()}
                                    onChangeText={(text) =>
                                      updateSetField(
                                        workoutExercise.id,
                                        set.id,
                                        'targetReps',
                                        parseInt(text) || 0
                                      )
                                    }
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={colors.placeholder}
                                  />
                                </>
                              )}
                              <View style={styles.setRowActions}>
                                {!isReadOnly && workoutExercise.sets.length > 1 && (
                                  <Ionicons
                                    name="chevron-back-outline"
                                    size={16}
                                    color={colors.error}
                                    style={styles.swipeIconHint}
                                  />
                                )}
                              </View>
                            </View>
                          )

                          if (!isReadOnly && workoutExercise.sets.length > 1) {
                            return (
                              <Swipeable
                                key={set.id}
                                renderRightActions={() => (
                                  <TouchableOpacity
                                    style={styles.swipeSetDelete}
                                    onPress={() => removeSet(workoutExercise.id, set.id)}
                                  >
                                    <Ionicons name="trash-outline" size={20} color={colors.primaryText} />
                                    <Text style={styles.swipeSetDeleteText}>Delete</Text>
                                  </TouchableOpacity>
                                )}
                                friction={2}
                                rightThreshold={40}
                              >
                                {row}
                              </Swipeable>
                            )
                          }

                          return <View key={set.id}>{row}</View>
                        })}
                      </View>

                      {!isReadOnly && (
                        <TouchableOpacity style={styles.addSetButton} onPress={() => addSet(workoutExercise.id)}>
                          <Ionicons name="add" size={18} color={colors.success} />
                          <Text style={styles.addSetButtonText}>Add Set</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              ))}
            </View>

            {!isReadOnly && (
              <TouchableOpacity style={styles.addExerciseButton} onPress={() => openExercisePicker(null)}>
                <Ionicons name="add" size={20} color={colors.success} />
                <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            )}
          </>
        )}
    </>
  )

  return (
    Platform.OS === 'ios' ? (
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {workoutDetailContent}
        </ScrollView>
      </KeyboardAvoidingView>
    ) : (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {workoutDetailContent}
      </ScrollView>
    )
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
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
  headerContent: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  workoutName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  workoutNameInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg,
  },
  workoutNameInputDirty: {
    // keep same style; hook for future styling
  },
  workoutNameInputRequired: {
    borderColor: colors.accent,
  },
  workoutNameInputError: {
    borderColor: colors.accent,
  },
  saveButtonSmall: {
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonSmallText: {
    color: colors.successText,
    fontSize: 14,
    fontWeight: '700',
  },
  workoutSummary: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  workoutDate: {
    fontSize: 14,
    color: colors.textMuted,
  },
  startButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: colors.successText,
    fontSize: 16,
    fontWeight: '600',
  },
  inlineErrorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
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
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  exerciseMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -10,
    marginBottom: 12,
  },
  exerciseActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exerciseActionButton: {
    padding: 6,
  },
  noSetsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  setsContainer: {
    marginTop: 8,
  },
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
  tableHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: colors.cardElevated,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  tableHeaderActions: {
    width: 24,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tableHeaderColumn: {
    flex: 1,
  },
  setRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  setNumber: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: colors.inputBg,
    color: colors.text,
  },
  setValue: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  setRowActions: {
    width: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  swipeIconHint: {
    opacity: 0.4,
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
})

export default WorkoutDetailScreen
