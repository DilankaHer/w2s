import { createTRPCProxyClient, httpLink } from '@trpc/client'
import type { AppRouter } from '../../../backend/trpc/types'

// Docker backend is exposed on port 3000; override with VITE_API_BASE_URL if needed
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpLink({
      url: API_BASE_URL,
      fetch(url: string | Request | URL, options: RequestInit | undefined) {
        return fetch(url, {
          ...options,
          credentials: 'include', // Include cookies in requests
        })
      },
    }),
  ],
})
