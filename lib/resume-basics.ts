import type { ResumeProfile } from './resume-profile'

// Local extraction uses explicit labels and CV headings rather than inventing answers.
export function extractResumeBasics(resume: string): ResumeProfile {
  const fields: ResumeProfile = {}
  const lines = resume.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const email = resume.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  if (email) fields.email = email
  const url = (pattern: RegExp) => {
    const found = resume.match(pattern)?.[0]
    return found ? (found.startsWith('http') ? found : `https://${found}`) : undefined
  }
  fields.linkedinUrl = url(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i)
  fields.portfolioUrl = url(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+\/?/i)
  const phone = resume.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]){2,4}\d{3,4}|\+?\d{10,15}/)?.[0]
  if (phone && phone.replace(/\D/g, '').length >= 10) fields.phone = phone.slice(0, 40)
  const labeled = (label: string) => resume.match(new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*:\\s*([^\\n|]+)`, 'i'))?.[1]?.trim()
  const labels = {
    fullName: 'full name|name', location: 'current location|location|address',
    targetRoles: 'target roles?|preferred (?:job )?(?:titles?|roles?)|desired (?:position|roles?)',
    preferredLocations: 'preferred (?:job )?locations?',
    workAuthorization: 'work authori[sz]ation', salaryExpectation: 'salary expectation', noticePeriod: 'notice period',
  } as const
  for (const [key, label] of Object.entries(labels)) {
    const value = labeled(label)
    if (value) fields[key as keyof ResumeProfile] = value.slice(0, key === 'salaryExpectation' || key === 'noticePeriod' ? 80 : 120)
  }
  const titlePattern = /^(?:(?:senior|junior|lead|principal|staff|graduate|associate)\s+)?(?:(?:front[ -]?end|back[ -]?end|full[ -]?stack|software|web|mobile|react|javascript|python|data|cloud|devops|product|project|ux\/ui|ui\/ux|ux|ui|graphic|digital|marketing|sales|human resources|hr|business|financial|customer success|customer service|operations|administrative|civil|mechanical|electrical)\s+){1,3}(?:developer|engineer|designer|analyst|scientist|manager|specialist|consultant|assistant|officer|representative|coordinator|administrator|director)(?:\s*\([^\n]+\))?$/i
  const header = lines.slice(0, 12).flatMap(line => line.split(/\s*[|•]\s*/))
  const title = header.find(line => titlePattern.test(line))
  if (title) {
    fields.headline = title.slice(0, 160)
    fields.targetRoles ??= title.slice(0, 120)
  }
  const first = lines[0]?.replace(/^(?:curriculum vitae|resume|cv)\s*[:–-]\s*/i, '')
  if (!fields.fullName && first && /^[\p{L}'’-]+(?:\s+[\p{L}'’-]+){1,3}$/u.test(first)
    && !titlePattern.test(first) && !/resume|curriculum|summary|experience|skills|contact|profile/i.test(first)) fields.fullName = first.slice(0, 120)
  if (!fields.location) {
    const location = header.find(line => /^[\p{L} .'-]+,\s*[\p{L} .'-]+$/u.test(line)
      && !/developer|engineer|designer|skills|react|javascript|typescript/i.test(line))
    if (location) fields.location = location.slice(0, 120)
  }
  const section = (heading: string) => {
    const start = lines.findIndex(line => new RegExp(`^(?:${heading})\\s*:?$`, 'i').test(line))
    if (start < 0) return ''
    const result: string[] = []
    for (const line of lines.slice(start + 1)) {
      if (/^(?:(?:professional|work|technical|core)\s+)?(?:experience|education|skills|summary|profile|certifications|projects|references|interests|employment history|languages)\s*:?$/i.test(line)) break
      result.push(line)
      if (result.length >= 12) break
    }
    return result.join('\n')
  }
  const skills = labeled('(?:technical |key |core )?skills') || section('(?:technical |key |core )?skills')
  if (skills) fields.skills = skills.split(/[,;|•\n]+/).map(s => s.replace(/^[-*]\s*/, '').trim()).filter(Boolean).slice(0, 30).join(', ')
  const summary = section('professional summary|summary|professional profile|profile|about me')
  if (summary) fields.summary = summary.slice(0, 2000)
  const years = resume.match(/\b(\d{1,2})\+?\s+years?(?:\s+of)?\s+(?:professional\s+|relevant\s+|industry\s+)?experience\b/i)
  if (years && Number(years[1]) <= 60) fields.yearsExperience = Number(years[1])
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== ''))
}
