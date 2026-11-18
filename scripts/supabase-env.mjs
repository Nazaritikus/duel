// Resolves the Supabase URL and keys for scripts and DB tests.
// - local (default): read from `supabase status -o json` (the local Docker stack);
// - remote (`--remote`): read VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY /
//   SUPABASE_SECRET_KEY from .env.local, then .env (the first value wins, as in Vite).
// Key values are never printed.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function pick(obj, names) {
  for (const n of names) if (obj[n]) return obj[n]
  return undefined
}

export function localEnv() {
  let status
  try {
    const out = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    status = JSON.parse(out.slice(out.indexOf('{')))
  } catch (cause) {
    throw new Error(
      `Local Supabase is not running. Start Docker, then \`npm run db:start\`. (${cause instanceof Error ? cause.message.split('\n')[0] : cause})`,
      { cause },
    )
  }
  const env = {
    url: pick(status, ['API_URL', 'api_url']),
    publishableKey: pick(status, ['PUBLISHABLE_KEY', 'ANON_KEY', 'anon_key']),
    secretKey: pick(status, ['SECRET_KEY', 'SERVICE_ROLE_KEY', 'service_role_key']),
  }
  if (!env.url || !env.publishableKey || !env.secretKey) {
    throw new Error(
      `Unexpected \`supabase status\` output; keys: ${Object.keys(status).join(', ')}`,
    )
  }
  return env
}

export function remoteEnv() {
  // loadEnvFile never overwrites a variable that is already set, so the first file wins:
  // .env.local before .env, the same precedence as Vite.
  for (const file of ['.env.local', '.env']) {
    const path = join(root, file)
    if (existsSync(path)) process.loadEnvFile(path)
  }
  const env = {
    url: process.env.VITE_SUPABASE_URL,
    publishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY,
  }
  const missing = Object.entries({
    VITE_SUPABASE_URL: env.url,
    VITE_SUPABASE_PUBLISHABLE_KEY: env.publishableKey,
    SUPABASE_SECRET_KEY: env.secretKey,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length) throw new Error(`Missing in .env / .env.local: ${missing.join(', ')}`)
  return env
}

/** Splits `--remote` off the CLI args and returns the matching environment. */
export function resolveTarget(argv = process.argv.slice(2)) {
  const remote = argv.includes('--remote')
  const args = argv.filter((a) => a !== '--remote')
  return { remote, args, env: remote ? remoteEnv() : localEnv() }
}
