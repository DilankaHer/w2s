import { TRPCClientError } from '@trpc/client'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Toast from 'react-native-toast-message'
import { clearStoredAuth, trpc } from '../api/client'
import { setOnUnauthorized } from '../api/onUnauthorized'
import { setOnServerUnreachable } from '../api/onServerUnreachable'
import type { WorkoutInfo } from '../types'

const HEALTH_CHECK_TIMEOUT_MS = 2_000
const HEALTH_CHECK_COOLDOWN_MS = 3_000

function showLoggedOutToast() {
  Toast.show({
    type: 'info',
    text1: 'Logged out',
    text2: 'You have been logged out.',
  })
}

function isUnauthorizedError(err: unknown): boolean {
  if (err instanceof TRPCClientError) {
    const code = (err.data as any)?.code ?? (err.data as any)?.httpStatus
    return code === 'UNAUTHORIZED' || code === 401 || err.message?.includes('UNAUTHORIZED')
  }
  return false
}

interface AuthContextValue {
  isAuthenticated: boolean | null
  isLoading: boolean
  isRetrying: boolean
  serverDown: boolean
  hasEnteredApp: boolean
  workoutInfo: WorkoutInfo | null
  error: Error | null
  checkAuth: (options?: { silent?: boolean }) => Promise<void>
  retryServer: () => Promise<void>
  checkServerOnFocus: () => void
  registerOnRetrySuccess: (cb: () => void) => void
  unregisterOnRetrySuccess: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [serverDown, setServerDown] = useState(false)
  const [hasEnteredApp, setHasEnteredApp] = useState(false)
  const [workoutInfo, setWorkoutInfo] = useState<WorkoutInfo | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const serverDownRef = useRef(false)
  serverDownRef.current = serverDown
  const workoutInfoRef = useRef<WorkoutInfo | null>(null)
  workoutInfoRef.current = workoutInfo
  const isAuthenticatedRef = useRef<boolean | null>(null)
  isAuthenticatedRef.current = isAuthenticated
  const lastHealthCheckAtRef = useRef(0)
  const retryingRef = useRef(false)
  const onRetrySuccessRef = useRef<(() => void) | null>(null)
  // Refs to preserve state during retry - restore if retry fails
  const preservedWorkoutInfoRef = useRef<WorkoutInfo | null>(null)
  const preservedIsAuthenticatedRef = useRef<boolean | null>(null)
  const preservedServerDownRef = useRef<boolean>(false)

  const checkAuth = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    // Don't make API calls when server is down unless explicitly retrying
    if (serverDownRef.current && !retryingRef.current) {
      return
    }
    
    // During retry, preserve current state - don't modify workoutInfo or isAuthenticated
    const isRetryingNow = retryingRef.current
    const preservedWorkoutInfo = isRetryingNow ? workoutInfoRef.current : null
    const preservedIsAuthenticated = isRetryingNow ? isAuthenticatedRef.current : null
    
    try {
      if (!silent) setIsLoading(true)
      setError(null)
      const result = await trpc.users.getWorkoutInfo.mutate()

      if (result) {
        // During retry, only update state if retry succeeds (will be handled by retryServer)
        if (!isRetryingNow) {
          // Type assertion: API returns WorkoutInfo structure, but TypeScript infers optional properties
          // The API returns workouts without workoutExercises (simplified), but WorkoutInfo expects Workout[]
          setWorkoutInfo(result as unknown as WorkoutInfo)
          setIsAuthenticated(true)
          setServerDown(false)
        }
      } else {
        if (!isRetryingNow) {
          setIsAuthenticated(false)
          setWorkoutInfo(null)
          await clearStoredAuth()
          showLoggedOutToast()
        }
      }
    } catch (err) {
      if (isUnauthorizedError(err)) {
        if (!isRetryingNow) {
          setIsAuthenticated(false)
          setWorkoutInfo(null)
          await clearStoredAuth()
          showLoggedOutToast()
          setError(new Error('UNAUTHORIZED'))
        }
      } else {
        // Connection error: preserve existing state, only set serverDown
        // During retry, don't modify state - let retryServer handle restoration
        if (!isRetryingNow) {
          setServerDown(true)
          // Don't clear isAuthenticated or workoutInfo - preserve them so UI can show cached data
          setError(err instanceof Error ? err : new Error('Connection failed'))
        }
      }
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  const runHealthCheck = useCallback((): Promise<boolean> => {
    return Promise.race([
      trpc.server.healthCheck.query().then(() => true),
      new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), HEALTH_CHECK_TIMEOUT_MS)
      ),
    ])
  }, [])

  const retryServer = useCallback(async () => {
    retryingRef.current = true
    setIsRetrying(true)
    // Don't set isLoading during retry - it causes screens to clear their state
    // Use isRetrying flag instead for UI feedback
    
    // Preserve current state in refs before retry - restore if retry fails
    preservedWorkoutInfoRef.current = workoutInfoRef.current
    preservedIsAuthenticatedRef.current = isAuthenticatedRef.current
    preservedServerDownRef.current = serverDownRef.current
    
    setError(null)
    try {
      await runHealthCheck()
      // Call checkAuth silently to avoid setting isLoading which clears screen state
      // During retry, checkAuth won't modify state, so we need to fetch and update manually
      setServerDown(false)

      if (isAuthenticatedRef.current) {
        const result = await trpc.users.getWorkoutInfo.mutate()
        if (result) {
          // Type assertion: API returns WorkoutInfo structure, but TypeScript infers optional properties
          // The API returns workouts without workoutExercises (simplified), but WorkoutInfo expects Workout[]
          setWorkoutInfo(result as unknown as WorkoutInfo)
          setIsAuthenticated(true)
          setServerDown(false)
          setHasEnteredApp(true)
          onRetrySuccessRef.current?.()
          onRetrySuccessRef.current = null
          Toast.show({
            type: 'success',
            text1: 'Connected',
            text2: 'Connection to server restored.',
          })
        }
      }
    } catch (err) {
      // Retry failed - restore all preserved state exactly as it was before retry
      setServerDown(preservedServerDownRef.current)
      setWorkoutInfo(preservedWorkoutInfoRef.current)
      setIsAuthenticated(preservedIsAuthenticatedRef.current)
      Toast.show({
        type: 'error',
        text1: 'Connection failed',
        text2: 'Server is still down. Try again later.',
      })
    } finally {
      retryingRef.current = false
      setIsRetrying(false)
    }
  }, [runHealthCheck, checkAuth])

  const registerOnRetrySuccess = useCallback((cb: () => void) => {
    onRetrySuccessRef.current = cb
  }, [])

  const unregisterOnRetrySuccess = useCallback(() => {
    onRetrySuccessRef.current = null
  }, [])

  const initialLoad = useCallback(async () => {
    try {
      await runHealthCheck()
      await checkAuth()
      setHasEnteredApp(true)
    } catch {
      setServerDown(true)
      setIsAuthenticated(false)
      setIsLoading(false)
    }
  }, [runHealthCheck, checkAuth])

  const checkServerOnFocus = useCallback(() => {
    // Don't run health checks during retry - freeze everything
    if (retryingRef.current) return
    if (serverDownRef.current) return
    const now = Date.now()
    if (now - lastHealthCheckAtRef.current < HEALTH_CHECK_COOLDOWN_MS) return
    lastHealthCheckAtRef.current = now
    runHealthCheck()
      .then(() => {
        // Do not set serverDown(false) here - overlay only clears when user taps Retry and it succeeds
      })
      .catch(() => setServerDown(true))
  }, [runHealthCheck])

  useEffect(() => {
    initialLoad()
  }, [initialLoad])

  useEffect(() => {
    setOnUnauthorized(() => {
      setIsAuthenticated(false)
      setWorkoutInfo(null)
      showLoggedOutToast()
    })
    return () => setOnUnauthorized(null)
  }, [])

  useEffect(() => {
    setOnServerUnreachable(() => {
      if (!serverDownRef.current && !retryingRef.current) setServerDown(true)
    })
    return () => setOnServerUnreachable(null)
  }, [])

  const value: AuthContextValue = {
    isAuthenticated,
    isLoading,
    isRetrying,
    serverDown,
    hasEnteredApp,
    workoutInfo,
    error,
    checkAuth,
    retryServer,
    checkServerOnFocus,
    registerOnRetrySuccess,
    unregisterOnRetrySuccess,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
