// Keep the driver's current certificate + hostname verification semantics
// explicit, rather than relying on aliases that will change in pg 9.
export function databaseUrl(value: string): string {
  const url = new URL(value)
  const mode = url.searchParams.get('sslmode')
  if (url.searchParams.get('uselibpqcompat') !== 'true' && mode && ['prefer', 'require', 'verify-ca'].includes(mode)) {
    url.searchParams.set('sslmode', 'verify-full')
    return url.toString()
  }
  return value
}
