import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { errorMessage, fieldErrors } from '../../api/client'
import { useRegister } from '../../api/hooks'
import { Alert, Button, Field } from '../../components/ui'
import { browserTimezone } from '../../lib/dates'
import AuthShell from './AuthShell'

export default function Register() {
  const register = useRegister()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })

  const errors = fieldErrors(register.error)
  const generalError = register.isError && register.error?.response?.status !== 422 ? errorMessage(register.error) : null
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  function submit(e) {
    e.preventDefault()
    // The browser's timezone becomes the default for events and due dates.
    register.mutate({ ...form, timezone: browserTimezone() }, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Classes, training, games and deadlines in one place."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Alert>{generalError}</Alert>
        <Field label="Name" autoComplete="name" required value={form.name} onChange={set('name')} error={errors.name} />
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint="At least 8 characters."
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password_confirmation}
          onChange={set('password_confirmation')}
        />
        <Button type="submit" loading={register.isPending} className="w-full">
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
