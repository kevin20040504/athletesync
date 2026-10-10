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
