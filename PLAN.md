# DevDocs MCP Server - Development Plan

## Overview

MCP server for [DevDocs.io](https://devdocs.io/) - provides access to API documentation for 200+ libraries, frameworks, and languages through the Model Context Protocol.

## DevDocs API Endpoints

### Base URLs
- Main docs list: `https://devdocs.io/docs.json`
- Documentation content: `https://documents.devdocs.io/{slug}/`
- Index file: `https://documents.devdocs.io/{slug}/index.json`
- Content pages: `https://documents.devdocs.io/{slug}/{path}.html`

### Data Structure

**docs.json response:**
```json
{
  "name": "JavaScript",
  "slug": "javascript",
  "type": "mdn",
  "links": { "home": "...", "code": "..." },
  "version": "",
  "release": "latest",
  "mtime": 1234567890,
  "db_size": 6462141,
  "attribution": "...",
  "alias": null
}
```

**index.json structure (per documentation):**
```json
{
  "entries": [
    { "name": "Array", "path": "Global_Objects/Array", "type": "class" },
    { "name": "Array.prototype.map()", "path": "Global_Objects/Array/map", "type": "method" }
  ],
  "types": { "class": 150, "method": 500 }
}
```

## MCP Tools Design

### Tool 1: `devdocs_list_docs`
List all available documentation packages.

**Input:** 
- `filter` (optional): Filter by name/type

**Output:** List of available docs with name, slug, version, release

### Tool 2: `devdocs_search`
Search entries within documentation(s).

**Input:**
- `query`: Search term
- `docs` (optional): Array of doc slugs to search in (default: all installed)
- `limit` (optional): Max results (default: 10)

**Output:** Matching entries with name, path, doc slug

### Tool 3: `devdocs_get_entry`
Get full content of a documentation entry.

**Input:**
- `doc`: Documentation slug (e.g., "javascript")
- `path`: Entry path (e.g., "Global_Objects/Array/map")

**Output:** HTML content of the documentation entry

### Tool 4: `devdocs_install`
Download/cache documentation for offline access.

**Input:**
- `slugs`: Array of doc slugs to install

**Output:** Installation status

### Tool 5: `devdocs_list_installed`
List currently installed/cached documentation.

**Input:** None

**Output:** List of installed docs with metadata

## Architecture

```
devdocs-mcp/
├── src/
│   ├── index.js          # MCP server entry point
│   ├── tools/
│   │   ├── list-docs.js  # List available docs
│   │   ├── search.js     # Search entries
│   │   ├── get-entry.js  # Get entry content
│   │   ├── install.js    # Download docs
│   │   └── installed.js  # List installed
│   ├── cache/
│   │   └── index.js      # Cache management
│   └── api/
│       └── client.js     # DevDocs API client
├── tests/
│   └── ...
├── package.json
└── README.md
```

## Implementation Details

### Caching Strategy
- Store docs list in memory (refresh on startup, TTL 1 hour)
- Cache downloaded documentation indexes locally
- Cache content pages on-demand with TTL

### Error Handling
- Network errors → fallback to cache
- Missing docs → clear error message
- Rate limiting → respect headers

### Rate Limiting
- DevDocs has no official rate limits documented
- Implement client-side throttling (max 10 req/sec)
- Cache aggressively

## Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol
- `@inquirer/cli` (dev) - Interactive prompts

## Testing Strategy
- Unit tests for API client
- Integration tests with mock server
- Cache tests

## MVP Scope
1. List available documentation
2. Search within documentation
3. Get entry content
4. Basic caching

## Future Enhancements
- Offline mode with full download
- Fuzzy search improvements
- Multiple versions support
- Attribution display

## References
- DevDocs GitHub: https://github.com/freeCodeCamp/devdocs
- MCP Protocol: https://modelcontextprotocol.io/
