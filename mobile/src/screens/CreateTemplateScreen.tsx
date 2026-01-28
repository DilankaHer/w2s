import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { trpc } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Exercise } from '../types'

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

function CreateTemplateScreen() {
  const navigation = useNavigation()
  const { checkAuth } = useAuth()
  const [templateName, setTemplateName] = useState('')
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([])
  const [showExerciseList, setShowExerciseList] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exercisesLoading, setExercisesLoading] = useState(true)

  useEffect(() => {
    fetchExercises()
  }, [])

  const fetchExercises = async () => {
    try {
      setExercisesLoading(true)
      const data = await trpc.exercises.list.query()
      setExercises(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching exercises:', err)
      setError(err instanceof Error ? err.message : 'Failed to load exercises')
    } finally {
      setExercisesLoading(false)
    }
  }

  const addExercise = (exercise: Exercise) => {
    const newOrder = workoutExercises.length
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
    setShowExerciseList(false)
  }

  const removeExercise = (exerciseId: number) => {
    const updated = workoutExercises
      .filter((ex) => ex.id !== exerciseId)
      .map((ex, index) => ({ ...ex, order: index }))
    setWorkoutExercises(updated)
  }

  const addSet = (exerciseId: number) => {
    setWorkoutExercises(
      workoutExercises.map((ex) => {
        if (ex.id === exerciseId) {
          const newSetNumber = ex.sets.length + 1
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                setNumber: newSetNumber,
                targetReps: 0,
                targetWeight: 0,
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
      setError('Template name is required')
      return
    }

    if (workoutExercises.length === 0) {
      setError('At least one exercise is required')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      await trpc.workouts.create.mutate({
        workout: {
          name: templateName.trim(),
          isTemplate: true,
          workoutExercises: workoutExercises.map((ex) => ({
            id: ex.id,
            order: ex.order,
            sets: ex.sets,
          })),
        },
      })

      // Refresh workout info to get the new template
      await checkAuth()
      navigation.navigate('MainTabs' as never)
    } catch (err) {
      console.error('Error creating template:', err)
      setError(err instanceof Error ? err.message : 'Failed to create template')
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err instanceof Error ? err.message : 'Failed to create template',
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>Create Template</Text>
          <View style={styles.nameInputContainer}>
            <Text style={styles.label}>Template Name</Text>
            <TextInput
              style={styles.nameInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Enter template name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          )}
        </View>

        {workoutExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No exercises added. Click "Add Exercise" to get started.
            </Text>
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => setShowExerciseList(true)}
            >
              <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {workoutExercises.map((workoutExercise) => (
              <View key={workoutExercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>
                    {workoutExercise.order + 1}. {getExerciseName(workoutExercise.id)}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeExerciseButton}
                    onPress={() => removeExercise(workoutExercise.id)}
                  >
                    <Text style={styles.removeExerciseButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>

                {workoutExercise.sets.length === 0 ? (
                  <Text style={styles.noSetsText}>No sets configured</Text>
                ) : (
                  <>
                    <View style={styles.setsContainer}>
                      <View style={styles.tableHeader}>
                        <Text style={styles.tableHeaderText}>Set</Text>
                        <Text style={styles.tableHeaderText}>Weight (kg)</Text>
                        <Text style={styles.tableHeaderText}>Reps</Text>
                        <Text style={styles.tableHeaderText}></Text>
                      </View>
                      {workoutExercise.sets.map((set) => (
                        <View key={set.setNumber} style={styles.setRow}>
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
                            placeholderTextColor="#9CA3AF"
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
                            placeholderTextColor="#9CA3AF"
                          />
                          <TouchableOpacity
                            style={[
                              styles.removeSetButton,
                              workoutExercise.sets.length === 1 && styles.removeSetButtonDisabled,
                            ]}
                            onPress={() => removeSet(workoutExercise.id, set.setNumber)}
                            disabled={workoutExercise.sets.length === 1}
                          >
                            <Text
                              style={[
                                styles.removeSetButtonText,
                                workoutExercise.sets.length === 1 && styles.removeSetButtonTextDisabled,
                              ]}
                            >
                              ×
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={styles.addSetButton}
                      onPress={() => addSet(workoutExercise.id)}
                    >
                      <Text style={styles.addSetButtonText}>Add Set</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => setShowExerciseList(true)}
            >
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
          disabled={submitting || workoutExercises.length === 0 || !areAllSetsFilled()}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
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
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  nameInputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorBoxText: {
    color: '#DC2626',
    fontSize: 14,
  },
  emptyContainer: {
    backgroundColor: '#fff',
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
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  exerciseCard: {
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
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  removeExerciseButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeExerciseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  removeSetButton: {
    padding: 8,
  },
  removeSetButtonDisabled: {
    opacity: 0.3,
  },
  removeSetButtonText: {
    fontSize: 24,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  removeSetButtonTextDisabled: {
    color: '#9CA3AF',
  },
  addSetButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addSetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addExerciseButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addExerciseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalItemText: {
    fontSize: 16,
    color: '#111827',
  },
  modalEmpty: {
    padding: 32,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
})

export default CreateTemplateScreen
