/**
 * @fileoverview Tool: Get documentation entry content
 * @module tools/get-entry
 */

import * as client from "../api/client.js"
import { parseDocumentation, formatForAI, calculateQualityScore } from "../utils/html-parser.js"

/**
 * Tool definition for getting entry content
 * @type {import('@modelcontextprotocol/sdk/types.js').Tool}
 */
export const definition = {
  name: "devdocs_get_entry",
  description: "Get full content of a documentation entry with structured parsing",
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
      },
      format: {
        type: "string",
        enum: ["ai", "text", "json", "raw"],
        description: "Output format: 'ai' (structured like Context7), 'text' (plain), 'json' (structured), 'raw' (HTML)"
      }
    },
    required: ["doc", "path"]
  }
}

/**
 * Handler for devdocs_get_entry tool
 * @param {Object} args - Tool arguments
 * @param {string} args.doc - Documentation slug
 * @param {string} args.path - Entry path
 * @param {string} [args.format='ai'] - Output format
 * @returns {Promise<import('@modelcontextprotocol/sdk/types.js').CallToolResult>} Tool result
 */
export async function handler(args) {
  const { doc, path, format = "ai" } = args
  
  const html = await client.getDocEntry(doc, path)
  
  if (format === "raw") {
    return {
      content: [{
        type: "text",
        text: html
      }]
    }
  }
  
  const parsed = parseDocumentation(html)
  const qualityScore = calculateQualityScore(parsed)
  
  if (format === "json") {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ ...parsed, qualityScore }, null, 2)
      }],
      _meta: { qualityScore, doc, path }
    }
  }
  
  if (format === "ai") {
    const formatted = formatForAI(parsed)
    return {
      content: [{
        type: "text",
        text: `${formatted}\n\n---\nQuality Score: ${qualityScore}/100`
      }],
      _meta: { qualityScore, doc, path, title: parsed.title }
    }
  }
  
  const plainText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000)
  
  return {
    content: [{
      type: "text",
      text: plainText
    }],
    _meta: { qualityScore, doc, path, title: parsed.title }
  }
}
