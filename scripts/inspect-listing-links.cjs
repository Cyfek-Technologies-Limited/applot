// Read-only diagnostic: never fills forms or sends applications.
const urls = process.argv.slice(2)
Promise.all(urls.map(async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
  const html = await response.text()
  console.log(JSON.stringify({ url, status: response.status,
    links: [...html.matchAll(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
      .filter(m => /apply|application/i.test(m[2]))
      .map(m => ({ href: m[1], text: m[2].replace(/<[^>]*>/g, '').slice(0,180) })),
    snippets: [...html.matchAll(/.{0,100}(?:applicationUrl|applicationLink|applyUrl|applyLink).{0,300}/g)].map(m => m[0])
  }))
})).catch(error => { console.error(error.message); process.exitCode = 1 })
