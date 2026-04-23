/**
 * @fileoverview DevDocs API client for fetching documentation data
 * @module api/client
 */

import { readFile, access } from "fs/promises"
import { join } from "path"
import { homedir } from "os"

/** @type {string} Base URL for DevDocs main site */
const BASE_URL = "https://devdocs.io"

/** @type {string} Base URL for DevDocs documentation content */
const DOCS_URL = "https://documents.devdocs.io"

/** @type {string} Cache directory for offline docs */
const CACHE_DIR = join(homedir(), ".cache", "devdocs-mcp")

/** @type {Map<string, {data: any, timestamp: number}>} In-memory cache */
const cache = new Map()

/** @type {Map<string, Object<string, string>>} Doc database cache */
const docDbCache = new Map()

/** @type {number} Cache TTL in milliseconds (1 hour) */
const CACHE_TTL = 60 * 60 * 1000

/**
 * Fetches JSON data with caching support
 * @template T
 * @param {string} url - URL to fetch
 * @returns {Promise<T>} Parsed JSON data
 * @throws {Error} If fetch fails
 */
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

/**
 * @typedef {Object} DocInfo
 * @property {string} name - Display name (e.g., "JavaScript")
 * @property {string} slug - URL slug (e.g., "javascript")
 * @property {string} [version] - Version string (e.g., "ES2024")
 * @property {string} release - Release version
 * @property {string} [type] - Documentation type (e.g., "mdn")
 * @property {Object} [links] - Related links
 * @property {string} [links.home] - Homepage URL
 * @property {string} [links.code] - Source code URL
 * @property {number} mtime - Last modified timestamp
 * @property {number} db_size - Database size in bytes
 * @property {string} [attribution] - Attribution text
 * @property {string|null} [alias] - Short alias
 */

/**
 * Lists all available documentation packages
 * @param {string|null} [filter=null] - Optional filter by name/slug/type
 * @returns {Promise<DocInfo[]>} Array of documentation info
 * @example
 * const allDocs = await listDocs()
 * const jsDocs = await listDocs('javascript')
 */
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

/**
 * @typedef {Object} IndexEntry
 * @property {string} name - Entry name
 * @property {string} path - Entry path (without .html)
 * @property {string} [type] - Entry type (e.g., "method", "class")
 */

/**
 * @typedef {Object} DocIndex
 * @property {IndexEntry[]} entries - Array of index entries
 * @property {Object<string, number>} [types] - Count by type
 */

/**
 * Gets the index for a documentation package
 * @param {string} slug - Documentation slug (e.g., "javascript")
 * @returns {Promise<DocIndex>} Documentation index
 * @throws {Error} If documentation not found
 * @example
 * const index = await getDocIndex('javascript')
 * console.log(index.entries.length) // Number of entries
 */
export async function getDocIndex(slug) {
  return fetch(`${DOCS_URL}/${slug}/index.json`)
}

/**
 * Gets the HTML content of a documentation entry
 * @param {string} slug - Documentation slug (e.g., "javascript")
 * @param {string} path - Entry path (e.g., "Global_Objects/Array/map")
 * @param {Object} [options] - Options
 * @param {boolean} [options.preferOffline=true] - Prefer offline cache
 * @returns {Promise<string>} HTML content
 * @throws {Error} If entry not found
 * @example
 * const html = await getDocEntry('javascript', 'Global_Objects/Array/map')
 */
export async function getDocEntry(slug, path, options = {}) {
  const { preferOffline = true } = options
  const normalizedPath = path.toLowerCase()
  
  // Check in-memory cache first
  let db = docDbCache.get(slug)
  
  if (!db) {
    // Try offline cache first if preferred
    if (preferOffline) {
      try {
        const offlinePath = join(CACHE_DIR, `${slug}-db.json`)
        await access(offlinePath)
        const offlineContent = await readFile(offlinePath, "utf8")
        db = JSON.parse(offlineContent)
        docDbCache.set(slug, db)
      } catch {
        // Offline not available, continue to online
      }
    }
    
    // Fetch from online if not in cache
    if (!db) {
      const response = await global.fetch(`${DOCS_URL}/${slug}/db.json`)
      if (!response.ok) {
        throw new Error(`Documentation not found: ${slug}`)
      }
      db = await response.json()
      docDbCache.set(slug, db)
    }
  }
  
  const content = db[normalizedPath]
  if (!content) {
    throw new Error(`Entry not found: ${slug}/${path}`)
  }
  
  return content
}

/**
 * Clears all cached data
 * @returns {void}
 */
export function clearCache() {
  cache.clear()
  docDbCache.clear()
}
