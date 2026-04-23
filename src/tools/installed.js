/**
 * @fileoverview Tool: List installed documentation
 * @module tools/installed
 */

import { readdir, readFile, stat } from "fs/promises"
import { join } from "path"
import { CACHE_DIR } from "./install.js"

/**
 * Tool definition for listing installed documentation
 * @type {import('@modelcontextprotocol/sdk/types.js').Tool}
 */
export const definition = {
  name: "devdocs_list_installed",
  description: "List documentation packages installed for offline access",
  inputSchema: {
    type: "object",
    properties: {}
  }
}

/**
 * Handler for devdocs_list_installed tool
 * @returns {Promise<import('@modelcontextprotocol/sdk/types.js').CallToolResult>} Tool result
 */
export async function handler() {
  try {
    const files = await readdir(CACHE_DIR)
    const installed = []
    
    for (const file of files) {
      if (file.endsWith("-db.json")) {
        const slug = file.replace("-db.json", "")
        const dbPath = join(CACHE_DIR, file)
        const indexPath = join(CACHE_DIR, `${slug}-index.json`)
        
        const [dbStat, dbContent] = await Promise.all([
          stat(dbPath),
          readFile(dbPath, "utf8")
        ])
        
        let entryCount = 0
        try {
          const db = JSON.parse(dbContent)
          entryCount = Object.keys(db).length
        } catch {
          // Invalid JSON
        }
        
        installed.push({
          slug,
          entries: entryCount,
          sizeKB: Math.round(dbStat.size / 1024),
          installedAt: dbStat.mtime.toISOString()
        })
      }
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          cacheDir: CACHE_DIR,
          total: installed.length,
          installed
        }, null, 2)
      }]
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            cacheDir: CACHE_DIR,
            total: 0,
            installed: [],
            message: "No documentation installed. Use devdocs_install to download docs."
          }, null, 2)
        }]
      }
    }
    throw error
  }
}
