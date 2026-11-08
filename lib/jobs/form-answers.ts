import { countryCode } from './location'

export type ApplicantFacts = {
  fullName: string; email: string; phone: string; location: string
  linkedinUrl: string; portfolioUrl: string; summary: string
  workAuthorization: string; salaryExpectation: string; noticePeriod: string
}

export function answerFor(label: string, facts: ApplicantFacts, coverLetter: string, answers: Record<string, string> = {}): string | undefined {
  if (answers[label]?.trim()) return answers[label].trim()
  const name = label.toLowerCase().replace(/[_*✱]+/g, ' ').replace(/\s+/g, ' ').trim()
  // Sensitive questions and consent need explicit answers, never inference.
  if (/gender|race|ethnic|disabilit|veteran|consent|agree|privacy|sponsor|relocat|authoriz|eligible|legally|citizen/i.test(name)) return undefined
  if (/first name|given name/.test(name)) return facts.fullName.split(/\s+/)[0] || undefined
  if (/last name|family name|surname/.test(name)) return facts.fullName.split(/\s+/).slice(1).join(' ') || undefined
  if (/^(?:your )?(?:full )?name$/.test(name)) return facts.fullName || undefined
  if (/e.?mail/.test(name)) return facts.email || undefined
  if (/phone|mobile|telephone/.test(name)) return facts.phone || undefined
  if (/linkedin/.test(name)) return facts.linkedinUrl || undefined
  if (/portfolio|github|personal (?:website|site)|^website$/.test(name)) return facts.portfolioUrl || undefined
  if (/current location|^location$|where are you (?:currently )?(?:based|located)/.test(name)) return facts.location || undefined
  if (/^country$|what country are you based in|country of residence/.test(name)) {
    const code = countryCode(facts.location)
    return code ? new Intl.DisplayNames(['en'], { type: 'region' }).of(code) : undefined
  }
  if (/cover.?letter|additional information/.test(name)) return coverLetter || undefined
  if (/professional summary|^summary$/.test(name)) return facts.summary || undefined
  if (/salary expectation|expected salary/.test(name)) return facts.salaryExpectation || undefined
  if (/notice period/.test(name)) return facts.noticePeriod || undefined
  return undefined
}

