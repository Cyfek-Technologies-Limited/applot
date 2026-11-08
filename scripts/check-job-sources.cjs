const endpoints = {
  Himalayas: 'https://himalayas.app/jobs/api/search?q=engineer&country=NG&page=1',
  'The Muse': 'https://www.themuse.com/api/public/jobs?page=0&location=Lagos%2C%20Nigeria',
  'Greenhouse Canonical': 'https://boards-api.greenhouse.io/v1/boards/canonical/jobs',
  'Greenhouse GitLab': 'https://boards-api.greenhouse.io/v1/boards/gitlab/jobs',
  'Lever Paystack': 'https://api.lever.co/v0/postings/paystack?mode=json',
  'Ashby Deel': 'https://api.ashbyhq.com/posting-api/job-board/deel',
  'Ashby Linear': 'https://api.ashbyhq.com/posting-api/job-board/linear',
  'Lever Wave': 'https://api.lever.co/v0/postings/wave?mode=json',
  'Lever Yassir': 'https://api.lever.co/v0/postings/yassir?mode=json',
  'Lever Flutterwave': 'https://api.lever.co/v0/postings/flutterwave?mode=json',
  'Ashby Zapier': 'https://api.ashbyhq.com/posting-api/job-board/zapier',
}
Promise.all(Object.entries(endpoints).map(async ([name, url]) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
    const data = await response.json()
    const jobs = Array.isArray(data) ? data : data.jobs ?? data.results ?? []
    console.log(JSON.stringify({ source: name, status: response.status, count: jobs.length, fields: jobs[0] ? Object.keys(jobs[0]) : [], restrictions: jobs[0]?.locationRestrictions, offsets: jobs[0]?.timezoneRestrictions }))
  } catch (error) { console.log(JSON.stringify({ source: name, error: error.message })) }
})).catch(() => { process.exitCode = 1 })
