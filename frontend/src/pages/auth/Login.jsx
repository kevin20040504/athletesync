import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { errorMessage, fieldErrors } from '../../api/client'
import { useLogin } from '../../api/hooks'
import { Alert, Button, Field } from '../../components/ui'
import AuthShell from './AuthShell'

export default function Login() {
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '', remember: true })

  const errors = fieldErrors(login.error)
  const status = login.error?.response?.status
  const generalError = login.isError && status !== 422 ? errorMessage(login.error) : null
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  function submit(e) {
    e.preventDefault()
    login.mutate(form, {
      onSuccess: () => navigate(location.state?.from ?? '/', { replace: true }),
    })
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to see your week."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Alert>{generalError}</Alert>
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.remember} onChange={set('remember')} className="size-4 accent-[var(--accent)]" />
          Keep me logged in
        </label>
        <Button type="submit" loading={login.isPending} className="w-full">
          Log in
        </Button>
      </form>
    </AuthShell>
  )
}
