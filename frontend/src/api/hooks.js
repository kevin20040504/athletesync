import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, startOfDay } from 'date-fns'
import { useMemo, useState } from 'react'
import { rangeParams } from '../lib/dates'
import { api, fetchCsrfCookie } from './client'

/*
 * TanStack Query hooks for every API endpoint. Query keys:
 *   ['user'] · ['calendar', from, to] · ['conflicts', from, to]
 *   ['stats', from, to] · ['events', id] · ['tasks', status]
 * Mutations invalidate whatever they can change.
 */

const unwrap = (res) => res.data.data

// ---- auth -----------------------------------------------------------------

/** The signed-in user, or null when signed out (a 401 is not an error here). */
export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () =>
      api.get('/auth/user').then(unwrap, (error) => {
        if (error.response?.status === 401) return null
        throw error
      }),
    staleTime: Infinity,
    retry: false,
  })
}

function useAuthMutation(path) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body) => {
      await fetchCsrfCookie()
      return api.post(path, body).then(unwrap)
    },
    onSuccess: (user) => {
      // A different account may have signed in: drop everything cached.
      queryClient.clear()
      queryClient.setQueryData(['user'], user)
    },
  })
}

export const useLogin = () => useAuthMutation('/auth/login')
export const useRegister = () => useAuthMutation('/auth/register')

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(['user'], null)
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.patch('/auth/user', body).then(unwrap),
    onSuccess: (user) => queryClient.setQueryData(['user'], user),
  })
}

// ---- calendar, conflicts, stats --------------------------------------------

const rangeKey = (range) => [range.from.toISOString(), range.to.toISOString()]

export function useCalendar(range, options = {}) {
  return useQuery({
    queryKey: ['calendar', ...rangeKey(range)],
    queryFn: () => api.get('/calendar', { params: rangeParams(range) }).then(unwrap),
    placeholderData: (previous) => previous,
    ...options,
  })
}

export function useConflicts(range, options = {}) {
  return useQuery({
    queryKey: ['conflicts', ...rangeKey(range)],
    queryFn: () => api.get('/conflicts', { params: rangeParams(range) }).then(unwrap),
    placeholderData: (previous) => previous,
    ...options,
  })
}

export function useStats(range) {
  return useQuery({
    queryKey: ['stats', ...rangeKey(range)],
    queryFn: () => api.get('/stats', { params: rangeParams(range) }).then(unwrap),
  })
}

/** Conflicts a proposed event would cause. Pass null to skip. */
export function useConflictPreview(proposal) {
  return useQuery({
    queryKey: ['conflict-preview', proposal],
    queryFn: () => api.post('/conflicts/preview', proposal).then((res) => res.data),
    enabled: proposal !== null,
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    retry: false,
  })
}

// ---- events -----------------------------------------------------------------

export function useEvent(id) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => api.get(`/events/${id}`).then(unwrap),
    enabled: id != null,
  })
}

/** Everything derived from events: calendar, conflicts, stats, previews. */
function invalidateSchedule(queryClient) {
  for (const key of ['calendar', 'conflicts', 'stats', 'conflict-preview', 'events', 'tasks']) {
    queryClient.invalidateQueries({ queryKey: [key] })
  }
}

export function useSaveEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) =>
      (id ? api.patch(`/events/${id}`, body) : api.post('/events', body)).then(unwrap),
    onSuccess: () => invalidateSchedule(queryClient),
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/events/${id}`),
    onSuccess: () => invalidateSchedule(queryClient),
  })
}

// ---- tasks ------------------------------------------------------------------

export function useTasks(status = 'open') {
  return useQuery({
    queryKey: ['tasks', status],
    queryFn: () => api.get('/tasks', { params: { status } }).then(unwrap),
  })
}

function invalidateTasks(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['tasks'] })
  queryClient.invalidateQueries({ queryKey: ['stats'] })
}

export function useSaveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) =>
      (id ? api.patch(`/tasks/${id}`, body) : api.post('/tasks', body)).then(unwrap),
    onSuccess: () => invalidateTasks(queryClient),
  })
}

/** Tick a task done/undone, updating the open list immediately. */
export function useToggleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completed }) => api.patch(`/tasks/${id}`, { completed }).then(unwrap),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const snapshots = queryClient.getQueriesData({ queryKey: ['tasks'] })
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, completed } : t)),
      )
      return { snapshots }
    },
    onError: (_error, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: () => invalidateTasks(queryClient),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => invalidateTasks(queryClient),
  })
}

/**
 * Events a task can be linked to: everything on the calendar in the next
 * four months, one entry per event, academic ones first.
 */
export function useLinkableEvents() {
  const [range] = useState(() => {
    const from = startOfDay(new Date())
    return { from, to: addDays(from, 120) }
  })
  const calendar = useCalendar(range)

  return useMemo(() => {
    const byId = new Map()
    for (const o of calendar.data ?? []) {
      if (!byId.has(o.event_id)) byId.set(o.event_id, { id: o.event_id, title: o.title, category: o.category })
    }
    const academic = ['class', 'exam', 'study']
    return [...byId.values()].sort(
      (a, b) =>
        Number(!academic.includes(a.category)) - Number(!academic.includes(b.category)) || a.title.localeCompare(b.title),
    )
  }, [calendar.data])
}
