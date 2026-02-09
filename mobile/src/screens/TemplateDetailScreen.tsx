import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
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
import { getApiErrorMessage } from '../api/errorMessage'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../theme/colors'
import type { Set, Template } from '../types'

type TemplateDetailRouteProp = RouteProp<RootStackParamList, 'TemplateDetail'>

function TemplateDetailScreen() {
  const route = useRoute<TemplateDetailRouteProp>()
  const navigation = useNavigation()
  const { isAuthenticated, serverDown, isLoading: authLoading, checkServerOnFocus } = useAuth()
  const { id } = route.params
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingSession, setCreatingSession] = useState(false)
  const [editingSets, setEditingSets] = useState<Map<number, { targetReps: number; targetWeight: number }>>(new Map())
  const prevServerDownRef = useRef(serverDown)

  useEffect(() => {
    if (id) {
      fetchTemplate(id)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      checkServerOnFocus()
    }, [checkServerOnFocus])
  )

  const fetchTemplate = async (templateId: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await trpc.workouts.getById.query({ id: templateId })
      setTemplate(data)
      setEditingSets(new Map())
    } catch (err) {
      setError(getApiErrorMessage(err, 'An error occurred'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (serverDown) prevServerDownRef.current = true
    else if (prevServerDownRef.current && !authLoading && !template && id) {
      fetchTemplate(id)
      prevServerDownRef.current = false
    } else if ((template || !id) && !authLoading) prevServerDownRef.current = false
    else if (!serverDown && !authLoading) prevServerDownRef.current = false
  }, [serverDown, authLoading, template, id])

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

    if (!template || template.isDefaultTemplate) return

    const updateData = {
      setId: set.id,
      targetWeight: edited.targetWeight,
      targetReps: edited.targetReps,
    }

    try {
      const updatedSet = await trpc.sets.update.mutate(updateData)

      setTemplate((prev) => {
        if (!prev) return null
        return {
          ...prev,
          workoutExercises: prev.workoutExercises.map((templateExercise) => ({
            ...templateExercise,
            sets: templateExercise.sets.map((s) =>
              s.id === updatedSet.id
                ? {
                    ...s,
                    targetReps: updatedSet.targetReps,
                    targetWeight: updatedSet.targetWeight,
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
      setEditingSets((prev) => {
        const newMap = new Map(prev)
        newMap.delete(set.id)
        return newMap
      })
      Toast.show({
        type: 'error',
        text1: 'Failed to update set',
      })
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
      ;(navigation as any).navigate('SessionDetail', { id: session.id, initialSession: session })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create session'))
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to start workout. Please try again.',
      })
    } finally {
      setCreatingSession(false)
    }
  }

  // Only show white when server is up and we have no template yet. When server is down always show content we have so overlay is the only change.
  if (!serverDown && !template && loading) {
    return <View style={[styles.container, styles.errorContainer, { backgroundColor: colors.screen }]} />
  }
  if (serverDown && !template) {
    return <View style={[styles.container, styles.errorContainer, { backgroundColor: colors.screen }]} />
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
        <Text style={styles.errorText}>Workout not found</Text>
      </View>
    )
  }

  // Show gray container while loading and no template (dialog takes priority; no content update until resolved)
  if (loading && !template) {
    return <View style={[styles.container, { backgroundColor: colors.screen }]} />
  }

  if (!template) {
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
            {template.workoutExercises.length > 0 && (
              <Text style={styles.templateSummary}>
                {template.workoutExercises.length} exercise{template.workoutExercises.length !== 1 ? 's' : ''},{' '}
                {template.workoutExercises.reduce((acc, ex) => acc + (ex.sets?.length ?? 0), 0)} sets
              </Text>
            )}
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
            <Text style={styles.emptyText}>No exercises in this workout</Text>
          </View>
        ) : (
          <View style={styles.exercisesContainer}>
            {template.workoutExercises.map((templateExercise) => (
              <View key={templateExercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>
                  {templateExercise.order ?? 0}. {templateExercise.exercise.name}
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
                      const readOnly = template.isDefaultTemplate

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
  templateName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  templateSummary: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  templateDate: {
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

export default TemplateDetailScreen
