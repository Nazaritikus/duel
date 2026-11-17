import { Link } from 'react-router-dom'

export function AdminStub() {
  return (
    <main className="simple-page">
      <h1 className="simple-page__title">Адмінка — скоро</h1>
      <Link to="/">До гри</Link>
    </main>
  )
}
