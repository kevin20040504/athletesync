import { useState } from 'react'
import { errorMessage, fieldErrors } from '../api/client'
import { useUpdateProfile, useUser } from '../api/hooks'
import { Alert, Button, Card, Field, PageHeader } from '../components/ui'
import { browserTimezone } from '../lib/dates'

const TIMEZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

export default function SettingsPage() {
  const { data: user } = useUser()
  const update = useUpdateProfile()
  const [form, setForm] = useState({ name: user.name, timezone: user.timezone })
  const [saved, setSaved] = useState(false)

  const errors = fieldErrors(update.error)
  const browserTz = browserTimezone()
  const options = TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES]

  function submit(e) {
    e.preventDefault()
    setSaved(false)
    update.mutate(form, { onSuccess: () => setSaved(true) })
  }

  return (
    <>
      <PageHeader title="Settings" />
      <Card title="Profile" className="max-w-xl">
        <form onSubmit={submit} className="space-y-4" noValidate>
          {update.isError && update.error?.response?.status !== 422 && <Alert>{errorMessage(update.error)}</Alert>}
          {saved && <Alert tone="success">Saved.</Alert>}

          <Field label="Email" value={user.email} disabled readOnly />
          <Field label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <Field
            label="Timezone"
            error={errors.timezone}
            hint="Repeating events keep their local time in this timezone, even when clocks change."
          >
            {(props) => (
              <select {...props} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                {options.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {form.timezone !== browserTz && (
            <Alert tone="warning">
              This device is set to {browserTz.replaceAll('_', ' ')}.{' '}
              <button type="button" className="font-medium underline" onClick={() => setForm({ ...form, timezone: browserTz })}>
                Use that instead
              </button>
            </Alert>
          )}

          <Button type="submit" loading={update.isPending}>
            Save
          </Button>
        </form>
      </Card>
    </>
  )
}
