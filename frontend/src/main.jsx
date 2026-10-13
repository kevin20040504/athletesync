import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { router } from './router.jsx'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // The session expired mid-visit: mark the user signed out so the auth
    // gate redirects to /login instead of every page showing an error.
    onError: (error, query) => {
      if (error.response?.status === 401 && query.queryKey[0] !== 'user') {
        queryClient.setQueryData(['user'], null)
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: (count, error) => count < 1 && !(error.response?.status < 500),
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
