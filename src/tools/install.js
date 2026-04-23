/**
 * @fileoverview Tool: Install documentation for offline use
 * @module tools/install
 */

import * as client from "../api/client.js"
import { mkdir, writeFile, readFile, access } from "fs/promises"
import { join } from "path"
import { homedir } from "os"

/** @type {string} Cache directory for offline docs */
const CACHE_DIR = join(homedir(), ".cache", "devdocs-mcp")

/**
 * Tool definition for installing documentation
 * @type {import('@modelcontextprotocol/sdk/types.js').Tool}
 */
export const definition = {
  name: "devdocs_install",
  description: "Download and cache documentation for offline access",
  inputSchema: {
    type: "object",
    properties: {
      slugs: {
        type: "array",
        items: { type: "string" },
        description: "Documentation slugs to install (e.g., ['javascript', 'react'])"
      }
    },
    required: ["slugs"]
  }
}

/**
 * Ensures cache directory exists
 * @returns {Promise<void>}
 */
async function ensureCacheDir() {
  try {
    await mkdir(CACHE_DIR, { recursive: true })
  } catch {
    // Directory exists
  }
}

/**
 * Installs a single documentation package
 * @param {string} slug - Documentation slug
 * @returns {Promise<{slug: string, success: boolean, entries: number, size: number}>}
 */
async function installDoc(slug) {
  await ensureCacheDir()
  
  const indexPath = join(CACHE_DIR, `${slug}-index.json`)
  const dbPath = join(CACHE_DIR, `${slug}-db.json`)
  
  // Download index
  const index = await client.getDocIndex(slug)
  await writeFile(indexPath, JSON.stringify(index))
  
  // Download db.json
  const dbUrl = `https://documents.devdocs.io/${slug}/db.json`
  const response = await fetch(dbUrl)
  if (!response.ok) {
    throw new Error(`Failed to download ${slug}`)
  }
  
  const dbText = await response.text()
  await writeFile(dbPath, dbText)
  
  // Parse to count entries
  const db = JSON.parse(dbText)
  const entryCount = Object.keys(db).length
  
  return {
    slug,
    success: true,
    entries: entryCount,
    size: Buffer.byteLength(dbText, "utf8")
  }
}

/**
 * Handler for devdocs_install tool
 * @param {Object} args - Tool arguments
 * @param {string[]} args.slugs - Documentation slugs to install
 * @returns {Promise<import('@modelcontextprotocol/sdk/types.js').CallToolResult>} Tool result
 */
export async function handler(args) {
  const { slugs } = args
  const results = []
  
  for (const slug of slugs) {
    try {
      const result = await installDoc(slug)
      results.push(result)
    } catch (error) {
      results.push({
        slug,
        success: false,
        error: error.message
      })
    }
  }
  
  const successful = results.filter(r => r.success)
  const totalSize = successful.reduce((sum, r) => sum + (r.size || 0), 0)
  const totalEntries = successful.reduce((sum, r) => sum + (r.entries || 0), 0)
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        installed: successful.map(r => ({
          slug: r.slug,
          entries: r.entries,
          sizeMB: Math.round(r.size / 1024 / 1024 * 100) / 100
        })),
        failed: results.filter(r => !r.success).map(r => ({ slug: r.slug, error: r.error })),
        summary: {
          total: slugs.length,
          successful: successful.length,
          failed: results.length - successful.length,
          totalEntries,
          totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
        }
      }, null, 2)
    }]
  }
}

/**
 * Check if a doc is installed offline
 * @param {string} slug - Documentation slug
 * @returns {Promise<boolean>}
 */
export async function isInstalled(slug) {
  const dbPath = join(CACHE_DIR, `${slug}-db.json`)
  try {
    await access(dbPath)
    return true
  } catch {
    return false
  }
}

/**
 * Get offline entry content
 * @param {string} slug - Documentation slug
 * @param {string} path - Entry path
 * @returns {Promise<string|null>} HTML content or null if not installed
 */
export async function getOfflineEntry(slug, path) {
  const dbPath = join(CACHE_DIR, `${slug}-db.json`)
  try {
    const db = JSON.parse(await readFile(dbPath, "utf8"))
    return db[path.toLowerCase()] || null
  } catch {
    return null
  }
}

export { CACHE_DIR }
