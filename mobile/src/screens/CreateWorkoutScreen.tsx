import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useState } from 'react'
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../App'
import { colors } from '../theme/colors'
import type { Exercises } from '../database/database.types'
import type { CreateWorkoutInput } from '../database/interfaces/workout.interface'
import { getExercisesService } from '../services/exercises.service'
import { checkWorkoutNameExistsService, createWorkoutService } from '../services/workouts.service'

type CreateWorkoutRouteProp = RouteProp<RootStackParamList, 'CreateWorkout'>

interface Set {
  setNumber: number
  targetReps: number
  targetWeight: number
}

interface WorkoutExercise {
  id: string
  order: number
  sets: Set[]
}

function CreateWorkoutScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const route = useRoute<CreateWorkoutRouteProp>()
  const params = route.params
  const insets = useSafeAreaInsets()
  const [workoutName, setWorkoutName] = useState('')
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([])
  const [showExerciseList, setShowExerciseList] = useState(false)
  const [replacingExerciseId, setReplacingExerciseId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exercises, setExercises] = useState<Exercises>([])
  const [workoutNameExists, setWorkoutNameExists] = useState(false)
  const [checkingWorkoutName, setCheckingWorkoutName] = useState(false)

  useEffect(() => {
    let active = true
    const name = workoutName.trim()

    if (!name) {
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
        // If name check fails, don't block saving.
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
  }, [workoutName])

  // Handle return from Exercises picker with selected exercise (only once: clear params first then update state)
  useFocusEffect(
    useCallback(() => {
      const selected = params?.selectedExercise
      const replacingId = params?.replacingExerciseId
      if (!selected) return
        // Clear params immediately so a re-run of this effect (e.g. when callback identity changes) won't process again
        ; (navigation as any).setParams({ selectedExercise: undefined, replacingExerciseId: undefined })

      const selectedId = selected.id

      // Ensure the new/selected exercise can be rendered immediately (avoids "Unknown" until refetch completes).
      setExercises((prev) => {
        if (prev.some((e) => e.id === selectedId)) return prev
        return [
          ...prev,
          {
            id: selectedId,
            name: selected.name,
            link: null,
            info: null,
            imageName: null,
            bodyPart: null,
            equipment: null,
            // Unknown here until refetch; keep type-safe and conservative.
            isDefaultExercise: false,
          },
        ]
      })

      const isReplace = typeof replacingId === 'string'
      if (isReplace) {
        setWorkoutExercises((prev) =>
          prev.map((ex) =>
            ex.id === replacingId ? { ...ex, id: selectedId } : ex
          )
        )
      } else {
        setWorkoutExercises((prev) => {
          const newOrder =
            prev.length > 0 ? Math.max(...prev.map((ex) => ex.order)) + 1 : 1
          return [
            ...prev,
            {
              id: selectedId,
              order: newOrder,
              sets: [{ setNumber: 1, targetReps: 0, targetWeight: 0 }],
            },
          ]
        })
      }
    }, [params?.selectedExercise, params?.replacingExerciseId, navigation])
  )

  const fetchExercisesInternal = useCallback(async () => {
    try {
      setError(null)
      const data = await getExercisesService()
      setExercises(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises')
    }
  }, [])

  useEffect(() => {
    fetchExercisesInternal()
  }, [fetchExercisesInternal])

  useFocusEffect(
    useCallback(() => {
      // Refresh list when coming back from CreateExercise/Picker.
      fetchExercisesInternal()
    }, [fetchExercisesInternal])
  )

  const addExercise = (exercise: Exercises[number]) => {
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
    (replacingId: string | null) => {
      const excludedExerciseIds =
        typeof replacingId === 'string'
          ? workoutExercises.filter((ex) => ex.id !== replacingId).map((ex) => ex.id)
          : workoutExercises.map((ex) => ex.id)
      navigation.navigate('ExercisePicker', {
        pickerFor: 'createWorkout',
        returnToRouteKey: route.key,
        excludedExerciseIds,
        ...(typeof replacingId === 'string' ? { replacingExerciseId: replacingId } : {}),
      })
    },
    [navigation, route.key, workoutExercises]
  )

  const replaceExercise = (exerciseId: string) => {
    setReplacingExerciseId(exerciseId)
    openExercisePicker(exerciseId)
  }

  const removeExercise = (exerciseId: string) => {
    const updated = workoutExercises
      .filter((ex) => ex.id !== exerciseId)
      .map((ex, index) => ({ ...ex, order: index + 1 }))
    setWorkoutExercises(updated)
  }

  const addSet = (exerciseId: string) => {
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

  const removeSet = (exerciseId: string, setNumber: number) => {
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
    exerciseId: string,
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
    if (!workoutName.trim()) {
      setError('Workout name is required')
      return
    }

    if (workoutExercises.length === 0) {
      setError('At least one exercise is required')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const workoutInput: CreateWorkoutInput = {
        name: workoutName.trim(),
        exercises: workoutExercises.map((ex) => ({
          exerciseId: ex.id,
          order: ex.order,
          sets: ex.sets.map((set) => ({
            setNumber: set.setNumber,
            targetReps: set.targetReps,
            targetWeight: set.targetWeight,
          })),
        })),
      }

      const msg = await createWorkoutService(workoutInput)
      Toast.show({ type: 'success', text1: 'Success', text2: msg })
      navigation.navigate('MainTabs' as never)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workout'
      setError(message)
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getExerciseName = (exerciseId: string) => {
    return exercises?.find((e) => e.id === exerciseId)?.name || 'Unknown'
  }

  const areAllSetsFilled = () => {
    if (workoutExercises.length === 0) return false
    return workoutExercises.some((ex) =>
      ex.sets.some((set) => set.targetReps > 0)
    )
  }

  const availableExercises = exercises.filter(
    (ex) => !workoutExercises.some((we) => we.id === ex.id)
  )

  const createWorkoutContent = (
    <>
    <View style={styles.headerCard}>
          <Text style={styles.title}>Create Workout</Text>
          <View style={styles.nameInputContainer}>
            <Text style={styles.label}>Workout Name</Text>
            <TextInput
              style={[
                styles.nameInput,
                !workoutName.trim() && styles.nameInputRequired,
                (error || workoutNameExists) && styles.nameInputError,
              ]}
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="Enter workout name"
              placeholderTextColor={colors.placeholder}
            />
            {workoutNameExists ? (
              <Text style={styles.errorText}>Workout name already exists</Text>
            ) : null}
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>
        </View>

        {workoutExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No exercises added. Tap Add Exercise to get started.
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
                            <View
                              style={[
                                styles.setRowContainer,
                                set.targetReps === 0 && styles.setRowInvalid,
                              ]}
                            >
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
            (submitting ||
              checkingWorkoutName ||
              workoutNameExists ||
              !workoutName.trim() ||
              workoutExercises.length === 0 ||
              !areAllSetsFilled()) &&
            styles.saveButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={
            submitting ||
            checkingWorkoutName ||
            workoutNameExists ||
            !workoutName.trim() ||
            workoutExercises.length === 0 ||
            !areAllSetsFilled()
          }
        >
          <Text style={styles.saveButtonText}>
            {checkingWorkoutName ? 'Checking…' : 'Save'}
          </Text>
        </TouchableOpacity>

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
    </>
  )

  return Platform.OS === 'ios' ? (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {createWorkoutContent}
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {createWorkoutContent}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen
  },
  content: {
    padding: 16,
    paddingBottom: 30,
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
  nameInputRequired: {
    borderColor: colors.accent,
  },
  nameInputError: {
    borderColor: colors.accent,
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
    marginTop: 4,
    marginBottom: 0,
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

export default CreateWorkoutScreen
