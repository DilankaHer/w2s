import { CommonActions, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Swipeable } from 'react-native-gesture-handler'
import Toast from 'react-native-toast-message'
import { getApiErrorMessage } from '../api/errorMessage'
import type { RootStackParamList } from '../../App'
import { colors } from '../theme/colors'
import { getExerciseByIdService, getExercisesService } from '../services/exercises.service'
import type { BodyPart, Equipment, Exercise } from '@shared/types/exercises.types'

type ChipOption = { id: string; name: string }
type ChipRow = { id: string; name: string }

function FilterChipsRow({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string
  options: ChipOption[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const listRef = useRef<FlatList<ChipRow> | null>(null)

  const data = useMemo<ChipRow[]>(() => [{ id: '__all__', name: 'All' }, ...options], [options])
  const selectedIndex = useMemo(() => {
    if (selectedId == null) return 0
    const idx = data.findIndex((x) => x.id === selectedId)
    return idx >= 0 ? idx : 0
  }, [data, selectedId])

  useEffect(() => {
    if (!listRef.current) return
    const t = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index: selectedIndex, viewPosition: 0.5, animated: true })
      } catch {
        // ignore
      }
    }, 0)
    return () => clearTimeout(t)
  }, [selectedIndex, data.length])

  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionLabel}>{label}</Text>
      <FlatList
        ref={(r) => {
          listRef.current = r
        }}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(item) => (item.id === '__all__' ? 'all' : item.id)}
        contentContainerStyle={styles.filterRow}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToOffset({
              offset: Math.max(0, info.averageItemLength * info.index - info.averageItemLength),
              animated: true,
            })
          }, 50)
        }}
        renderItem={({ item }) => {
          const isAll = item.id === '__all__'
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
}

type ExercisePickerRouteProp = RouteProp<RootStackParamList, 'ExercisePicker'>

function ExercisePickerScreen() {
  const route = useRoute<ExercisePickerRouteProp>()
  const navigation = useNavigation<any>()
  const { pickerFor, sessionId, replacingExerciseId, replacingWorkoutExerciseId, replacingSessionExerciseId, returnToRouteKey } = route.params ?? {}
  const [optionsExercises, setOptionsExercises] = useState<Exercise[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBodyPartId, setSelectedBodyPartId] = useState<string | null>(null)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([])
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null)
  const [infoExerciseFull, setInfoExerciseFull] = useState<Exercise | null>(null)
  const [infoLoading, setInfoLoading] = useState(false)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [infoReloadToken, setInfoReloadToken] = useState(0)

  const didMountSearchEffect = useRef(false)
  const openSwipeableRef = useRef<Swipeable | null>(null)

  const deriveBodyParts = useCallback((source: Exercise[]): BodyPart[] => {
    const map = new Map<string, BodyPart>()
    source.forEach((ex) => {
      if (ex.bodyPart) map.set(ex.bodyPart.id, ex.bodyPart)
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const deriveEquipment = useCallback((source: Exercise[]): Equipment[] => {
    const map = new Map<string, Equipment>()
    source.forEach((ex) => {
      if (ex.equipment) map.set(ex.equipment.id, ex.equipment)
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const fetchOptions = useCallback(async () => {
    try {
      const all = await getExercisesService(undefined, undefined, undefined)
      setOptionsExercises(all)
      setBodyParts(deriveBodyParts(all))
      setEquipmentList(deriveEquipment(all))
    } catch {
      // Best effort; list fetch will surface errors.
    }
  }, [deriveBodyParts, deriveEquipment])

  const fetchExercises = useCallback(
    async (silent: boolean, bodyPartId?: string, equipmentId?: string, search?: string) => {
      if (!silent) setLoading(true)
      setError(null)
      try {
        const data = await getExercisesService(bodyPartId, equipmentId, search)
        setExercises(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load exercises'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchOptions()
    fetchExercises(false, undefined, undefined, undefined)
  }, [fetchExercises, fetchOptions])

  useFocusEffect(
    useCallback(() => {
      // Close any open swipe row when returning to this screen.
      openSwipeableRef.current?.close()
      openSwipeableRef.current = null

      // Keep list fresh when returning from CreateExercise.
      fetchOptions()
      fetchExercises(
        true,
        selectedBodyPartId ?? undefined,
        selectedEquipmentId ?? undefined,
        searchQuery.trim() || undefined
      )
    }, [fetchExercises, fetchOptions, searchQuery, selectedBodyPartId, selectedEquipmentId])
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchExercises(
      true,
      selectedBodyPartId ?? undefined,
      selectedEquipmentId ?? undefined,
      searchQuery.trim() || undefined
    )
  }, [fetchExercises, searchQuery, selectedBodyPartId, selectedEquipmentId])

  useEffect(() => {
    if (!didMountSearchEffect.current) {
      didMountSearchEffect.current = true
      return
    }

    const t = setTimeout(() => {
      fetchExercises(
        true,
        selectedBodyPartId ?? undefined,
        selectedEquipmentId ?? undefined,
        searchQuery.trim() || undefined
      )
    }, 250)

    return () => clearTimeout(t)
  }, [fetchExercises, searchQuery, selectedBodyPartId, selectedEquipmentId])

  const availableBodyParts = useMemo(() => {
    if (selectedEquipmentId == null) return bodyParts
    const map = new Map<string, BodyPart>()
    optionsExercises
      .filter((ex) => ex.equipment?.id === selectedEquipmentId)
      .forEach((ex) => {
        if (ex.bodyPart) map.set(ex.bodyPart.id, ex.bodyPart)
      })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [optionsExercises, bodyParts, selectedEquipmentId])

  const availableEquipment = useMemo(() => {
    if (selectedBodyPartId == null) return equipmentList
    const map = new Map<string, Equipment>()
    optionsExercises
      .filter((ex) => ex.bodyPart?.id === selectedBodyPartId)
      .forEach((ex) => {
        if (ex.equipment) map.set(ex.equipment.id, ex.equipment)
      })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [optionsExercises, equipmentList, selectedBodyPartId])

  const onSelectBodyPart = useCallback(
    (id: string | null) => {
      const nextBodyPartId = id
      let nextEquipmentId = selectedEquipmentId

      setSelectedBodyPartId(nextBodyPartId)

      if (nextBodyPartId !== null && nextEquipmentId != null) {
        const isValidPair = optionsExercises.some(
          (ex) => ex.bodyPart?.id === nextBodyPartId && ex.equipment?.id === nextEquipmentId
        )
        if (!isValidPair) {
          nextEquipmentId = null
          setSelectedEquipmentId(null)
        }
      }

      fetchExercises(
        true,
        nextBodyPartId ?? undefined,
        nextEquipmentId ?? undefined,
        searchQuery.trim() || undefined
      )
    },
    [fetchExercises, optionsExercises, searchQuery, selectedEquipmentId]
  )

  const onSelectEquipment = useCallback(
    (id: string | null) => {
      const nextEquipmentId = id
      let nextBodyPartId = selectedBodyPartId

      setSelectedEquipmentId(nextEquipmentId)

      if (nextEquipmentId !== null && nextBodyPartId != null) {
        const isValidPair = optionsExercises.some(
          (ex) => ex.bodyPart?.id === nextBodyPartId && ex.equipment?.id === nextEquipmentId
        )
        if (!isValidPair) {
          nextBodyPartId = null
          setSelectedBodyPartId(null)
        }
      }

      fetchExercises(
        true,
        nextBodyPartId ?? undefined,
        nextEquipmentId ?? undefined,
        searchQuery.trim() || undefined
      )
    },
    [fetchExercises, optionsExercises, searchQuery, selectedBodyPartId]
  )

  const clearFilters = useCallback(() => {
    setSelectedBodyPartId(null)
    setSelectedEquipmentId(null)
    setSearchQuery('')
    fetchExercises(true, undefined, undefined, undefined)
  }, [fetchExercises])

  const hasActiveFilters = selectedBodyPartId != null || selectedEquipmentId != null || searchQuery.trim().length > 0

  const openCreateExercise = useCallback(() => {
    navigation.navigate('CreateExercise', {
      pickerFor,
      sessionId,
      returnToRouteKey,
      replacingExerciseId,
      replacingWorkoutExerciseId,
      replacingSessionExerciseId,
    })
  }, [
    navigation,
    pickerFor,
    replacingExerciseId,
    replacingSessionExerciseId,
    replacingWorkoutExerciseId,
    returnToRouteKey,
    sessionId,
  ])

  const openEditExercise = useCallback(
    (exerciseId: string) => {
      // Prevent editing default exercises at UI entrypoint
      const ex = exercises.find((x) => x.id === exerciseId)
      if (ex?.isDefaultExercise) return

      navigation.navigate('CreateExercise', {
        exerciseId,
        pickerFor,
        sessionId,
        returnToRouteKey,
        replacingExerciseId,
        replacingWorkoutExerciseId,
        replacingSessionExerciseId,
      })
    },
    [
      exercises,
      navigation,
      pickerFor,
      replacingExerciseId,
      replacingSessionExerciseId,
      replacingWorkoutExerciseId,
      returnToRouteKey,
      sessionId,
    ]
  )

  const handleSelectExercise = useCallback(
    (item: Exercise) => {
      const exercise = { id: item.id, name: item.name }
      if (pickerFor === 'createWorkout') {
        const nextParams =
          typeof replacingExerciseId === 'string'
            ? { selectedExercise: exercise, replacingExerciseId }
            : { selectedExercise: exercise }

        if (typeof returnToRouteKey === 'string' && returnToRouteKey.length > 0) {
          navigation.dispatch({
            ...CommonActions.setParams(nextParams),
            source: returnToRouteKey,
          })
          navigation.goBack()
          return
        }

        navigation.navigate('CreateWorkout', nextParams)
      } else if (pickerFor === 'workoutDetail') {
        const nextParams =
          typeof replacingWorkoutExerciseId === 'string'
            ? { selectedExercise: exercise, replacingWorkoutExerciseId }
            : { selectedExercise: exercise }

        if (typeof returnToRouteKey === 'string' && returnToRouteKey.length > 0) {
          navigation.dispatch({
            ...CommonActions.setParams(nextParams),
            source: returnToRouteKey,
          })
          navigation.goBack()
          return
        }

        Toast.show({
          type: 'error',
          text1: 'Navigation error',
          text2: 'Could not return selection to workout details.',
        })
      } else if (pickerFor === 'session' && sessionId != null) {
        const nextParams =
          typeof replacingSessionExerciseId === 'string'
            ? { selectedExercise: exercise, replacingSessionExerciseId }
            : { selectedExercise: exercise }

        if (typeof returnToRouteKey === 'string' && returnToRouteKey.length > 0) {
          navigation.dispatch({
            ...CommonActions.setParams(nextParams),
            source: returnToRouteKey,
          })
          navigation.goBack()
          return
        }

        navigation.navigate('SessionDetail', { id: sessionId, ...nextParams })
      }
    },
    [pickerFor, sessionId, replacingExerciseId, replacingWorkoutExerciseId, replacingSessionExerciseId, returnToRouteKey, navigation]
  )

  const filterSection = (
    <View style={styles.filterSectionSticky}>
      <TouchableOpacity
        style={styles.createExerciseButton}
        onPress={openCreateExercise}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Create new exercise"
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.primaryText} />
        <Text style={styles.createExerciseButtonText}>Create exercise</Text>
      </TouchableOpacity>
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
      <FilterChipsRow
        label="Body part"
        options={availableBodyParts}
        selectedId={selectedBodyPartId}
        onSelect={onSelectBodyPart}
      />
      <FilterChipsRow
        label="Equipment"
        options={availableEquipment}
        selectedId={selectedEquipmentId}
        onSelect={onSelectEquipment}
      />
    </View>
  )

  const renderItem = ({ item }: { item: Exercise }) => {
    const bodyName = item.bodyPart?.name ?? '—'
    const equipName = item.equipment?.name ?? '—'
    const subtitle = [bodyName, equipName].filter((s) => s !== '—').join(' · ') || '—'
    const canEdit = item.isDefaultExercise === false

    let rowSwipeable: Swipeable | null = null
    const closeRow = () => {
      rowSwipeable?.close()
      if (openSwipeableRef.current === rowSwipeable) {
        openSwipeableRef.current = null
      }
    }

    const card = (
      <TouchableOpacity
        style={styles.cardInner}
        onPress={() => handleSelectExercise(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <View style={styles.cardImageSlot}>
          <View style={styles.imagePlaceholder}>
            <Ionicons name="barbell-outline" size={28} color={colors.textSecondary} />
          </View>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.cardTrailing}>
          {canEdit ? (
            <View pointerEvents="none" style={styles.swipeHintWrap}>
              <Ionicons
                name="chevron-back-outline"
                size={16}
                color={colors.primary}
                style={styles.swipeHintIcon}
              />
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.infoIconButton}
            onPress={() => setInfoExercise(item)}
            hitSlop={8}
            accessibilityLabel="Exercise info"
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )

    if (!canEdit) {
      return <View style={styles.cardOuter}>{card}</View>
    }

    return (
      <View style={styles.cardOuter}>
        <Swipeable
          ref={(ref) => {
            rowSwipeable = ref
          }}
          renderRightActions={() => (
            <TouchableOpacity
              style={styles.swipeActionEdit}
              onPress={() => {
                closeRow()
                openEditExercise(item.id)
              }}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}
            >
              <Ionicons name="create-outline" size={20} color={colors.primaryText} />
            </TouchableOpacity>
          )}
          onSwipeableWillOpen={() => {
            if (openSwipeableRef.current && openSwipeableRef.current !== rowSwipeable) {
              openSwipeableRef.current.close()
            }
            openSwipeableRef.current = rowSwipeable
          }}
          onSwipeableWillClose={() => {
            if (openSwipeableRef.current === rowSwipeable) {
              openSwipeableRef.current = null
            }
          }}
          friction={2}
          rightThreshold={40}
        >
          {card}
        </Swipeable>
      </View>
    )
  }

  useEffect(() => {
    const id = infoExercise?.id
    if (!id) {
      setInfoExerciseFull(null)
      setInfoError(null)
      setInfoLoading(false)
      return
    }

    let active = true
    ;(async () => {
      setInfoLoading(true)
      setInfoError(null)
      setInfoExerciseFull(null)
      try {
        const data = await getExerciseByIdService(id)
        if (!active) return
        if (!data) throw new Error('Exercise not found')
        setInfoExerciseFull(data)
      } catch (err) {
        if (!active) return
        setInfoError(err instanceof Error ? err.message : 'Failed to load exercise info')
      } finally {
        if (!active) return
        setInfoLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [infoExercise?.id, infoReloadToken])

  const renderInfoContent = (exercise: Exercise | null) => {
    if (infoLoading) {
      return (
        <View style={styles.infoCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.infoLoadingText}>Loading…</Text>
        </View>
      )
    }
    if (infoError) {
      return (
        <View style={styles.infoCard}>
          <Text style={styles.infoErrorText}>{infoError}</Text>
          <TouchableOpacity
            style={styles.infoRetryButton}
            onPress={() => setInfoReloadToken((x) => x + 1)}
            activeOpacity={0.8}
          >
            <Text style={styles.infoRetryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )
    }
    if (!exercise) {
      return (
        <View style={styles.infoCard}>
          <Text style={styles.infoNone}>No info</Text>
        </View>
      )
    }

    const rawInfo = exercise.info
    let info: unknown = rawInfo
    if (typeof rawInfo === 'string' && rawInfo.trim()) {
      try {
        info = JSON.parse(rawInfo)
      } catch {
        info = rawInfo
      }
    }
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
    return <View style={styles.infoCard}>{infoNode}</View>
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
        data={exercises}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, exercises.length === 0 && styles.listContentEmpty]}
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
                <View style={styles.sheetHandle} />
                <View style={styles.infoModalHeader}>
                  <View style={styles.infoHeaderLeft}>
                    <View style={styles.infoHeaderIcon}>
                      <Ionicons name="barbell-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.infoHeaderText}>
                      <Text style={styles.infoModalTitle} numberOfLines={2}>
                        {infoExercise.name}
                      </Text>
                      <View style={styles.infoMetaRow}>
                        {infoExercise.bodyPart?.name ? (
                          <View style={styles.metaPill}>
                            <Text style={styles.metaPillText}>{infoExercise.bodyPart.name}</Text>
                          </View>
                        ) : null}
                        {infoExercise.equipment?.name ? (
                          <View style={styles.metaPill}>
                            <Text style={styles.metaPillText}>{infoExercise.equipment.name}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setInfoExercise(null)} hitSlop={8}>
                    <Ionicons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.infoModalScroll}
                  contentContainerStyle={styles.infoModalScrollContent}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                >
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionLabel}>Info</Text>
                    {renderInfoContent(infoExerciseFull)}
                    {infoExerciseFull?.link ? (
                      <TouchableOpacity
                        style={styles.watchVideoButton}
                        onPress={() => infoExerciseFull.link && Linking.openURL(infoExerciseFull.link)}
                      >
                        <Ionicons name="play-circle-outline" size={20} color={colors.primaryText} />
                        <Text style={styles.watchVideoText}>Watch video</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
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
  createExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  createExerciseButtonText: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: '800',
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
  cardOuter: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  cardTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  swipeHintWrap: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  swipeHintIcon: {
    opacity: 0.75,
  },
  swipeActionEdit: {
    backgroundColor: colors.primary,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
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
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  infoModalBox: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    height: '80%',
    maxHeight: 620,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginTop: 10,
    marginBottom: 4,
  },
  infoModalInner: {
    flex: 1,
    minHeight: 0,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  infoHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.successBgDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoHeaderText: {
    flex: 1,
  },
  infoModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
    marginBottom: 6,
  },
  infoMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 0,
  },
  metaPill: {
    backgroundColor: colors.screen,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 6,
  },
  metaPillText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.screen,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoModalScroll: {
    flex: 1,
    minHeight: 0,
  },
  infoModalScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  infoSection: {
    gap: 10,
  },
  infoSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: colors.screen,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  infoLoadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoErrorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  infoRetryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  infoRetryButtonText: {
    color: colors.primaryText,
    fontWeight: '800',
    fontSize: 13,
  },
  infoList: {
    gap: 10,
  },
  infoBullet: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  infoParagraph: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  infoNone: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
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
