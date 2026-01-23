import { createTRPCProxyClient, httpLink } from '@trpc/client'
import type { AppRouter } from '../../../shared/api-types'

const API_BASE_URL = 'http://localhost:3000'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpLink({
      url: API_BASE_URL,
    }),
  ],
})
