import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { trpc } from '../api/client'
import { getApiErrorMessage } from '../api/errorMessage'
import type { RootStackParamList } from '../../App'
import { colors } from '../theme/colors'
import type { Exercise, ExerciseWithMeta } from '../types'

type ExercisePickerRouteProp = RouteProp<RootStackParamList, 'ExercisePicker'>

function ExercisePickerScreen() {
  const route = useRoute<ExercisePickerRouteProp>()
  const navigation = useNavigation<any>()
  const { pickerFor, sessionId, replacingExerciseId } = route.params ?? {}
  const [exercises, setExercises] = useState<ExerciseWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBodyPartId, setSelectedBodyPartId] = useState<number | null>(null)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null)
  const [bodyParts, setBodyParts] = useState<{ id: number; name: string }[]>([])
  const [equipmentList, setEquipmentList] = useState<{ id: number; name: string }[]>([])
  const [infoExercise, setInfoExercise] = useState<ExerciseWithMeta | null>(null)

  const fetchExercises = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const exercisesPromise = trpc.exercises.list.query() as Promise<ExerciseWithMeta[]>
      const bodyPartsPromise = trpc.exercises.filterBodyParts.query() as Promise<{ id: number; name: string }[]>
      const equipmentPromise = trpc.exercises.filterEquipment.query() as Promise<{ id: number; name: string }[]>
      const [exercisesData, bodyPartsData, equipmentData] = await Promise.all([
        exercisesPromise,
        bodyPartsPromise,
        equipmentPromise,
      ])
      setExercises(Array.isArray(exercisesData) ? exercisesData : [])
      setBodyParts(Array.isArray(bodyPartsData) ? bodyPartsData : [])
      setEquipmentList(Array.isArray(equipmentData) ? equipmentData : [])
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load exercises'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchExercises(false)
  }, [fetchExercises])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchExercises(true)
  }, [fetchExercises])

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return exercises.filter((ex) => {
      const matchBody = selectedBodyPartId == null || ex.bodyPart?.id === selectedBodyPartId
      const matchEquipment = selectedEquipmentId == null || ex.equipment?.id === selectedEquipmentId
      const matchSearch = !q || ex.name.toLowerCase().includes(q)
      return matchBody && matchEquipment && matchSearch
    })
  }, [exercises, searchQuery, selectedBodyPartId, selectedEquipmentId])

  const availableBodyParts = useMemo(() => {
    if (selectedEquipmentId == null) return bodyParts
    const map = new Map<number, { id: number; name: string }>()
    exercises
      .filter((ex) => ex.equipment?.id === selectedEquipmentId)
      .forEach((ex) => {
        if (ex.bodyPart?.id != null && ex.bodyPart?.name) {
          map.set(ex.bodyPart.id, { id: ex.bodyPart.id, name: ex.bodyPart.name })
        }
      })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, bodyParts, selectedEquipmentId])

  const availableEquipment = useMemo(() => {
    if (selectedBodyPartId == null) return equipmentList
    const map = new Map<number, { id: number; name: string }>()
    exercises
      .filter((ex) => ex.bodyPart?.id === selectedBodyPartId)
      .forEach((ex) => {
        if (ex.equipment?.id != null && ex.equipment?.name) {
          map.set(ex.equipment.id, { id: ex.equipment.id, name: ex.equipment.name })
        }
      })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, equipmentList, selectedBodyPartId])

  const onSelectBodyPart = useCallback(
    (id: number | null) => {
      setSelectedBodyPartId(id)
      if (id !== null && selectedEquipmentId != null) {
        const equipmentIdsForBodyPart = new Set(
          exercises.filter((ex) => ex.bodyPart?.id === id).map((ex) => ex.equipment?.id).filter((eid): eid is number => eid != null)
        )
        if (!equipmentIdsForBodyPart.has(selectedEquipmentId)) {
          setSelectedEquipmentId(null)
        }
      }
    },
    [selectedEquipmentId, exercises]
  )

  const onSelectEquipment = useCallback(
    (id: number | null) => {
      setSelectedEquipmentId(id)
      if (id !== null && selectedBodyPartId != null) {
        const bodyPartIdsForEquipment = new Set(
          exercises.filter((ex) => ex.equipment?.id === id).map((ex) => ex.bodyPart?.id).filter((bid): bid is number => bid != null)
        )
        if (!bodyPartIdsForEquipment.has(selectedBodyPartId)) {
          setSelectedBodyPartId(null)
        }
      }
    },
    [selectedBodyPartId, exercises]
  )

  const clearFilters = useCallback(() => {
    setSelectedBodyPartId(null)
    setSelectedEquipmentId(null)
    setSearchQuery('')
  }, [])

  const hasActiveFilters = selectedBodyPartId != null || selectedEquipmentId != null || searchQuery.trim().length > 0

  const handleSelectExercise = useCallback(
    (item: ExerciseWithMeta) => {
      const exercise: Exercise = { id: item.id, name: item.name }
      if (pickerFor === 'createWorkout') {
        navigation.navigate('CreateWorkout', {
          selectedExercise: exercise,
          ...(typeof replacingExerciseId === 'number' ? { replacingExerciseId } : {}),
        })
      } else if (pickerFor === 'session' && sessionId != null) {
        navigation.navigate('SessionDetail', {
          id: sessionId,
          selectedExercise: exercise,
        })
      }
    },
    [pickerFor, sessionId, replacingExerciseId, navigation]
  )

  const renderFilterChips = (
    label: string,
    options: { id: number; name: string }[],
    selectedId: number | null,
    onSelect: (id: number | null) => void
  ) => (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionLabel}>{label}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: -1, name: 'All' }, ...options]}
        keyExtractor={(item) => (item.id === -1 ? 'all' : String(item.id))}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => {
          const isAll = item.id === -1
          const isActive = isAll ? selectedId == null : selectedId === item.id
          return (
            <TouchableOpacity
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => onSelect(isAll ? null : item.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isAll ? `${label} All` : `${label} ${item.name}`}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>{item.name}</Text>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )

  const filterSection = (
    <View style={styles.filterSectionSticky}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search exercises"
          placeholderTextColor={colors.placeholder}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {renderFilterChips('Body part', availableBodyParts, selectedBodyPartId, onSelectBodyPart)}
      {renderFilterChips('Equipment', availableEquipment, selectedEquipmentId, onSelectEquipment)}
    </View>
  )

  const renderItem = ({ item }: { item: ExerciseWithMeta }) => {
    const bodyName = item.bodyPart?.name ?? '—'
    const equipName = item.equipment?.name ?? '—'
    const subtitle = [bodyName, equipName].filter((s) => s !== '—').join(' · ') || '—'
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelectExercise(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <View style={styles.cardImageSlot}>
          <View style={styles.imagePlaceholder}>
            {item.imageName ? null : (
              <Ionicons name="barbell-outline" size={28} color={colors.textSecondary} />
            )}
          </View>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.infoIconButton}
          onPress={() => setInfoExercise(item)}
          hitSlop={8}
          accessibilityLabel="Exercise info"
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  const renderInfoContent = (exercise: ExerciseWithMeta) => {
    const info = exercise.info
    let infoNode: React.ReactNode
    if (Array.isArray(info) && info.length > 0) {
      const strings = info.every((x): x is string => typeof x === 'string')
        ? info
        : info.map((x) => (typeof x === 'string' ? x : String(x)))
      infoNode = (
        <View style={styles.infoList}>
          {strings.map((line, i) => (
            <Text key={i} style={styles.infoBullet}>
              • {line}
            </Text>
          ))}
        </View>
      )
    } else if (typeof info === 'string' && info.trim()) {
      infoNode = <Text style={styles.infoParagraph}>{info}</Text>
    } else {
      infoNode = <Text style={styles.infoNone}>No info</Text>
    }
    return (
      <>
        <Text style={styles.infoSectionLabel}>Info</Text>
        {infoNode}
        {exercise.link ? (
          <TouchableOpacity
            style={styles.watchVideoButton}
            onPress={() => exercise.link && Linking.openURL(exercise.link)}
          >
            <Ionicons name="play-circle-outline" size={20} color={colors.primaryText} />
            <Text style={styles.watchVideoText}>Watch video</Text>
          </TouchableOpacity>
        ) : null}
      </>
    )
  }

  const renderEmpty = () => {
    if (loading) return null
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {exercises.length === 0 ? 'No exercises available.' : 'No exercises match your filters.'}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (error && exercises.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchExercises(false)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (loading && exercises.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading exercises…</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {filterSection}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, filteredExercises.length === 0 && styles.listContentEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        keyboardShouldPersistTaps="handled"
      />

      <Modal
        visible={!!infoExercise}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoExercise(null)}
      >
        <TouchableOpacity
          style={styles.infoOverlay}
          activeOpacity={1}
          onPress={() => setInfoExercise(null)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.infoModalBox}>
            {infoExercise ? (
              <View style={styles.infoModalInner}>
                <View style={styles.infoModalHeader}>
                  <Text style={styles.infoModalTitle} numberOfLines={2}>
                    {infoExercise.name}
                  </Text>
                  <TouchableOpacity onPress={() => setInfoExercise(null)} hitSlop={8}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.infoModalScroll}
                  contentContainerStyle={styles.infoModalScrollContent}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                >
                  {renderInfoContent(infoExercise)}
                </ScrollView>
              </View>
            ) : null}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.screen,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  filterSectionSticky: {
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.screen,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginHorizontal: 16,
    textTransform: 'uppercase',
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: colors.successBgDark,
    borderColor: colors.successBgDark,
  },
  filterPillText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  filterPillTextActive: {
    color: colors.successText,
  },
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImageSlot: {
    marginRight: 12,
  },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  clearButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  clearButtonText: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: '600',
  },
  infoIconButton: {
    padding: 4,
  },
  infoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  infoModalBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    maxWidth: '100%',
    width: 340,
    height: '80%',
    maxHeight: 560,
  },
  infoModalInner: {
    flex: 1,
    minHeight: 0,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  infoModalScroll: {
    flex: 1,
    minHeight: 0,
  },
  infoModalScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  infoSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoList: {
    marginBottom: 16,
  },
  infoBullet: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  infoParagraph: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
  },
  infoNone: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  watchVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  watchVideoText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
})

export default ExercisePickerScreen
