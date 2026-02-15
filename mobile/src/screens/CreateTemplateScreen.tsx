import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import Ionicons from '@expo/vector-icons/Ionicons'
import Toast from 'react-native-toast-message'
import { trpc } from '../api/client'
import { getApiErrorMessage } from '../api/errorMessage'
import { useAuth } from '../hooks/useAuth'
import type { RootStackParamList } from '../../App'
import { colors } from '../theme/colors'
import type { Exercise } from '../types'

type CreateTemplateRouteProp = RouteProp<RootStackParamList, 'CreateTemplate'>

interface Set {
  setNumber: number
  targetReps: number
  targetWeight: number
}

interface WorkoutExercise {
  id: number
  order: number
  sets: Set[]
}

type CreateTemplatePhase = 'checking' | 'retry' | 'ready'

function CreateTemplateScreen() {
  const navigation = useNavigation()
  const route = useRoute<CreateTemplateRouteProp>()
  const params = route.params
  const {
    checkAuth,
    serverDown,
    isLoading: authLoading,
    checkServerOnFocus,
    registerOnRetrySuccess,
    unregisterOnRetrySuccess,
    isAuthenticated,
  } = useAuth()
  const [phase, setPhase] = useState<CreateTemplatePhase>('checking')
  const [templateName, setTemplateName] = useState('')
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([])
  const [showExerciseList, setShowExerciseList] = useState(false)
  const [replacingExerciseId, setReplacingExerciseId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exercisesLoading, setExercisesLoading] = useState(false)
  const [workoutNameExists, setWorkoutNameExists] = useState<boolean | null>(null)
  const workoutNameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevServerDownRef = React.useRef(serverDown)
  const initialCheckRunRef = React.useRef(false)

  // First time: health check, then show form or white + retry
  useEffect(() => {
    if (phase !== 'checking' || initialCheckRunRef.current) return
    initialCheckRunRef.current = true

    const runInitialCheck = async () => {
      try {
        await trpc.server.healthCheck.query()
        setPhase('ready')
        await fetchExercisesInternal(false)
      } catch {
        setPhase('retry')
      }
    }
    runInitialCheck()
  }, [phase])

  // Transition from retry → ready only when user taps Retry (via callback), not when serverDown flips from another tab/screen
  useEffect(() => {
    if (phase !== 'retry') return
    registerOnRetrySuccess(() => {
      setPhase('ready')
      fetchExercisesInternal(false)
    })
    return () => unregisterOnRetrySuccess()
  }, [phase, registerOnRetrySuccess, unregisterOnRetrySuccess])

  // When server comes back while already in form: silent refresh exercises only
  useEffect(() => {
    if (serverDown) {
      prevServerDownRef.current = true
      return
    }
    if (!prevServerDownRef.current) return
    prevServerDownRef.current = false

    if (phase === 'ready' && !authLoading) {
      fetchExercisesInternal(true)
    }
  }, [serverDown, authLoading, phase])

  useFocusEffect(
    useCallback(() => {
      checkServerOnFocus()
    }, [checkServerOnFocus])
  )

  // Handle return from Exercises picker with selected exercise (only once: clear params first then update state)
  useFocusEffect(
    useCallback(() => {
      const selected = params?.selectedExercise
      const replacingId = params?.replacingExerciseId
      if (!selected) return
      // Clear params immediately so a re-run of this effect (e.g. when callback identity changes) won't process again
      ;(navigation as any).setParams({ selectedExercise: undefined, replacingExerciseId: undefined })
      const isReplace = typeof replacingId === 'number'
      if (isReplace) {
        setWorkoutExercises((prev) =>
          prev.map((ex) =>
            ex.id === replacingId ? { ...ex, id: selected.id } : ex
          )
        )
      } else {
        setWorkoutExercises((prev) => {
          const newOrder =
            prev.length > 0 ? Math.max(...prev.map((ex) => ex.order)) + 1 : 1
          return [
            ...prev,
            {
              id: selected.id,
              order: newOrder,
              sets: [{ setNumber: 1, targetReps: 0, targetWeight: 0 }],
            },
          ]
        })
      }
    }, [params?.selectedExercise, params?.replacingExerciseId, navigation])
  )

  const fetchExercisesInternal = async (silent: boolean) => {
    try {
      if (!silent) setExercisesLoading(true)
      setError(null)
      const data = await trpc.exercises.list.query()
      setExercises(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load exercises'))
    } finally {
      setExercisesLoading(false)
    }
  }

  const checkWorkoutName = useCallback(async (value: string) => {
    if (!isAuthenticated) {
      setWorkoutNameExists(null)
      return
    }
    const trimmed = value.trim()
    if (!trimmed) {
      setWorkoutNameExists(null)
      return
    }
    try {
      const result = await trpc.workouts.checkWorkoutName.mutate({ name: trimmed })
      setWorkoutNameExists(result.exists)
    } catch {
      setWorkoutNameExists(null)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && phase === 'ready') {
      if (workoutNameCheckTimeoutRef.current) {
        clearTimeout(workoutNameCheckTimeoutRef.current)
        workoutNameCheckTimeoutRef.current = null
      }
      const trimmed = templateName.trim()
      if (!trimmed) {
        setWorkoutNameExists(null)
        return
      }
      workoutNameCheckTimeoutRef.current = setTimeout(() => {
        checkWorkoutName(trimmed)
        workoutNameCheckTimeoutRef.current = null
      }, 500) // 500ms debounce
      return () => {
        if (workoutNameCheckTimeoutRef.current) {
          clearTimeout(workoutNameCheckTimeoutRef.current)
        }
      }
    } else {
      setWorkoutNameExists(null)
    }
  }, [templateName, isAuthenticated, phase, checkWorkoutName])

  const addExercise = (exercise: Exercise) => {
    if (replacingExerciseId !== null) {
      // Replace existing exercise
      setWorkoutExercises(
        workoutExercises.map((ex) =>
          ex.id === replacingExerciseId
            ? {
                ...ex,
                id: exercise.id,
              }
            : ex
        )
      )
      setReplacingExerciseId(null)
    } else {
      // Add new exercise
      const newOrder = workoutExercises.length > 0
        ? Math.max(...workoutExercises.map(ex => ex.order)) + 1
        : 1
      const newExercise: WorkoutExercise = {
        id: exercise.id,
        order: newOrder,
        sets: [
          {
            setNumber: 1,
            targetReps: 0,
            targetWeight: 0,
          },
        ],
      }
      setWorkoutExercises([...workoutExercises, newExercise])
    }
    setShowExerciseList(false)
  }

  const openExercisePicker = useCallback(
    (replacingId: number | null) => {
      navigation.navigate('ExercisePicker', {
        pickerFor: 'createTemplate',
        ...(typeof replacingId === 'number' ? { replacingExerciseId: replacingId } : {}),
      })
    },
    [navigation]
  )

  const replaceExercise = (exerciseId: number) => {
    setReplacingExerciseId(exerciseId)
    openExercisePicker(exerciseId)
  }

  const removeExercise = (exerciseId: number) => {
    const updated = workoutExercises
      .filter((ex) => ex.id !== exerciseId)
      .map((ex, index) => ({ ...ex, order: index + 1 }))
    setWorkoutExercises(updated)
  }

  const addSet = (exerciseId: number) => {
    setWorkoutExercises(
      workoutExercises.map((ex) => {
        if (ex.id === exerciseId) {
          const newSetNumber = ex.sets.length + 1
          const lastSet = ex.sets[ex.sets.length - 1]
          const targetReps = lastSet?.targetReps ?? 0
          const targetWeight = lastSet?.targetWeight ?? 0
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                setNumber: newSetNumber,
                targetReps,
                targetWeight,
              },
            ],
          }
        }
        return ex
      })
    )
  }

  const removeSet = (exerciseId: number, setNumber: number) => {
    setWorkoutExercises(
      workoutExercises.map((ex) => {
        if (ex.id === exerciseId && ex.sets.length > 1) {
          const updatedSets = ex.sets
            .filter((set) => set.setNumber !== setNumber)
            .map((set, index) => ({
              ...set,
              setNumber: index + 1,
            }))
          return { ...ex, sets: updatedSets }
        }
        return ex
      })
    )
  }

  const updateSet = (
    exerciseId: number,
    setNumber: number,
    field: 'targetReps' | 'targetWeight',
    value: number
  ) => {
    setWorkoutExercises(
      workoutExercises.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((set) =>
              set.setNumber === setNumber
                ? { ...set, [field]: value }
                : set
            ),
          }
        }
        return ex
      })
    )
  }

  const handleSubmit = async () => {
    if (!templateName.trim()) {
      setError('Workout name is required')
      return
    }

    if (workoutExercises.length === 0) {
      setError('At least one exercise is required')
      return
    }

    // Check if workout name already exists (for authenticated users)
    if (isAuthenticated) {
      try {
        const nameCheck = await trpc.workouts.checkWorkoutName.mutate({ name: templateName.trim() })
        if (nameCheck.exists) {
          setError('A workout with this name already exists')
          return
        }
      } catch (err) {
        // If check fails, continue anyway (might be network issue)
      }
    }

    try {
      setSubmitting(true)
      setError(null)

      const workoutPayload = {
        workout: {
          name: templateName.trim(),
          isTemplate: true,
          workoutExercises: workoutExercises.map((ex) => ({
            id: ex.id,
            order: ex.order,
            sets: ex.sets,
          })),
        },
      }
      await trpc.workouts.create.mutate(workoutPayload)

      // Refresh workout info to get the new template
      await checkAuth()
      navigation.navigate('MainTabs' as never)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create workout'))
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create workout. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getExerciseName = (exerciseId: number) => {
    return exercises?.find((e) => e.id === exerciseId)?.name || 'Unknown'
  }

  const areAllSetsFilled = () => {
    if (workoutExercises.length === 0) return false
    return workoutExercises.some((ex) =>
      ex.sets.some((set) => set.targetReps > 0 && set.targetWeight > 0)
    )
  }

  const availableExercises = exercises.filter(
    (ex) => !workoutExercises.some((we) => we.id === ex.id)
  )

  // First time: white until health check passes; then retry dialog (overlay) or form. Already in form + server down: keep form, overlay on top.
  if (phase !== 'ready') {
    return <View style={[styles.container, { backgroundColor: colors.screen }]} />
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>Create Workout</Text>
          <View style={styles.nameInputContainer}>
            <Text style={styles.label}>Workout Name</Text>
            <TextInput
              style={[
                styles.nameInput,
                (workoutNameExists === true && isAuthenticated) || error
                  ? styles.nameInputError
                  : null,
              ]}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Enter workout name"
              placeholderTextColor={colors.placeholder}
            />
            {workoutNameExists === true && isAuthenticated && (
              <Text style={styles.errorText}>A workout with this name already exists</Text>
            )}
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>
        </View>

        {workoutExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No exercises added. Click "Add Exercise" to get started.
            </Text>
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => openExercisePicker(null)}
            >
              <Ionicons name="add" size={20} color={colors.success} />
              <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {workoutExercises.map((workoutExercise) => {
              return (
              <View key={workoutExercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>
                    {workoutExercise.order}. {getExerciseName(workoutExercise.id)}
                  </Text>
                  <View style={styles.exerciseActionButtons}>
                    <TouchableOpacity
                      style={styles.exerciseActionButton}
                      onPress={() => replaceExercise(workoutExercise.id)}
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
                </View>

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
                        const setRowContent = (
                          <View style={styles.setRowContainer}>
                            <Text style={styles.setNumber}>{set.setNumber}</Text>
                            <TextInput
                              style={styles.setInput}
                              value={set.targetWeight === 0 ? '' : set.targetWeight.toString()}
                              onChangeText={(text) =>
                                updateSet(
                                  workoutExercise.id,
                                  set.setNumber,
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
                                updateSet(
                                  workoutExercise.id,
                                  set.setNumber,
                                  'targetReps',
                                  parseInt(text) || 0
                                )
                              }
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor={colors.placeholder}
                            />
                            <View style={styles.setRowActions}>
                              {workoutExercise.sets.length > 1 && (
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

                        if (workoutExercise.sets.length > 1) {
                          return (
                            <Swipeable
                              key={set.setNumber}
                              renderRightActions={() => (
                                <TouchableOpacity
                                  style={styles.swipeSetDelete}
                                  onPress={() => removeSet(workoutExercise.id, set.setNumber)}
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
                        return <View key={set.setNumber}>{setRowContent}</View>
                      })}
                    </View>
                    <TouchableOpacity
                      style={styles.addSetButton}
                      onPress={() => addSet(workoutExercise.id)}
                    >
                      <Ionicons name="add" size={18} color={colors.success} />
                      <Text style={styles.addSetButtonText}>Add Set</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              )
            })}

            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => openExercisePicker(null)}
            >
              <Ionicons name="add" size={20} color={colors.success} />
              <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.saveButton,
            (submitting || workoutExercises.length === 0 || !areAllSetsFilled()) &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || workoutExercises.length === 0 || !areAllSetsFilled() || workoutNameExists === true}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showExerciseList}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowExerciseList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Exercise</Text>
              <TouchableOpacity onPress={() => setShowExerciseList(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            {availableExercises.length > 0 ? (
              <ScrollView style={styles.modalList}>
                {availableExercises.map((exercise) => (
                  <TouchableOpacity
                    key={exercise.id}
                    style={styles.modalItem}
                    onPress={() => addExercise(exercise)}
                  >
                    <Text style={styles.modalItemText}>{exercise.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No exercises available</Text>
              </View>
            )}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  nameInputContainer: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.inputBg,
    marginBottom: 0,
  },
  nameInputError: {
    borderColor: colors.error,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorBoxText: {
    color: colors.errorText,
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 0,
    marginBottom: 8,
  },
  emptyContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  exerciseCard: {
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
  tableHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  removeSetButton: {
    padding: 8,
  },
  removeSetButtonDisabled: {
    opacity: 0.3,
  },
  removeSetButtonText: {
    fontSize: 24,
    color: colors.error,
    fontWeight: 'bold',
  },
  removeSetButtonTextDisabled: {
    color: colors.placeholder,
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
  saveButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabled,
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.primaryText,
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.modal,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalEmpty: {
    padding: 32,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
})

export default CreateTemplateScreen
