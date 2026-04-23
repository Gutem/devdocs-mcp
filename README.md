# DevDocs MCP Server

MCP server for [DevDocs.io](https://devdocs.io/) - provides access to API documentation for 200+ libraries, frameworks, and languages through the Model Context Protocol.

## Installation

```bash
bun install
```

## Usage

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "devdocs": {
      "command": "bun",
      "args": ["run", "/path/to/devdocs-mcp/src/index.js"]
    }
  }
}
```

## Available Tools

### `devdocs_list_docs`
List all available documentation packages.

### `devdocs_search`
Search entries within documentation(s).

### `devdocs_get_entry`
Get full content of a documentation entry.

### `devdocs_install`
Download/cache documentation for offline access.

### `devdocs_list_installed`
List currently installed/cached documentation.

## License

MIT
