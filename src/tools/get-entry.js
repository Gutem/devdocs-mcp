/**
 * @fileoverview Tool: Get documentation entry content
 * @module tools/get-entry
 */

import * as client from "../api/client.js"

/**
 * Tool definition for getting entry content
 * @type {import('@modelcontextprotocol/sdk/types.js').Tool}
 */
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

/** @type {number} Maximum content length to return */
const MAX_CONTENT_LENGTH = 10000

/**
 * Strips HTML tags and converts to plain text
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Handler for devdocs_get_entry tool
 * @param {Object} args - Tool arguments
 * @param {string} args.doc - Documentation slug
 * @param {string} args.path - Entry path
 * @returns {Promise<import('@modelcontextprotocol/sdk/types.js').CallToolResult>} Tool result
 */
export async function handler(args) {
  const { doc, path } = args
  
  const content = await client.getDocEntry(doc, path)
  const plainText = stripHtml(content)
  
  const truncated = plainText.length > MAX_CONTENT_LENGTH
  const text = plainText.slice(0, MAX_CONTENT_LENGTH) + (truncated ? "\n\n... (truncated)" : "")
  
  return {
    content: [{
      type: "text",
      text
    }]
  }
}
