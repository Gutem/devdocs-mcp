import * as client from "../api/client.js"

export const definition = {
  name: "devdocs_search",
  description: "Search for entries within DevDocs documentation",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search term"
      },
      docs: {
        type: "array",
        items: { type: "string" },
        description: "Array of doc slugs to search in (default: all)"
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 10)"
      }
    },
    required: ["query"]
  }
}

export async function handler(args) {
  const { query, docs: docSlugs, limit = 10 } = args
  
  const availableDocs = await client.listDocs()
  const slugs = docSlugs || availableDocs.slice(0, 10).map(d => d.slug)
  
  const results = []
  const lowerQuery = query.toLowerCase()
  
  for (const slug of slugs.slice(0, 5)) {
    try {
      const index = await client.getDocIndex(slug)
      const entries = index.entries || []
      
      const matches = entries
        .filter(e => e.name.toLowerCase().includes(lowerQuery))
        .slice(0, limit)
        .map(e => ({
          name: e.name,
          path: e.path,
          doc: slug,
          type: e.type
        }))
      
      results.push(...matches)
    } catch {
      // Skip docs that fail to load
    }
    
    if (results.length >= limit) break
  }
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(results.slice(0, limit), null, 2)
    }]
  }
}
