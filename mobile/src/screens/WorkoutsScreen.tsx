import { useFocusEffect, useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import Toast from 'react-native-toast-message'
import { getWorkoutsService } from '../services/workouts.service'
import { colors } from '../theme/colors'

type Filter = 'all' | 'default' | 'custom'

type WorkoutItem = Awaited<ReturnType<typeof getWorkoutsService>>[number]

function WorkoutsScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [startingWorkoutId, setStartingWorkoutId] = useState<string | null>(null)
  const navigation = useNavigation()

  const loadWorkouts = useCallback(async () => {
    try {
      const data = await getWorkoutsService()
      setWorkouts(Array.isArray(data) ? data : [])
    } catch {
      setWorkouts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    loadWorkouts()
  }, [loadWorkouts])

  useFocusEffect(
    useCallback(() => {
      loadWorkouts()
    }, [loadWorkouts])
  )

  const onRefresh = () => {
    setRefreshing(true)
    loadWorkouts()
  }

  const filteredWorkouts = ((): WorkoutItem[] => {
    if (filter === 'default') return workouts.filter((w) => w.isDefaultWorkout === true)
    if (filter === 'custom') return workouts.filter((w) => w.isDefaultWorkout !== true)
    return workouts
  })()

  const handleStartWorkout = async (workout: WorkoutItem) => {
    setStartingWorkoutId(workout.id)
    // TODO: local session creation for offline
    Toast.show({
      type: 'info',
      text1: 'Offline mode',
      text2: 'Starting session from workout will be available when session flow is wired to local.',
    })
    setStartingWorkoutId(null)
  }

  const handleWorkoutClick = (id: string) => {
    const nav = navigation as any
    nav.navigate('WorkoutDetail', { id })
  }

  const renderFilterTabs = () => (
    <View style={styles.filterRow}>
      <TouchableOpacity
        style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>All</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterPill, filter === 'default' && styles.filterPillActive]}
        onPress={() => setFilter('default')}
      >
        <Text style={[styles.filterPillText, filter === 'default' && styles.filterPillTextActive]}>Default</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterPill, filter === 'custom' && styles.filterPillActive]}
        onPress={() => setFilter('custom')}
      >
        <Text style={[styles.filterPillText, filter === 'custom' && styles.filterPillTextActive]}>Custom</Text>
      </TouchableOpacity>
    </View>
  )

  const renderWorkoutCard = (workout: WorkoutItem) => {
    const exerciseCount = workout.exerciseCount ?? 0
    const setCount = workout.setCount ?? 0
    const meta =
      exerciseCount > 0 && setCount > 0
        ? `${exerciseCount} exercises • ${setCount} sets`
        : exerciseCount > 0
          ? `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}`
          : null
    const isDefault = workout.isDefaultWorkout === true
    const starting = startingWorkoutId === workout.id

    return (
      <View key={workout.id} style={styles.workoutCard}>
        <TouchableOpacity
          style={styles.workoutCardTop}
          onPress={() => handleWorkoutClick(workout.id)}
          activeOpacity={0.7}
        >
          <View style={styles.workoutCardMain}>
            <View style={styles.workoutTitleRow}>
              <Text style={styles.workoutName} numberOfLines={1}>
                {workout.name}
              </Text>
              {isDefault ? (
                <View style={styles.defaultTag}>
                  <Text style={styles.defaultTagText}>Default</Text>
                </View>
              ) : (
                <View style={styles.customTag}>
                  <Text style={styles.customTagText}>Custom</Text>
                </View>
              )}
            </View>
            {meta ? <Text style={styles.workoutMeta}>{meta}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.startWorkoutButton, starting && styles.buttonDisabled]}
          onPress={() => handleStartWorkout(workout)}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator size="small" color={colors.successText} />
          ) : (
            <>
              <Ionicons name="play" size={20} color={colors.successText} />
              <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return <View style={styles.container} />
  }

  const showEmpty = workouts.length === 0
  const showEmptyCustom = filter === 'custom' && filteredWorkouts.length === 0
  const showEmptyDefault = filter === 'default' && filteredWorkouts.length === 0
  const showEmptyAll = filter === 'all' && filteredWorkouts.length === 0

  if (showEmpty) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Workouts</Text>
          <Text style={styles.emptyText}>Workouts will appear here once added or synced.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {renderFilterTabs()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {showEmptyCustom ? (
          <View style={styles.sectionEmpty}>
            <Text style={styles.sectionEmptyText}>No custom workouts yet.</Text>
          </View>
        ) : showEmptyDefault ? (
          <Text style={styles.sectionEmptyText}>No default workouts available.</Text>
        ) : showEmptyAll ? (
          <Text style={styles.sectionEmptyText}>No workouts.</Text>
        ) : (
          filteredWorkouts.map(renderWorkoutCard)
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  sectionEmpty: {
    paddingVertical: 24,
  },
  sectionEmptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  workoutCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workoutCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workoutCardMain: {
    flex: 1,
    marginRight: 8,
  },
  workoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  defaultTag: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentText,
  },
  customTag: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    opacity: 0.7,
  },
  customTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentText,
  },
  workoutMeta: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  startWorkoutButtonText: {
    color: colors.successText,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
})

export default WorkoutsScreen
