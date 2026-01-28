import { createTRPCProxyClient, httpLink } from '@trpc/client'
import type { AppRouter } from '../../../backend/trpc/types'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

// Get API base URL from Expo config or default
// On Android emulator, use 10.0.2.2 instead of localhost
const getApiBaseUrl = (): string => {
  // Try to get from Expo config first, then env var, then default
  const configUrl = 
    Constants.expoConfig?.extra?.apiBaseUrl ?? 
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 
    'http://localhost:3000'
  
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
        
        // Make request with cookies
        const response = await fetch(url, {
          ...options,
          headers: {
            ...(options?.headers || {}),
            ...(cookieHeader && { Cookie: cookieHeader }),
          },
        })
        
        // Extract and save new cookies from response
        // Note: React Native fetch may not expose Set-Cookie headers directly
        // Cookies are typically handled automatically by the platform, but we'll try to extract them
        try {
          const setCookieHeader = response.headers.get('Set-Cookie')
          if (setCookieHeader) {
            const newCookies = parseCookies(setCookieHeader)
            const updatedCookies = { ...storedCookies, ...newCookies }
            await saveCookies(updatedCookies)
          }
        } catch (err) {
          // Set-Cookie headers may not be accessible in React Native
          // Cookies should still work if the backend sets them properly
          console.warn('Could not extract Set-Cookie header:', err)
        }
        
        return response
      },
    }),
  ],
})
