import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import Toast from 'react-native-toast-message'
import type { RootStackParamList } from '../../App'
import { trpc } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Set, Template } from '../types'

type TemplateDetailRouteProp = RouteProp<RootStackParamList, 'TemplateDetail'>

function TemplateDetailScreen() {
  const route = useRoute<TemplateDetailRouteProp>()
  const navigation = useNavigation()
  const { isAuthenticated } = useAuth()
  const { id } = route.params
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingSession, setCreatingSession] = useState(false)
  const [editingSets, setEditingSets] = useState<Map<number, { targetReps: number; targetWeight: number }>>(new Map())

  useEffect(() => {
    if (id) {
      fetchTemplate(id)
    }
  }, [id])

  const fetchTemplate = async (templateId: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await trpc.workouts.getById.query({ id: templateId })
      setTemplate(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching template:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateSetValue = (setId: number, field: 'targetReps' | 'targetWeight', value: number) => {
    setEditingSets((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(setId)
      if (!current) {
        let targetSet: Set | null = null
        for (const templateExercise of template?.workoutExercises || []) {
          const foundSet = templateExercise.sets.find((s) => s.id === setId)
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

  const saveSetUpdate = async (set: Set) => {
    const edited = editingSets.get(set.id)
    if (!edited) return

    if (!template) return

    const updateData = {
      setId: set.id,
      targetWeight: edited.targetWeight,
      targetReps: edited.targetReps,
    }

    try {
      await trpc.sets.update.mutate(updateData)

      setTemplate((prev) => {
        if (!prev) return null
        return {
          ...prev,
          workoutExercises: prev.workoutExercises.map((templateExercise) => ({
            ...templateExercise,
            sets: templateExercise.sets.map((s) =>
              s.id === set.id
                ? {
                    ...s,
                    targetReps: edited.targetReps,
                    targetWeight: edited.targetWeight,
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
      setError(err instanceof Error ? err.message : 'Failed to update set')
    }
  }

  const handleCreateSession = async () => {
    if (!template) return

    try {
      setCreatingSession(true)
      setError(null)
      const session = isAuthenticated
        ? await trpc.sessions.create.mutate({ workoutId: template.id })
        : await trpc.sessions.createUnprotected.mutate({ workoutId: template.id })
      navigation.navigate('SessionDetail' as never, { id: session.id } as never)
    } catch (err) {
      console.error('Error creating session:', err)
      setError(err instanceof Error ? err.message : 'Failed to create session')
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to start workout. Please try again.',
      })
    } finally {
      setCreatingSession(false)
    }
  }

  // Only show error if we're not loading
  if (!loading && error && !template) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => id && fetchTemplate(id)}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Only show "Template not found" if we're not loading and there's no template
  if (!loading && !template) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Template not found</Text>
      </View>
    )
  }

  // Show nothing while loading (or return null to prevent flash)
  if (loading && !template) {
    return null
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <Text style={styles.templateName}>{template.name}</Text>
            <Text style={styles.templateDate}>
              Created: {new Date(template.createdAt).toLocaleDateString()}
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

        {template.workoutExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercises in this template</Text>
          </View>
        ) : (
          <View style={styles.exercisesContainer}>
            {template.workoutExercises.map((templateExercise) => (
              <View key={templateExercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>
                  {templateExercise.order + 1}. {templateExercise.exercise.name}
                </Text>

                {templateExercise.sets.length === 0 ? (
                  <Text style={styles.noSetsText}>No sets configured</Text>
                ) : (
                  <View style={styles.setsContainer}>
                    <View style={styles.tableHeader}>
                      <Text style={styles.tableHeaderText}>Set</Text>
                      <Text style={styles.tableHeaderText}>Weight (kg)</Text>
                      <Text style={styles.tableHeaderText}>Reps</Text>
                    </View>
                    {templateExercise.sets.map((set) => {
                      const edited = editingSets.get(set.id)
                      const displayWeight = edited?.targetWeight ?? set.targetWeight
                      const displayReps = edited?.targetReps ?? set.targetReps

                      return (
                        <View key={set.id} style={styles.setRow}>
                          <Text style={styles.setNumber}>{set.setNumber}</Text>
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
                          />
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
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
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
  headerContent: {
    marginBottom: 16,
  },
  templateName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  templateDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  startButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  startButtonText: {
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
})

export default TemplateDetailScreen
