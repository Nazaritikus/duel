import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AdminApiError, useAdminApi } from './adminApi'
import { useAdminSession } from './sessionContext'

function linkError(location: { search: string; hash: string }): boolean {
  const params = new URLSearchParams(location.search)
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
  return params.has('error_description') || params.has('error') || hash.has('error_description')
}

export function LoginPage() {
  const api = useAdminApi()
  const session = useAdminSession()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(
    linkError(location) ? 'Посилання недійсне або застаріле. Надішліть нове.' : null,
  )

  if (session.status === 'signed-in') return <Navigate to="/admin" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) return
    setState('sending')
    setError(null)
    try {
      await api.requestMagicLink(email)
      setState('sent')
    } catch (e) {
      setState('idle')
      setError(e instanceof AdminApiError ? e.message : 'Щось пішло не так. Спробуйте ще раз.')
    }
  }

  return (
    <main className="admin-center">
      <div className="admin-login">
        <div className="admin-nav__logo">
          DUEL <span>admin</span>
        </div>
        <h1 className="admin-title">Вхід</h1>
        {state === 'sent' ? (
          <div className="admin-login__sent" role="status">
            <p>
              Якщо адреса <strong>{email.trim()}</strong> має доступ, на неї надіслано посилання для
              входу.
            </p>
            <p className="admin-muted">Відкрийте його в цьому ж браузері.</p>
            <button type="button" className="admin-link-btn" onClick={() => setState('idle')}>
              Ввести іншу адресу
            </button>
          </div>
        ) : (
          <form className="admin-login__form" onSubmit={submit}>
            <label className="admin-label" htmlFor="admin-email">
              Електронна пошта
            </label>
            <input
              id="admin-email"
              className="admin-input"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={state === 'sending'}
            >
              {state === 'sending' ? 'Надсилаємо…' : 'Надіслати посилання'}
            </button>
          </form>
        )}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
