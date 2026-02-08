import { useFocusEffect, useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react'
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
import { trpc } from '../api/client'
import { getApiErrorMessage } from '../api/errorMessage'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../theme/colors'
import type { Template } from '../types'

type Filter = 'all' | 'default' | 'custom'

function TemplatesScreen() {
  const { workoutInfo, isLoading, checkAuth, isAuthenticated, serverDown, checkServerOnFocus } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [defaultTemplates, setDefaultTemplates] = useState<Template[]>([])
  const [defaultTemplatesLoading, setDefaultTemplatesLoading] = useState(true)
  const [defaultTemplatesFetched, setDefaultTemplatesFetched] = useState(false)
  const [startingWorkoutId, setStartingWorkoutId] = useState<number | null>(null)
  const navigation = useNavigation()

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        !isAuthenticated ? (
          <TouchableOpacity
            onPress={() => {
              const nav = navigation as any
              nav.navigate('Login')
            }}
            style={styles.headerLoginButton}
          >
            <Text style={styles.headerLoginText}>Login</Text>
          </TouchableOpacity>
        ) : null,
    })
  }, [navigation, isAuthenticated])

  useEffect(() => {
    if (!isLoading) {
      setDefaultTemplatesFetched(false)
      setDefaultTemplatesLoading(true)
      trpc.workouts.getTemplates
        .query({ isDefaultTemplate: true })
        .then((data) => {
          setDefaultTemplates(Array.isArray(data) ? data : [])
        })
        .catch(() => setDefaultTemplates([]))
        .finally(() => {
          setDefaultTemplatesFetched(true)
          setDefaultTemplatesLoading(false)
        })
    } else {
      if (isAuthenticated) setDefaultTemplatesFetched(false)
      setDefaultTemplatesLoading(false)
    }
  }, [isAuthenticated, isLoading])

  useFocusEffect(
    useCallback(() => {
      checkServerOnFocus()
      if (isAuthenticated) checkAuth({ silent: true })
    }, [checkServerOnFocus, checkAuth, isAuthenticated])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    if (isAuthenticated) {
      await checkAuth()
    }
    try {
      const data = await trpc.workouts.getTemplates.query({ isDefaultTemplate: true })
      setDefaultTemplates(Array.isArray(data) ? data : [])
    } catch {
      setDefaultTemplates([])
    }
    setRefreshing(false)
  }

  const userTemplates = isAuthenticated && (serverDown ? workoutInfo : !isLoading && workoutInfo) ? (workoutInfo?.workouts ?? []) : []

  const filteredTemplates = ((): Template[] => {
    if (filter === 'default') return defaultTemplates
    if (filter === 'custom') return userTemplates
    const customIds = new Set(userTemplates.map((t) => t.id))
    const defaultsOnly = defaultTemplates.filter((t) => !customIds.has(t.id))
    return [...userTemplates, ...defaultsOnly]
  })()

  const handleStartWorkout = async (template: Template) => {
    try {
      setStartingWorkoutId(template.id)
      const session = isAuthenticated
        ? await trpc.sessions.create.mutate({ workoutId: template.id })
        : await trpc.sessions.createUnprotected.mutate({ workoutId: template.id })
      navigation.navigate('SessionDetail' as never, { id: session.id, initialSession: session } as never)
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: getApiErrorMessage(err, 'Failed to start workout. Please try again.'),
      })
    } finally {
      setStartingWorkoutId(null)
    }
  }

  const handleTemplateClick = (id: number) => {
    const nav = navigation as any
    nav.navigate('TemplateDetail', { id })
  }

  const effectiveDefaultLoading = !defaultTemplatesFetched || defaultTemplatesLoading
  const hasNoTemplatesUnauth = defaultTemplatesFetched && !defaultTemplatesLoading && defaultTemplates.length === 0

  if (serverDown && isAuthenticated && workoutInfo === null) {
    return <View style={[styles.container, { backgroundColor: colors.screen }]} />
  }

  if (isLoading && isAuthenticated && !(serverDown && workoutInfo !== null)) {
    return <View style={styles.container} />
  }

  if (effectiveDefaultLoading) {
    return <View style={styles.container} />
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
        disabled={!isAuthenticated}
      >
        <Text style={[styles.filterPillText, filter === 'custom' && styles.filterPillTextActive, !isAuthenticated && styles.filterPillTextDisabled]}>
          Custom
        </Text>
      </TouchableOpacity>
    </View>
  )

  const renderTemplateCard = (template: Template) => {
    const exerciseCount = template.workoutExercises?.length ?? 0
    const setCount =
      template.workoutExercises?.reduce((acc, ex) => acc + (ex.sets?.length ?? 0), 0) ?? 0
    const meta =
      exerciseCount > 0 && setCount > 0
        ? `${exerciseCount} exercises • ${setCount} sets`
        : exerciseCount > 0
          ? `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}`
          : null
    const isDefault = template.isDefaultTemplate === true
    const starting = startingWorkoutId === template.id

    return (
      <View key={template.id} style={styles.templateCard}>
        <TouchableOpacity
          style={styles.templateCardTop}
          onPress={() => handleTemplateClick(template.id)}
          activeOpacity={0.7}
        >
          <View style={styles.templateCardMain}>
            <View style={styles.templateTitleRow}>
              <Text style={styles.templateName} numberOfLines={1}>
                {template.name}
              </Text>
              {isDefault && (
                <View style={styles.defaultTag}>
                  <Text style={styles.defaultTagText}>Default</Text>
                </View>
              )}
            </View>
            {meta ? <Text style={styles.templateMeta}>{meta}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.startWorkoutButton, starting && styles.buttonDisabled]}
          onPress={() => handleStartWorkout(template)}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <>
              <Ionicons name="play" size={20} color={colors.primaryText} />
              <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        {hasNoTemplatesUnauth ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Default Workouts</Text>
            <Text style={styles.emptyText}>Default workouts will appear here.</Text>
          </View>
        ) : (
          <>
            {renderFilterTabs()}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.content}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {defaultTemplates.map(renderTemplateCard)}
            </ScrollView>
          </>
        )}
      </View>
    )
  }

  const showEmptyCustom = filter === 'custom' && userTemplates.length === 0
  const showEmptyDefault = filter === 'default' && defaultTemplates.length === 0
  const showEmptyAll = filter === 'all' && filteredTemplates.length === 0

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
            <Text style={styles.sectionEmptyText}>Create your first workout to get started.</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                const nav = navigation as any
                nav.navigate('CreateTemplate')
              }}
            >
              <Text style={styles.createButtonText}>Create workout</Text>
            </TouchableOpacity>
          </View>
        ) : showEmptyDefault ? (
          <Text style={styles.sectionEmptyText}>No default workouts available.</Text>
        ) : showEmptyAll ? (
          <Text style={styles.sectionEmptyText}>No workouts.</Text>
        ) : (
          filteredTemplates.map(renderTemplateCard)
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
  headerLoginButton: {
    marginRight: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerLoginText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  filterPillTextActive: {
    color: colors.primaryText,
  },
  filterPillTextDisabled: {
    color: colors.textMuted,
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
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  createButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  templateCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  templateCardMain: {
    flex: 1,
    marginRight: 8,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  defaultTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryText,
  },
  templateMeta: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  startWorkoutButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
})

export default TemplatesScreen
