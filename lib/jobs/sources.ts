import 'server-only'

export type JobListing = {
  externalId: string
  source: string
  title: string
  company: string
  location: string
  url: string
  salary: string
  description: string
  tags: string[]
  remote: boolean
}

const UA = 'Mozilla/5.0 (compatible; ApplotBot/1.0; +https://applot.app)'

function stripHtml(html: string) {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2500)
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 900 },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch (error) {
    console.error('[applot] job source failed', url, error)
    return null
  }
}

type RemotiveResponse = {
  jobs: {
    id: number
    url: string
    title: string
    company_name: string
    tags: string[]
    candidate_required_location: string
    salary: string
    description: string
  }[]
}

async function fromRemotive(query: string): Promise<JobListing[]> {
  const data = await getJson<RemotiveResponse>(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=30`,
  )
  return (data?.jobs ?? []).map((j) => ({
    externalId: `remotive-${j.id}`,
    source: 'Remotive',
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || 'Remote',
    url: j.url,
    salary: j.salary ?? '',
    description: stripHtml(j.description ?? ''),
    tags: j.tags ?? [],
    remote: true,
  }))
}

type JobicyResponse = {
  jobs?: {
    id: number
    url: string
    jobTitle: string
    companyName: string
    jobGeo: string
    jobExcerpt: string
    jobDescription?: string
    jobIndustry?: string[]
    salaryMin?: number
    salaryMax?: number
    salaryCurrency?: string
  }[]
}

async function fromJobicy(query: string): Promise<JobListing[]> {
  const data = await getJson<JobicyResponse>(
    `https://jobicy.com/api/v2/remote-jobs?count=30&tag=${encodeURIComponent(query)}`,
  )
  return (data?.jobs ?? []).map((j) => ({
    externalId: `jobicy-${j.id}`,
    source: 'Jobicy',
    title: stripHtml(j.jobTitle),
    company: j.companyName,
    location: j.jobGeo || 'Remote',
    url: j.url,
    salary:
      j.salaryMin && j.salaryMax
        ? `${j.salaryCurrency ?? ''} ${j.salaryMin.toLocaleString()}–${j.salaryMax.toLocaleString()}`.trim()
        : '',
    description: stripHtml(j.jobDescription ?? j.jobExcerpt ?? ''),
    tags: (j.jobIndustry ?? []).map(stripHtml),
    remote: true,
  }))
}

type RemoteOkItem = {
  id?: string
  url?: string
  position?: string
  company?: string
  location?: string
  tags?: string[]
  description?: string
  salary_min?: number
  salary_max?: number
}

async function fromRemoteOk(query: string): Promise<JobListing[]> {
  const tag = query.toLowerCase().split(/\s+/)[0] ?? ''
  const data = await getJson<RemoteOkItem[]>(
    `https://remoteok.com/api?tag=${encodeURIComponent(tag)}`,
  )
  return (data ?? [])
    .filter((j) => j.id && j.position)
    .slice(0, 30)
    .map((j) => ({
      externalId: `remoteok-${j.id}`,
      source: 'Remote OK',
      title: j.position ?? '',
      company: j.company ?? '',
      location: j.location || 'Remote',
      url: j.url ?? `https://remoteok.com/remote-jobs/${j.id}`,
      salary:
        j.salary_min && j.salary_max
          ? `$${j.salary_min.toLocaleString()}–$${j.salary_max.toLocaleString()}`
          : '',
      description: stripHtml(j.description ?? ''),
      tags: j.tags ?? [],
      remote: true,
    }))
}

type ArbeitnowResponse = {
  data: {
    slug: string
    company_name: string
    title: string
    description: string
    remote: boolean
    url: string
    tags: string[]
    location: string
  }[]
}

async function fromArbeitnow(query: string): Promise<JobListing[]> {
  const data = await getJson<ArbeitnowResponse>(
    'https://www.arbeitnow.com/api/job-board-api',
  )
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return (data?.data ?? [])
    .filter((j) => {
      const hay = `${j.title} ${j.tags.join(' ')}`.toLowerCase()
      return words.some((w) => hay.includes(w))
    })
    .slice(0, 30)
    .map((j) => ({
      externalId: `arbeitnow-${j.slug}`,
      source: 'Arbeitnow',
      title: j.title,
      company: j.company_name,
      location: j.remote ? `Remote · ${j.location}` : j.location,
      url: j.url,
      salary: '',
      description: stripHtml(j.description),
      tags: j.tags,
      remote: j.remote,
    }))
}

export async function searchJobs(roles: string[]): Promise<JobListing[]> {
  const queries = roles.length ? roles.slice(0, 3) : ['developer']
  const batches = await Promise.all(
    queries.flatMap((q) => [
      fromRemotive(q),
      fromJobicy(q),
      fromRemoteOk(q),
      fromArbeitnow(q),
    ]),
  )
  const seen = new Set<string>()
  const all: JobListing[] = []
  for (const job of batches.flat()) {
    if (!job.url || !job.title || seen.has(job.externalId)) continue
    seen.add(job.externalId)
    all.push(job)
  }
  return all
}
