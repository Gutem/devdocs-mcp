#!/usr/bin/env bun
/**
 * @fileoverview DevDocs MCP Server - Entry point
 * @module index
 * 
 * MCP server for DevDocs.io providing access to API documentation
 * for 200+ libraries, frameworks, and languages.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

import * as listDocs from "./tools/list-docs.js"
import * as search from "./tools/search.js"
import * as getEntry from "./tools/get-entry.js"
import * as install from "./tools/install.js"
import * as installed from "./tools/installed.js"

/**
 * @typedef {import('@modelcontextprotocol/sdk/types.js').Tool} Tool
 * @typedef {import('@modelcontextprotocol/sdk/types.js').CallToolResult} CallToolResult
 */

/** @type {import('./tools/list-docs.js')[]} All available tools */
const tools = [listDocs, search, getEntry, install, installed]

/**
 * MCP Server instance
 * @type {Server}
 */
const server = new Server(
  { name: "devdocs-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
)

/**
 * Handler for listing available tools
 * @returns {{ tools: Tool[] }} List of tool definitions
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => t.definition)
}))

/**
 * Handler for executing tool calls
 * @param {Object} request - Request object
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.name - Tool name
 * @param {Object} [request.params.arguments] - Tool arguments
 * @returns {Promise<CallToolResult>} Tool execution result
 * @throws {Error} If tool not found
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  
  const tool = tools.find(t => t.definition.name === name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }
  
  return tool.handler(args || {})
})

/**
 * Main entry point - starts the MCP server
 * @async
 * @returns {Promise<void>}
 */
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
