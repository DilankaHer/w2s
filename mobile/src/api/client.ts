import AsyncStorage from '@react-native-async-storage/async-storage'
import { createTRPCProxyClient, httpLink } from '@trpc/client'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import type { AppRouter } from '../../../backend/trpc/types'
import { triggerUnauthorized } from './onUnauthorized'
import { triggerServerUnreachable } from './onServerUnreachable'

const API_REQUEST_TIMEOUT_MS = 4_000

// Get API base URL from Expo config or default
// On Android emulator, use 10.0.2.2 instead of localhost
const getApiBaseUrl = (): string => {
  // Try to get from Expo config first, then env var, then default
  const configUrl =
    Constants.expoConfig?.extra?.apiBaseUrl ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    'http://119.76.183.15:3000'

  // Replace localhost with 10.0.2.2 for Android emulator
  if (Platform.OS === 'android' && configUrl.includes('localhost')) {
    return configUrl.replace('localhost', '10.0.2.2')
  }

  return configUrl
}

const API_BASE_URL = getApiBaseUrl()

// Log the API URL for debugging (remove in production)
console.log('API Base URL:', API_BASE_URL)

// Cookie storage key
const COOKIE_STORAGE_KEY = '@w2s:cookies'

// Parse cookies from Set-Cookie header
function parseCookies(setCookieHeader: string | null): Record<string, string> {
  if (!setCookieHeader) return {}

  const cookies: Record<string, string> = {}
  const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]

  cookieStrings.forEach(cookieStr => {
    const parts = cookieStr.split(';')
    const [name, value] = parts[0].split('=')
    if (name && value) {
      cookies[name.trim()] = value.trim()
    }
  })

  return cookies
}

// Get cookies from storage
async function getStoredCookies(): Promise<Record<string, string>> {
  try {
    const stored = await AsyncStorage.getItem(COOKIE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Save cookies to storage
async function saveCookies(cookies: Record<string, string>) {
  try {
    await AsyncStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(cookies))
  } catch (error) {
    console.error('Error saving cookies:', error)
  }
}

/** Clear stored auth token (for testing unauthenticated flow / log out) */
export async function clearStoredAuth(): Promise<void> {
  try {
    await AsyncStorage.removeItem(COOKIE_STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing auth:', error)
  }
}

// Build cookie header string
function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpLink({
      url: `${API_BASE_URL}/trpc`,
      async fetch(url: string | Request | URL, options?: any) {
        // Get stored cookies
        const storedCookies = await getStoredCookies()
        const cookieHeader = buildCookieHeader(storedCookies)
        console.log('[API] Request:', typeof url === 'string' ? url : url.toString(), cookieHeader ? 'Cookie header present' : 'No cookie')

        // Log token when sending (for login/getWorkoutInfo debugging)
        const urlStr = typeof url === 'string' ? url : url.toString()
        if (storedCookies.auth_token && (urlStr.includes('users.login') || urlStr.includes('users.getWorkoutInfo'))) {
          console.log('[API] Token being sent:', storedCookies.auth_token)
        }

        // Make request with cookies and 4s timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS)
        let response: Response
        try {
          response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              ...(options?.headers || {}),
              ...(cookieHeader && { Cookie: cookieHeader }),
            },
          })
        } catch (err) {
          clearTimeout(timeoutId)
          triggerServerUnreachable()
          throw err
        }
        clearTimeout(timeoutId)

        // Log response for login and getWorkoutInfo (clone so we don't consume body)
        if (urlStr.includes('users.login') || urlStr.includes('users.getWorkoutInfo')) {
          response
            .clone()
            .json()
            .then((body) => {
              console.log('[API] Response', urlStr.includes('users.login') ? 'login' : 'getWorkoutInfo', 'status:', response.status, 'body:', JSON.stringify(body))
            })
            .catch(() =>
              response
                .clone()
                .text()
                .then((text) => console.log('[API] Response', urlStr.includes('users.login') ? 'login' : 'getWorkoutInfo', 'status:', response.status, 'body (text):', text))
            )
        }

        if (response.status === 401) {
          await clearStoredAuth()
          triggerUnauthorized()
        }

        // Persist auth token from X-Auth-Token header (mobile: backend sends token here since Set-Cookie is not readable in RN)
        try {
          const authTokenHeader = response.headers.get('X-Auth-Token')
          if (authTokenHeader) {
            const newCookies = parseCookies(authTokenHeader)
            console.log('[API] X-Auth-Token received, token:', newCookies.auth_token ?? '(no auth_token in header)')
            const updatedCookies = { ...storedCookies, ...newCookies }
            await saveCookies(updatedCookies)
          }
        } catch (err) {
          console.warn('Could not persist X-Auth-Token:', err)
        }

        return response
      },
    }),
  ],
})
