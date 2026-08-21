function requireEnv(name, fallback) {
  const value = import.meta.env[name] ?? fallback
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export const env = Object.freeze({
  apiUrl: requireEnv('VITE_API_URL', '/api/v1'),
})
