import * as client from "../api/client.js"

export const definition = {
  name: "devdocs_list_docs",
  description: "List all available documentation packages on DevDocs.io",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: "Optional filter by name, slug, or type"
      }
    }
  }
}

export async function handler(args) {
  const { filter } = args
  const docs = await client.listDocs(filter)
  
  const result = docs.slice(0, 50).map(doc => ({
    name: doc.name,
    slug: doc.slug,
    version: doc.version || "latest",
    release: doc.release,
    type: doc.type
  }))
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }],
    _meta: { total: docs.length, shown: result.length }
  }
}
