const BASE_URL = "https://devdocs.io"
const DOCS_URL = "https://documents.devdocs.io"

const cache = new Map()
const CACHE_TTL = 60 * 60 * 1000

async function fetch(url) {
  const cached = cache.get(url)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  
  const response = await global.fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`)
  }
  
  const data = await response.json()
  cache.set(url, { data, timestamp: Date.now() })
  return data
}

export async function listDocs(filter = null) {
  const docs = await fetch(`${BASE_URL}/docs.json`)
  
  if (!filter) return docs
  
  const lowerFilter = filter.toLowerCase()
  return docs.filter(doc => 
    doc.name.toLowerCase().includes(lowerFilter) ||
    doc.slug.toLowerCase().includes(lowerFilter) ||
    doc.type?.toLowerCase().includes(lowerFilter)
  )
}

export async function getDocIndex(slug) {
  return fetch(`${DOCS_URL}/${slug}/index.json`)
}

export async function getDocEntry(slug, path) {
  const url = `${DOCS_URL}/${slug}/${path}.html`
  const response = await global.fetch(url)
  if (!response.ok) {
    throw new Error(`Entry not found: ${slug}/${path}`)
  }
  return response.text()
}

export function clearCache() {
  cache.clear()
}
