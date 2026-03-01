import { CommonActions, useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import Ionicons from '@expo/vector-icons/Ionicons'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import type { BodyParts, Equipment, ExerciseById } from '../database/database.types'
import type { CreateExerciseInput, UpdateExerciseInput } from '../database/interfaces/exercise.interface'
import { colors } from '../theme/colors'
import {
  checkExerciseNameExistsService,
  createExerciseService,
  getBodyPartsService,
  getEquipmentService,
  getExerciseByIdService,
  updateExerciseService,
} from '../services/exercises.service'

type CreateExerciseRouteProp = RouteProp<RootStackParamList, 'CreateExercise'>

function CreateExerciseScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const route = useRoute<CreateExerciseRouteProp>()
  const insets = useSafeAreaInsets()

  const {
    pickerFor,
    sessionId,
    returnToRouteKey,
    replacingExerciseId,
    replacingWorkoutExerciseId,
    replacingSessionExerciseId,
    exerciseId,
  } = route.params ?? {}

  const showAddToParent = typeof pickerFor === 'string'
  const addToLabel = pickerFor === 'session' ? 'Add to session' : 'Add to workout'
  const isEdit = typeof exerciseId === 'string' && exerciseId.length > 0

  const [name, setName] = useState('')
  const [initialName, setInitialName] = useState('')
  const [link, setLink] = useState('')
  const [infoText, setInfoText] = useState('')
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyParts[number] | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[number] | null>(null)
  const [addToParent, setAddToParent] = useState(showAddToParent)

  const [bodyParts, setBodyParts] = useState<BodyParts>([])
  const [equipment, setEquipment] = useState<Equipment>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)

  const [showBodyPartModal, setShowBodyPartModal] = useState(false)
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)

  const [saving, setSaving] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)

  const [exerciseNameExists, setExerciseNameExists] = useState(false)
  const [checkingExerciseName, setCheckingExerciseName] = useState(false)
  const [didTouchName, setDidTouchName] = useState(false)

  const trimmedName = name.trim()
  const canSave =
    trimmedName.length > 0 &&
    selectedBodyPart != null &&
    selectedEquipment != null &&
    !saving &&
    !loadingExisting &&
    !checkingExerciseName &&
    !exerciseNameExists

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Edit Exercise' : 'Create Exercise',
    })
  }, [isEdit, navigation])

  useEffect(() => {
    let active = true
    const candidate = trimmedName
    const initial = initialName.trim()

    if (!candidate) {
      setExerciseNameExists(false)
      setCheckingExerciseName(false)
      return
    }

    setCheckingExerciseName(true)
    const t = setTimeout(async () => {
      try {
        const exists = await checkExerciseNameExistsService(candidate)
        if (!active) return
        // In edit mode, don't treat the current exercise name as a conflict.
        const isSameAsInitial =
          isEdit && initial.length > 0 && candidate.toLowerCase() === initial.toLowerCase()
        setExerciseNameExists(isSameAsInitial ? false : exists)
      } catch {
        if (!active) return
        // If name check fails, don't block saving.
        setExerciseNameExists(false)
      } finally {
        if (!active) return
        setCheckingExerciseName(false)
      }
    }, 500)

    return () => {
      active = false
      clearTimeout(t)
    }
  }, [initialName, isEdit, trimmedName])

  useEffect(() => {
    let active = true
    async function loadOptions() {
      setLoadingOptions(true)
      setOptionsError(null)
      try {
        const [bp, eq] = await Promise.all([getBodyPartsService(), getEquipmentService()])
        if (!active) return
        setBodyParts(Array.isArray(bp) ? bp : [])
        setEquipment(Array.isArray(eq) ? eq : [])
      } catch (err) {
        if (!active) return
        setOptionsError(err instanceof Error ? err.message : 'Failed to load options')
      } finally {
        if (!active) return
        setLoadingOptions(false)
      }
    }
    loadOptions()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!isEdit || !exerciseId) return
    let active = true
      ; (async () => {
        setLoadingExisting(true)
        try {
          const ex = await getExerciseByIdService(exerciseId)
          if (!active) return
          if (!ex) throw new Error('Exercise not found')
          if (ex.isDefaultExercise) {
            Toast.show({ type: 'error', text1: 'Not editable', text2: 'Default exercises cannot be edited.' })
            navigation.goBack()
            return
          }

          setName(ex.name ?? '')
          setInitialName(ex.name ?? '')
          setLink(ex.link ?? '')
          setSelectedBodyPart(ex.bodyPart ?? null)
          setSelectedEquipment(ex.equipment ?? null)

          const rawInfo = ex.info
          let lines: string[] = []
          if (Array.isArray(rawInfo)) {
            lines = rawInfo.length > 0 ? rawInfo.map((x) => (typeof x === 'string' ? x : String(x))) : []
          } else if (typeof rawInfo === 'string' && rawInfo.trim()) {
            try {
              const parsed = JSON.parse(rawInfo)
              if (Array.isArray(parsed)) {
                lines = parsed.length > 0 ? parsed.map((x) => (typeof x === 'string' ? x : String(x))) : []
              } else if (typeof parsed === 'string') {
                lines = [parsed]
              } else {
                lines = [rawInfo]
              }
            } catch {
              lines = [rawInfo]
            }
          }
          setInfoText(lines.join('\n'))
        } catch (err) {
          Toast.show({
            type: 'error',
            text1: 'Load failed',
            text2: err instanceof Error ? err.message : 'Could not load exercise',
          })
          navigation.goBack()
        } finally {
          if (!active) return
          setLoadingExisting(false)
        }
      })()

    return () => {
      active = false
    }
  }, [exerciseId, isEdit, navigation])

  const infoPayload = useMemo(() => {
    const lines = infoText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    return lines.length > 0 ? JSON.stringify(lines) : null
  }, [infoText])

  const linkPayload = useMemo(() => {
    const v = link.trim()
    return v.length > 0 ? v : null
  }, [link])

  const handleSave = useCallback(async () => {
    if (!canSave) return
    setSaving(true)
    try {
      if (!selectedBodyPart || !selectedEquipment) {
        Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Please select body part and equipment.' })
        return
      }
      if (checkingExerciseName) {
        Toast.show({ type: 'error', text1: 'Checking name…', text2: 'Please wait a moment and try again.' })
        return
      }
      if (exerciseNameExists) {
        Toast.show({ type: 'error', text1: 'Name exists', text2: 'An exercise with that name already exists.' })
        return
      }

      if (isEdit) {
        const payload: UpdateExerciseInput = {
          id: exerciseId as string,
          name: trimmedName,
          bodyPartId: selectedBodyPart.id,
          equipmentId: selectedEquipment.id,
          link: linkPayload ?? '',
          info: infoPayload ?? '',
        }
        const saved = await updateExerciseService(payload)
        if (!saved) throw new Error('Exercise could not be updated')
        Toast.show({ type: 'success', text1: 'Success', text2: 'Exercise updated' })
        if (showAddToParent && addToParent && typeof returnToRouteKey === 'string' && returnToRouteKey.length > 0) {
          const selectedExercise = { id: saved.id, name: saved.name }
          const nextParams: any = { selectedExercise }
          if (pickerFor === 'createWorkout' && typeof replacingExerciseId === 'string') nextParams.replacingExerciseId = replacingExerciseId
          else if (pickerFor === 'workoutDetail' && typeof replacingWorkoutExerciseId === 'string') nextParams.replacingWorkoutExerciseId = replacingWorkoutExerciseId
          else if (pickerFor === 'session' && typeof replacingSessionExerciseId === 'string') nextParams.replacingSessionExerciseId = replacingSessionExerciseId
          navigation.dispatch({ ...CommonActions.setParams(nextParams), source: returnToRouteKey })
          navigation.pop(2)
          return
        }
        navigation.goBack()
        return
      }
      const payload: CreateExerciseInput = {
        name: trimmedName,
        bodyPartId: selectedBodyPart.id,
        equipmentId: selectedEquipment.id,
        link: linkPayload ?? '',
        info: infoPayload ?? '',
      }
      const saved = await createExerciseService(payload)
      if (!saved) throw new Error('Exercise could not be created')

      Toast.show({ type: 'success', text1: 'Success', text2: 'Exercise created' })

      if (showAddToParent && addToParent && typeof returnToRouteKey === 'string' && returnToRouteKey.length > 0) {
        const selectedExercise = { id: saved.id, name: saved.name }
        const nextParams: any = { selectedExercise }

        if (pickerFor === 'createWorkout' && typeof replacingExerciseId === 'string') {
          nextParams.replacingExerciseId = replacingExerciseId
        } else if (pickerFor === 'workoutDetail' && typeof replacingWorkoutExerciseId === 'string') {
          nextParams.replacingWorkoutExerciseId = replacingWorkoutExerciseId
        } else if (pickerFor === 'session' && typeof replacingSessionExerciseId === 'string') {
          nextParams.replacingSessionExerciseId = replacingSessionExerciseId
        }

        navigation.dispatch({
          ...CommonActions.setParams(nextParams),
          source: returnToRouteKey,
        })

        // CreateExercise is always opened from ExercisePicker in this mode:
        // Origin (Workout/Session/CreateWorkout) -> ExercisePicker -> CreateExercise
        navigation.pop(2)
        return
      }

      navigation.goBack()
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Failed to create exercise'
      const message =
        raw.includes('UNIQUE') || raw.toLowerCase().includes('unique')
          ? 'An exercise with that name already exists.'
          : raw
      Toast.show({ type: 'error', text1: isEdit ? 'Update failed' : 'Create failed', text2: message })
    } finally {
      setSaving(false)
    }
  }, [
    addToParent,
    canSave,
    checkingExerciseName,
    checkExerciseNameExistsService,
    exerciseNameExists,
    exerciseId,
    infoPayload,
    initialName,
    isEdit,
    linkPayload,
    navigation,
    pickerFor,
    replacingExerciseId,
    replacingSessionExerciseId,
    replacingWorkoutExerciseId,
    returnToRouteKey,
    selectedBodyPart,
    selectedEquipment,
    showAddToParent,
    trimmedName,
  ])

  const Checkbox = (
    <Pressable
      style={styles.checkboxRow}
      onPress={() => setAddToParent((v) => !v)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: addToParent }}
      accessibilityLabel={addToLabel}
    >
      <Ionicons
        name={addToParent ? 'checkbox-outline' : 'square-outline'}
        size={22}
        color={addToParent ? colors.success : colors.textSecondary}
      />
      <Text style={styles.checkboxText}>{addToLabel}</Text>
    </Pressable>
  )

  const OptionsSection = (() => {
    if (loadingOptions) {
      return (
        <View style={styles.optionsLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.optionsLoadingText}>Loading options…</Text>
        </View>
      )
    }
    if (optionsError) {
      return (
        <View style={styles.optionsError}>
          <Text style={styles.optionsErrorText}>{optionsError}</Text>
          <TouchableOpacity onPress={() => {
            // re-run effect by toggling state
            setLoadingOptions(true)
            setOptionsError(null)
              ; (async () => {
                try {
                  const [bp, eq] = await Promise.all([getBodyPartsService(), getEquipmentService()])
                  setBodyParts(Array.isArray(bp) ? bp : [])
                  setEquipment(Array.isArray(eq) ? eq : [])
                } catch (err) {
                  setOptionsError(err instanceof Error ? err.message : 'Failed to load options')
                } finally {
                  setLoadingOptions(false)
                }
              })()
          }} style={styles.retryPill}>
            <Text style={styles.retryPillText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return null
  })()

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    items: { id: string; name: string }[],
    onSelect: (id: string) => void
  ) => {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={onClose} />
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.modalCloseButton}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              {items.length === 0 ? (
                <Text style={styles.modalEmpty}>No options</Text>
              ) : (
                items
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.modalItem}
                      onPress={() => onSelect(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={item.name}
                    >
                      <Text style={styles.modalItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    )
  }

  const formContent = (
    <>
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <View style={styles.nameFieldInner}>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setDidTouchName(true)
              setName(v)
            }}
            placeholder="e.g. Barbell Bench Press"
            placeholderTextColor={colors.placeholder}
            style={[
              styles.input,
              trimmedName.length === 0 && styles.inputRequired,
              exerciseNameExists && styles.inputError,
            ]}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />
          {didTouchName && trimmedName.length === 0 ? (
            <Text style={styles.nameRequiredText}>Name is required</Text>
          ) : checkingExerciseName ? (
            <Text style={styles.nameHelperText}>Checking name…</Text>
          ) : exerciseNameExists ? (
            <Text style={styles.nameErrorText}>Exercise name already exists</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Body part</Text>
        <TouchableOpacity
          style={[styles.selectRow, !selectedBodyPart && styles.selectRowError]}
          onPress={() => setShowBodyPartModal(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Select body part"
        >
          <Text style={[styles.selectValue, !selectedBodyPart && styles.selectPlaceholder]}>
            {selectedBodyPart?.name ?? 'Select…'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Equipment</Text>
        <TouchableOpacity
          style={[styles.selectRow, !selectedEquipment && styles.selectRowError]}
          onPress={() => setShowEquipmentModal(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Select equipment"
        >
          <Text style={[styles.selectValue, !selectedEquipment && styles.selectPlaceholder]}>
            {selectedEquipment?.name ?? 'Select…'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Link</Text>
        <TextInput
          value={link}
          onChangeText={setLink}
          placeholder="https://…"
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Info (one line per tip)</Text>
        <TextInput
          value={infoText}
          onChangeText={setInfoText}
          placeholder="Enter tips, one per line"
          placeholderTextColor={colors.placeholder}
          style={[styles.input, styles.infoMultilineInput]}
          autoCapitalize="sentences"
          autoCorrect={true}
          multiline
          textAlignVertical="top"
        />
      </View>

      {showAddToParent ? <View style={styles.section}>{Checkbox}</View> : null}

      {OptionsSection}

      <TouchableOpacity
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Save exercise"
      >
        {saving || loadingExisting ? (
          <ActivityIndicator size="small" color={colors.primaryText} />
        ) : (
          <>
            <Ionicons name={isEdit ? 'save-outline' : 'checkmark'} size={18} color={colors.primaryText} />
            <Text style={styles.saveButtonText}>{isEdit ? 'Update' : 'Save'}</Text>
          </>
        )}
      </TouchableOpacity>
    </>
  )

  const pickerModalContent = (
    <>
      {renderPickerModal(
        showBodyPartModal,
        () => setShowBodyPartModal(false),
        'Select body part',
        bodyParts,
        (id) => {
          const found = bodyParts.find((x) => x.id === id) ?? null
          setSelectedBodyPart(found)
          setShowBodyPartModal(false)
        }
      )}
      {renderPickerModal(
        showEquipmentModal,
        () => setShowEquipmentModal(false),
        'Select equipment',
        equipment,
        (id) => {
          const found = equipment.find((x) => x.id === id) ?? null
          setSelectedEquipment(found)
          setShowEquipmentModal(false)
        }
      )}
    </>
  )

  const createExerciseContent = (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.form}>
        {formContent}
        {pickerModalContent}
      </View>
    </ScrollView>
  )

  return (
    Platform.OS === 'ios' ? (
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        {createExerciseContent}
      </KeyboardAvoidingView>
    ) : (
      createExerciseContent
    )
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
  form: {
    gap: 20,
  },
  section: {
    gap: 8,
  },
  nameFieldInner: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.accent,
  },
  inputRequired: {
    borderColor: colors.accent,
  },
  nameHelperText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  nameRequiredText: {
    color: colors.accentLight,
    fontSize: 13,
    fontWeight: '700',
  },
  nameErrorText: {
    color: colors.errorText,
    fontSize: 13,
    fontWeight: '700',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectRowError: {
    borderColor: colors.accent,
  },
  selectValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    paddingRight: 10,
  },
  selectPlaceholder: {
    color: colors.placeholder,
    fontWeight: '500',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoMultilineInput: {
    minHeight: 120,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  checkboxText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '800',
  },
  optionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionsLoadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  optionsError: {
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionsErrorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  retryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryPillText: {
    color: colors.primaryText,
    fontWeight: '800',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.screen,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    padding: 10,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.screen,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  modalItemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  modalEmpty: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    padding: 14,
  },
})

export default CreateExerciseScreen

