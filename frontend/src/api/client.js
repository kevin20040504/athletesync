import axios from 'axios'

/**
 * Shared HTTP client for the Laravel API.
 * - Same-origin requests (proxied by Vite in dev), so cookies are sent.
 * - Axios copies the XSRF-TOKEN cookie into the X-XSRF-TOKEN header,
 *   which Laravel checks on state-changing requests.
 */
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

/** Must be called once before login/register to obtain the CSRF cookie. */
export function fetchCsrfCookie() {
  return axios.get('/sanctum/csrf-cookie', { withCredentials: true })
}

// 419 = the CSRF token expired (e.g. the tab sat open overnight).
// Fetch a fresh one and retry the request once.
api.interceptors.response.use(undefined, async (error) => {
  const { config, response } = error
  if (response?.status === 419 && config && !config._csrfRetried) {
    config._csrfRetried = true
    await fetchCsrfCookie()
    return api(config)
  }
  return Promise.reject(error)
})

/** Laravel validation errors as { field: 'first message' }, or {}. */
export function fieldErrors(error) {
  const errors = error?.response?.data?.errors ?? {}
  return Object.fromEntries(Object.entries(errors).map(([field, messages]) => [field, messages[0]]))
}

/** A human-readable message for any failed request. */
export function errorMessage(error) {
  if (!error) return null
  if (!error.response) return 'Cannot reach the server. Check your connection and try again.'
  if (error.response.status === 429) return 'Too many attempts. Wait a minute and try again.'
  return error.response.data?.message ?? 'Something went wrong. Please try again.'
}
