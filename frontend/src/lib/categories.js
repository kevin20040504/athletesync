/**
 * Event categories. Keep in sync with App\Enums\EventCategory and the
 * --cat-* tokens in index.css.
 */
export const CATEGORIES = [
  { value: 'class', label: 'Class', group: 'academic' },
  { value: 'exam', label: 'Exam', group: 'academic' },
  { value: 'study', label: 'Study', group: 'academic' },
  { value: 'practice', label: 'Practice', group: 'athletic' },
  { value: 'game', label: 'Game', group: 'athletic' },
  { value: 'gym', label: 'Gym', group: 'athletic' },
  { value: 'recovery', label: 'Recovery', group: 'athletic' },
  { value: 'personal', label: 'Personal', group: 'personal' },
]

export const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value)?.label ?? value

export const categoryColor = (value) => `var(--cat-${value})`

export const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]
