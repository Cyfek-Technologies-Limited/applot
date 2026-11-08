import type { JobListing } from './sources'

export type SearchLocation = {
  location: string
  preferredLocations: string[]
  remoteOnly: boolean
}

const regions: Record<string, string[]> = {
  africa: ['NG', 'GH', 'KE', 'ZA', 'EG', 'MA', 'RW', 'UG', 'TZ', 'SN', 'CI', 'CM', 'ET'],
  europe: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'IE', 'PT', 'PL', 'SE', 'NO', 'DK', 'FI', 'CH', 'AT', 'BE', 'RO', 'UA', 'CZ', 'GR'],
  'north america': ['US', 'CA', 'MX'],
  'latin america': ['MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'UY', 'CR'],
  asia: ['IN', 'PK', 'BD', 'SG', 'JP', 'CN', 'KR', 'PH', 'ID', 'MY', 'TH', 'VN', 'AE', 'SA'],
  oceania: ['AU', 'NZ'],
}
const names = new Intl.DisplayNames(['en'], { type: 'region' })
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const countries = alphabet.flatMap(a => alphabet.map(b => a + b)).filter(code => names.of(code) !== code)
// Countries with a single, year-round UTC offset; otherwise do not guess the candidate's timezone.
const offsets: Record<string, number> = { NG: 1, GH: 0, KE: 3, UG: 3, TZ: 3, RW: 2, ZA: 2, IN: 5.5, SG: 8, JP: 9, PH: 8, AE: 4, SA: 3 }
const aliases: Record<string, string[]> = {
  NG: ['nigeria', 'lagos', 'abuja', 'ibadan', 'port harcourt', 'enugu', 'kano'],
  GB: ['uk', 'united kingdom', 'great britain', 'england', 'london', 'scotland'],
  US: ['us', 'usa', 'united states', 'united states of america'],
  ZA: ['south africa', 'cape town', 'johannesburg'],
  GH: ['ghana', 'accra'], KE: ['kenya', 'nairobi'],
}
const countryAliases: Record<string, string[]> = {
  GB: ['uk', 'great britain', 'england', 'scotland'],
  US: ['usa', 'united states of america'],
}
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
function contains(text: string, term: string) {
  return ` ${normalize(text)} `.includes(` ${normalize(term)} `)
}

export function countryCode(location: string): string | undefined {
  // Prefer an explicit country over a city with the same name in another country.
  for (const code of countries) {
    if ([names.of(code) ?? '', ...(countryAliases[code] ?? []), code].filter(Boolean).some(name => contains(location, name))) return code
  }
  for (const code of [...new Set(countries)]) {
    if ([names.of(code) ?? '', ...(aliases[code] ?? []), code].filter(Boolean).some(name => contains(location, name))) return code
  }
}

export function matchesLocation(job: JobListing, preferences: SearchLocation): boolean {
  if (preferences.remoteOnly && !job.remote) return false
  // Remote eligibility depends on where the candidate actually lives.
  const targets = job.remote ? [preferences.location] : preferences.preferredLocations.length
    ? preferences.preferredLocations : [preferences.location]
  if (!targets.some(Boolean)) return false
  const explicitRestriction = job.description?.match(/\b(?:applicants|candidates|you)\s+(?:must|need to|are required to)\s+(?:be\s+)?(?:based|located|resid(?:e|ent))\s+in\s+([^.;\n]{2,100})/i)?.[1]
  if (job.remote && explicitRestriction) {
    const requiredCountry = countryCode(explicitRestriction)
    const actualCountry = countryCode(preferences.location)
    if (requiredCountry && requiredCountry !== actualCountry) return false
  }
  if (job.allowedCountries?.length) {
    const actualCountry = countryCode(preferences.location)
    if (!actualCountry || !job.allowedCountries.some(value => countryCode(value) === actualCountry || value.toUpperCase() === actualCountry)) return false
  }
  if (job.timezoneRestricted) return false // Unknown working-hour availability must not be assumed.
  if (job.allowedOffsets?.length) {
    const country = countryCode(preferences.location)
    const offset = country ? offsets[country] : undefined
    if (offset === undefined || !job.allowedOffsets.includes(offset)) return false
  }
  const location = normalize(job.location)
  if (job.remote && /\b(except|excluding|not available|not hiring)\b/.test(location)) return false
  if (job.remote && /\b(worldwide|anywhere|global|work from anywhere)\b/.test(location)
    && !/\b(only|restricted)\b/.test(location)
    && !countries.some(code => [names.of(code) ?? '', ...(countryAliases[code] ?? []), code].filter(Boolean).some(value => contains(location, value)))) return true
  // "Remote" alone is not evidence of worldwide hiring eligibility.
  if (!location || location === 'remote') return false
  return targets.some(target => {
    const country = countryCode(target)
    if (country) {
      const advertisedCountries = [...new Set(countries)].filter(code =>
        [names.of(code) ?? '', ...(countryAliases[code] ?? []), code].filter(Boolean).some(value => contains(location, value)))
      if (!job.remote && advertisedCountries.length && !advertisedCountries.includes(country)) return false
      if (job.remote && advertisedCountries.length) return advertisedCountries.includes(country)
      if (job.remote && Object.entries(regions).some(([region, codes]) => contains(location, region) && codes.includes(country))) return true
      if (job.remote && contains(location, 'emea') && [...regions.europe, ...regions.africa, 'AE', 'SA'].includes(country)) return true
    }
    // On-site matches use the requested city, not just a shared country.
    const parts = target.split(',').map(s => s.trim()).filter(Boolean)
    const cityParts = parts.length > 1 ? parts.slice(0, -1) : parts
    return cityParts.some(part => contains(location, part))
  })
}
