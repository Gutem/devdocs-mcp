/**
 * @fileoverview Tool: List installed documentation
 * @module tools/installed
 */

/**
 * Tool definition for listing installed documentation
 * @type {import('@modelcontextprotocol/sdk/types.js').Tool}
 */
export const definition = {
  name: "devdocs_list_installed",
  description: "List currently installed/cached documentation",
  inputSchema: {
    type: "object",
    properties: {}
  }
}

/**
 * Handler for devdocs_list_installed tool
 * @param {Object} args - Tool arguments (empty)
 * @returns {Promise<import('@modelcontextprotocol/sdk/types.js').CallToolResult>} Tool result
 */
export async function handler(args) {
  // TODO: Implement installed docs listing from persistent cache
  return {
    content: [{
      type: "text",
      text: "No documentation currently installed. Use devdocs_install to download docs for offline access."
    }]
  }
}
