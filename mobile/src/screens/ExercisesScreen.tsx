import { useFocusEffect } from '@react-navigation/native'
import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { trpc } from '../api/client'
import { getApiErrorMessage } from '../api/errorMessage'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../theme/colors'
import type { ExerciseWithMeta } from '../types'

function ExercisesScreen() {
  const { serverDown, checkServerOnFocus } = useAuth()
  const [exercises, setExercises] = useState<ExerciseWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBodyPartId, setSelectedBodyPartId] = useState<number | null>(null)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null)
  const [bodyParts, setBodyParts] = useState<{ id: number; name: string }[]>([])
  const [equipmentList, setEquipmentList] = useState<{ id: number; name: string }[]>([])

  const fetchExercises = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [exercisesData, bodyPartsData, equipmentData] = await Promise.all([
        trpc.exercises.list.query(),
        trpc.exercises.filterBodyParts.query(),
        trpc.exercises.filterEquipment.query(),
      ])
      setExercises(Array.isArray(exercisesData) ? (exercisesData as ExerciseWithMeta[]) : [])
      setBodyParts(Array.isArray(bodyPartsData) ? bodyPartsData : [])
      setEquipmentList(Array.isArray(equipmentData) ? equipmentData : [])
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load exercises'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (serverDown) return
      checkServerOnFocus()
      fetchExercises(true)
    }, [serverDown, checkServerOnFocus, fetchExercises])
  )

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
      <View style={styles.card}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
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
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
})

export default ExercisesScreen
