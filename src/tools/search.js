/**
 * @fileoverview Tool: Search documentation entries
 * @module tools/search
 */

import * as client from "../api/client.js"
import { search, normalizeString } from "../utils/search.js"

/**
 * Tool definition for searching documentation
 * @type {import('@modelcontextprotocol/sdk/types.js').Tool}
 */
export const definition = {
  name: "devdocs_search",
  description: "Search for entries within DevDocs documentation with fuzzy matching and scoring",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search term (supports fuzzy matching)"
      },
      docs: {
        type: "array",
        items: { type: "string" },
        description: "Array of doc slugs to search in (default: searches most relevant docs)"
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 10)"
      }
    },
    required: ["query"]
  }
}

/**
 * @typedef {Object} SearchResult
 * @property {string} name - Entry name
 * @property {string} path - Entry path
 * @property {string} doc - Documentation slug
 * @property {string} [type] - Entry type
 * @property {number} score - Match score (1-100)
 */

/**
 * Handler for devdocs_search tool
 * @param {Object} args - Tool arguments
 * @param {string} args.query - Search query
 * @param {string[]} [args.docs] - Documentation slugs to search
 * @param {number} [args.limit=10] - Maximum results
 * @returns {Promise<import('@modelcontextprotocol/sdk/types.js').CallToolResult>} Tool result
 */
export async function handler(args) {
  const { query, docs: docSlugs, limit = 10 } = args
  
  const availableDocs = await client.listDocs()
  const slugs = docSlugs || availableDocs.slice(0, 10).map(d => d.slug)
  
  /** @type {Array<{name: string, path: string, doc: string, type?: string, text?: string}>} */
  const allEntries = []
  
  for (const slug of slugs.slice(0, 5)) {
    try {
      const index = await client.getDocIndex(slug)
      const entries = index.entries || []
      
      for (const entry of entries) {
        allEntries.push({
          name: entry.name,
          path: entry.path,
          doc: slug,
          type: entry.type,
          text: normalizeString(entry.name)
        })
      }
    } catch {
      // Skip docs that fail to load
    }
  }
  
  // Use fuzzy search with scoring
  const results = search(allEntries, query, e => e.text, { limit })
  
  // Format results
  const formatted = results.map(r => ({
    name: r.item.name,
    path: r.item.path,
    doc: r.item.doc,
    type: r.item.type,
    score: r.score
  }))
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(formatted, null, 2)
    }],
    _meta: {
      query,
      totalSearched: allEntries.length,
      resultsReturned: formatted.length
    }
  }
}
