export function canonicalJobUrl(value: string): string {
  try {
    const url = new URL(value)
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(?:gh_src|lever-source|ref|referrer|tracking)$/i.test(key)) url.searchParams.delete(key)
    }
    url.hash = ''
    url.searchParams.sort()
    url.pathname = url.pathname.replace(/\/apply\/?$/, '').replace(/\/$/, '') || '/'
    return url.toString()
  } catch { return value }
}
