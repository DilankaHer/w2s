import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import React, { useCallback, useEffect, useState } from 'react'
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
import type { RootStackParamList } from '../../App'
import { getWorkoutByIdService } from '../services/workouts.service'
import { colors } from '../theme/colors'

type WorkoutDetailRouteProp = RouteProp<RootStackParamList, 'WorkoutDetail'>

type WorkoutDetail = NonNullable<Awaited<ReturnType<typeof getWorkoutByIdService>>>
type SetItem = WorkoutDetail['workoutExercises'][number]['sets'][number]

function WorkoutDetailScreen() {
  const route = useRoute<WorkoutDetailRouteProp>()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { id } = route.params
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingSession, setCreatingSession] = useState(false)
  const [editingSets, setEditingSets] = useState<Map<string, { targetReps: number; targetWeight: number }>>(new Map())

  const fetchWorkout = useCallback(async (workoutId: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getWorkoutByIdService(workoutId)
      setWorkout(data ?? null)
      setEditingSets(new Map())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) {
      fetchWorkout(id)
    }
  }, [id, fetchWorkout])

  useFocusEffect(
    useCallback(() => {
      if (id) fetchWorkout(id)
    }, [id, fetchWorkout])
  )

  const updateSetValue = (setId: string, field: 'targetReps' | 'targetWeight', value: number) => {
    setEditingSets((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(setId)
      if (!current) {
        let targetSet: SetItem | null = null
        for (const workoutExercise of workout?.workoutExercises ?? []) {
          const foundSet = workoutExercise.sets.find((s) => s.id === setId)
          if (foundSet) {
            targetSet = foundSet
            break
          }
        }
        if (targetSet) {
          newMap.set(setId, {
            targetReps: targetSet.targetReps,
            targetWeight: targetSet.targetWeight,
            [field]: value,
          })
        }
      } else {
        newMap.set(setId, { ...current, [field]: value })
      }
      return newMap
    })
  }

  const saveSetUpdate = async (set: SetItem) => {
    const edited = editingSets.get(set.id)
    if (!edited) return
    if (!workout || workout.isDefaultWorkout) return
    // TODO: local set update when offline persistence is wired
    setEditingSets((prev) => {
      const newMap = new Map(prev)
      newMap.delete(set.id)
      return newMap
    })
  }

  const handleCreateSession = async () => {
    if (!workout) return
    setCreatingSession(true)
    Toast.show({
      type: 'info',
      text1: 'Offline mode',
      text2: 'Starting session from workout will be available when session flow is wired to local.',
    })
    setCreatingSession(false)
  }

  if (!workout && loading) {
    return <View style={[styles.container, styles.errorContainer, { backgroundColor: colors.screen }]} />
  }

  if (!loading && error && !workout) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => id && fetchWorkout(id)}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!loading && !workout) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Workout not found</Text>
      </View>
    )
  }

  if (!workout) {
    return null
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >

        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <Text style={styles.workoutName}>{workout.name}</Text>
            {workout.workoutExercises.length > 0 && (
              <Text style={styles.workoutSummary}>
                {workout.workoutExercises.length} exercise{workout.workoutExercises.length !== 1 ? 's' : ''},{' '}
                {workout.workoutExercises.reduce((acc, ex) => acc + (ex.sets?.length ?? 0), 0)} sets
              </Text>
            )}
            <Text style={styles.workoutDate}>
              Created: {new Date(workout.createdAt).toLocaleDateString()}
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

        {workout.workoutExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercises in this workout</Text>
          </View>
        ) : (
          <View style={styles.exercisesContainer}>
            {workout.workoutExercises.map((workoutExercise) => (
              <View key={workoutExercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>
                  {workoutExercise.order ?? 0}. {workoutExercise.exercise.name}
                </Text>

                {workoutExercise.sets.length === 0 ? (
                  <Text style={styles.noSetsText}>No sets configured</Text>
                ) : (
                  <View style={styles.setsContainer}>
                    <View style={styles.tableHeader}>
                      <Text style={styles.tableHeaderText}>Set</Text>
                      <Text style={styles.tableHeaderText}>Weight (kg)</Text>
                      <Text style={styles.tableHeaderText}>Reps</Text>
                    </View>
                    {workoutExercise.sets.map((set) => {
                      const edited = editingSets.get(set.id)
                      const displayWeight = edited?.targetWeight ?? set.targetWeight
                      const displayReps = edited?.targetReps ?? set.targetReps
                      const readOnly = workout.isDefaultWorkout

                      return (
                        <View key={set.id} style={styles.setRow}>
                          <Text style={styles.setNumber}>{set.setNumber}</Text>
                          {readOnly ? (
                            <>
                              <Text style={styles.setValue}>{displayWeight}</Text>
                              <Text style={styles.setValue}>{displayReps}</Text>
                            </>
                          ) : (
                            <>
                              <TextInput
                                style={styles.setInput}
                                value={displayWeight === 0 ? '' : displayWeight.toString()}
                                onChangeText={(text) =>
                                  updateSetValue(set.id, 'targetWeight', parseFloat(text) || 0)
                                }
                                onFocus={() => {
                                  if (!editingSets.has(set.id)) {
                                    updateSetValue(set.id, 'targetWeight', set.targetWeight)
                                  }
                                }}
                                onBlur={() => {
                                  const edited = editingSets.get(set.id)
                                  if (edited) {
                                    saveSetUpdate(set)
                                  }
                                }}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={colors.placeholder}
                              />
                              <TextInput
                                style={styles.setInput}
                                value={displayReps === 0 ? '' : displayReps.toString()}
                                onChangeText={(text) =>
                                  updateSetValue(set.id, 'targetReps', parseInt(text) || 0)
                                }
                                onFocus={() => {
                                  if (!editingSets.has(set.id)) {
                                    updateSetValue(set.id, 'targetReps', set.targetReps)
                                  }
                                }}
                                onBlur={() => {
                                  const edited = editingSets.get(set.id)
                                  if (edited) {
                                    saveSetUpdate(set)
                                  }
                                }}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={colors.placeholder}
                              />
                            </>
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
      </ScrollView>
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
  workoutName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
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
  exerciseName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
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
})

export default WorkoutDetailScreen
