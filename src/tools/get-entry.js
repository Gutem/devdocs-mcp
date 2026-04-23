import * as client from "../api/client.js"

export const definition = {
  name: "devdocs_get_entry",
  description: "Get full content of a documentation entry",
  inputSchema: {
    type: "object",
    properties: {
      doc: {
        type: "string",
        description: "Documentation slug (e.g., 'javascript')"
      },
      path: {
        type: "string",
        description: "Entry path (e.g., 'Global_Objects/Array/map')"
      }
    },
    required: ["doc", "path"]
  }
}

export async function handler(args) {
  const { doc, path } = args
  
  const content = await client.getDocEntry(doc, path)
  
  // Strip HTML to plain text for readability
  const plainText = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  
  return {
    content: [{
      type: "text",
      text: plainText.slice(0, 10000) + (plainText.length > 10000 ? "\n\n... (truncated)" : "")
    }]
  }
}
