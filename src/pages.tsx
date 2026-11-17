import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main className="simple-page">
      <h1 className="simple-page__title">DUEL</h1>
      <Link to="/play">Демо-гра</Link>
    </main>
  )
}

export function AdminStub() {
  return (
    <main className="simple-page">
      <h1 className="simple-page__title">Адмінка — скоро</h1>
      <Link to="/">На головну</Link>
    </main>
  )
}
