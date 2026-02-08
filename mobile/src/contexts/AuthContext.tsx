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
  const lastHealthCheckAtRef = useRef(0)
  const retryingRef = useRef(false)
  const onRetrySuccessRef = useRef<(() => void) | null>(null)

  const checkAuth = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    try {
      if (!silent) setIsLoading(true)
      setError(null)
      const result = await trpc.users.getWorkoutInfo.mutate()

      if (result) {
        setWorkoutInfo(result as unknown as WorkoutInfo)
        setIsAuthenticated(true)
        setServerDown(false)
      } else {
        setIsAuthenticated(false)
        setWorkoutInfo(null)
        await clearStoredAuth()
        showLoggedOutToast()
      }
    } catch (err) {
      if (isUnauthorizedError(err)) {
        setIsAuthenticated(false)
        setWorkoutInfo(null)
        await clearStoredAuth()
        showLoggedOutToast()
        setError(new Error('UNAUTHORIZED'))
      } else {
        setServerDown(true)
        setIsAuthenticated(false)
        setWorkoutInfo(null)
        setError(err instanceof Error ? err : new Error('Connection failed'))
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
    setIsLoading(true)
    setError(null)
    try {
      await runHealthCheck()
      await checkAuth()
      setServerDown(false)
      setHasEnteredApp(true)
      onRetrySuccessRef.current?.()
      onRetrySuccessRef.current = null
      Toast.show({
        type: 'success',
        text1: 'Connected',
        text2: 'Connection to server restored.',
      })
    } catch {
      setServerDown(true)
      Toast.show({
        type: 'error',
        text1: 'Connection failed',
        text2: 'Server is still down. Try again later.',
      })
    } finally {
      retryingRef.current = false
      setIsRetrying(false)
      setIsLoading(false)
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
