import type { JobListing } from './sources'
import { countryCode, type SearchLocation } from './location'

type JsonGetter = <T>(url: string) => Promise<T | null>
const plain = (text = '') => text.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 12000)
const roleMatch = (title: string, query: string) => query.toLowerCase().split(/\s+/).filter(w => w.length > 2).some(w => title.toLowerCase().includes(w))
const boards = (name: string, fallback: string) => (process.env[name] ?? fallback).split(',').map(s => s.trim()).filter(s => /^[a-z0-9_-]+$/i.test(s)).slice(0, 12)

export async function additionalSources(query: string, location: SearchLocation, get: JsonGetter): Promise<{ source: string; jobs: JobListing[] }[]> {
  const tasks: { source: string; run: () => Promise<JobListing[]> }[] = [
    { source: 'Himalayas', run: async () => {
      const params = new URLSearchParams({ q: query, country: countryCode(location.location) ?? location.location, page: '1' })
      const data = await get<{ jobs: { guid: string; title: string; companyName: string; applicationLink: string; locationRestrictions?: string[]; timezoneRestrictions?: number[]; description: string; categories: string[]; expiryDate?: number }[] }>(`https://himalayas.app/jobs/api/search?${params}`)
      return (data?.jobs ?? []).filter(j => !j.expiryDate || j.expiryDate * 1000 > Date.now()).map(j => ({
        externalId: `himalayas-${j.guid}`, source: 'Himalayas', title: j.title, company: j.companyName,
        location: j.locationRestrictions?.join(', ') || 'Worldwide', allowedCountries: j.locationRestrictions,
        allowedOffsets: j.timezoneRestrictions,
        url: j.applicationLink, salary: '', description: plain(j.description), tags: j.categories ?? [], remote: true,
      }))
    } },
    { source: 'The Muse', run: async () => {
      const params = new URLSearchParams({ page: '0', location: location.preferredLocations[0] || location.location })
      if (process.env.THE_MUSE_API_KEY) params.set('api_key', process.env.THE_MUSE_API_KEY)
      const data = await get<{ results: { id: number; name: string; company: { name: string }; locations: { name: string }[]; refs: { landing_page: string }; contents: string; categories: { name: string }[] }[] }>(`https://www.themuse.com/api/public/jobs?${params}`)
      return (data?.results ?? []).filter(j => roleMatch(j.name, query)).map(j => ({ externalId: `muse-${j.id}`, source: 'The Muse', title: j.name, company: j.company.name, location: j.locations.map(l => l.name).join(', '), url: j.refs.landing_page, salary: '', description: plain(j.contents), tags: j.categories.map(c => c.name), remote: j.locations.some(l => /remote|flexible/i.test(l.name)) }))
    } },
  ]
  for (const board of boards('GREENHOUSE_BOARDS', 'canonical,gitlab')) tasks.push({ source: `Greenhouse: ${board}`, run: async () => {
    const data = await get<{ jobs: { id: number; title: string; location: { name: string }; absolute_url: string; content: string }[] }>(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`)
    return (data?.jobs ?? []).filter(j => roleMatch(j.title, query)).slice(0, 40).map(j => ({ externalId: `greenhouse-${board}-${j.id}`, source: 'Greenhouse', title: j.title, company: board, location: j.location.name, url: j.absolute_url, salary: '', description: plain(j.content), tags: [], remote: /remote|worldwide|anywhere/i.test(j.location.name) }))
  } })
  for (const board of boards('LEVER_BOARDS', '')) tasks.push({ source: `Lever: ${board}`, run: async () => {
    const data = await get<{ id: string; text: string; categories: { location: string }; hostedUrl: string; descriptionPlain: string; workplaceType?: string }[]>(`https://api.lever.co/v0/postings/${board}?mode=json`)
    return (data ?? []).filter(j => roleMatch(j.text, query)).map(j => ({ externalId: `lever-${board}-${j.id}`, source: 'Lever', title: j.text, company: board, location: j.categories.location, url: j.hostedUrl, salary: '', description: plain(j.descriptionPlain), tags: [], remote: j.workplaceType === 'remote' || /remote/i.test(j.categories.location) }))
  } })
  for (const board of boards('ASHBY_BOARDS', 'linear,zapier')) tasks.push({ source: `Ashby: ${board}`, run: async () => {
    const data = await get<{ jobs: { id: string; title: string; location: string; jobUrl: string; applyUrl: string; isRemote: boolean; descriptionPlain: string; isListed?: boolean }[] }>(`https://api.ashbyhq.com/posting-api/job-board/${board}`)
    return (data?.jobs ?? []).filter(j => j.isListed !== false && roleMatch(j.title, query)).map(j => ({ externalId: `ashby-${board}-${j.id}`, source: 'Ashby', title: j.title, company: board, location: j.location, url: j.applyUrl || j.jobUrl, salary: '', description: plain(j.descriptionPlain), tags: [], remote: j.isRemote }))
  } })
  if (process.env.JOOBLE_API_KEY && process.env.JOOBLE_COUNTRY === countryCode(location.location)?.toLowerCase()) tasks.push({ source: 'Jooble', run: async () => {
    const domain = process.env.JOOBLE_COUNTRY === 'us' ? 'jooble.org' : `${process.env.JOOBLE_COUNTRY}.jooble.org`
    const response = await fetch(`https://${domain}/api/${encodeURIComponent(process.env.JOOBLE_API_KEY!)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords: query, location: location.preferredLocations[0] || location.location, page: '1', ResultOnPage: '30' }), signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error('Jooble unavailable')
    const data = await response.json() as { jobs: { id: number; title: string; company: string; location: string; link: string; snippet: string }[] }
    return (data.jobs ?? []).map(j => ({ externalId: `jooble-${j.id}`, source: 'Jooble', title: j.title, company: j.company, location: j.location, url: j.link, salary: '', description: plain(j.snippet), tags: [], remote: /remote/i.test(`${j.title} ${j.location}`) }))
  } })
  return Promise.all(tasks.filter(task => task.source !== 'The Muse' || !!process.env.THE_MUSE_API_KEY).map(async task => {
    try { return { source: task.source, jobs: await task.run() } }
    catch { return { source: task.source, jobs: [] } }
  }))
}
