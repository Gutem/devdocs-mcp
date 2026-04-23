#!/usr/bin/env bun

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

const tools = [listDocs, search, getEntry, install, installed]

const server = new Server(
  { name: "devdocs-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => t.definition)
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  
  const tool = tools.find(t => t.definition.name === name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }
  
  return tool.handler(args || {})
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
