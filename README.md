# DevDocs MCP Server

[![npm version](https://badge.fury.io/js/@gutem/devdocs-mcp.svg)](https://badge.fury.io/js/@gutem/devdocs-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for [DevDocs.io](https://devdocs.io/) - provides access to API documentation for 200+ libraries, frameworks, and languages through the Model Context Protocol.

## Features

- 🔍 **Search** - Search across 200+ documentation sets
- 📚 **Browse** - List available documentation packages
- 📖 **Read** - Get full content of documentation entries
- 💾 **Cache** - Built-in caching for faster responses

## Installation

### npm

```bash
npm install -g @gutem/devdocs-mcp
```

### Bun

```bash
bun install -g @gutem/devdocs-mcp
```

## Usage

### With OpenCode

Add to `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "devdocs": {
      "command": ["bun", "run", "/path/to/devdocs-mcp/src/index.js"],
      "enabled": true,
      "type": "local"
    }
  }
}
```

### With Claude Desktop

Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "devdocs": {
      "command": "npx",
      "args": ["@gutem/devdocs-mcp"]
    }
  }
}
```

## Available Tools

### `devdocs_list_docs`

List all available documentation packages.

**Parameters:**
- `filter` (optional): Filter by name, slug, or type

**Example:**
```json
{
  "filter": "javascript"
}
```

**Returns:**
```json
[
  {
    "name": "JavaScript",
    "slug": "javascript",
    "version": "latest",
    "release": "ES2024",
    "type": "mdn"
  }
]
```

### `devdocs_search`

Search entries within documentation.

**Parameters:**
- `query` (required): Search term
- `docs` (optional): Array of doc slugs to search (default: top 10)
- `limit` (optional): Max results (default: 10)

**Example:**
```json
{
  "query": "Array.map",
  "docs": ["javascript"],
  "limit": 5
}
```

**Returns:**
```json
[
  {
    "name": "Array.prototype.map()",
    "path": "Global_Objects/Array/map",
    "doc": "javascript",
    "type": "method"
  }
]
```

### `devdocs_get_entry`

Get full content of a documentation entry.

**Parameters:**
- `doc` (required): Documentation slug
- `path` (required): Entry path

**Example:**
```json
{
  "doc": "javascript",
  "path": "Global_Objects/Array/map"
}
```

### `devdocs_install`

Download documentation for offline access.

**Parameters:**
- `slugs` (required): Array of doc slugs to install

### `devdocs_list_installed`

List currently installed documentation.

## Supported Documentation

DevDocs aggregates documentation from:

- **Languages**: JavaScript, TypeScript, Python, Ruby, Go, Rust, C++, etc.
- **Frameworks**: React, Vue, Angular, Svelte, Django, Rails, Express, etc.
- **Libraries**: Lodash, Axios, jQuery, D3, etc.
- **Platforms**: Node.js, Deno, Bun, Browser APIs
- **Databases**: PostgreSQL, MongoDB, Redis, SQLite
- **Tools**: Git, Docker, Kubernetes, Bash

[View all available docs →](https://devdocs.io)

## Development

```bash
# Clone repository
git clone https://github.com/Gutem/devdocs-mcp.git
cd devdocs-mcp

# Install dependencies
bun install

# Run tests
bun test

# Start server
bun start
```

## API Reference

### Client

```javascript
import { listDocs, getDocIndex, getDocEntry } from './api/client.js'

// List all docs
const docs = await listDocs('javascript')

// Get doc index
const index = await getDocIndex('javascript')

// Get entry content
const content = await getDocEntry('javascript', 'Global_Objects/Array/map')
```

## License

MIT © [Gutem](https://github.com/Gutem)

## Resources

- [DevDocs.io](https://devdocs.io/)
- [DevDocs GitHub](https://github.com/freeCodeCamp/devdocs)
- [Model Context Protocol](https://modelcontextprotocol.io/)
