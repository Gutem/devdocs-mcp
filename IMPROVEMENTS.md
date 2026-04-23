# DevDocs MCP Enhancement Plan

Based on analysis of:
- `/Users/gutem/code/devdocs` - Original DevDocs source (Ruby + JavaScript)
- `/Users/gutem/code/devdocs-desktop` - Electron desktop app

## Current State

| Feature | DevDocs Source | DevDocs MCP | Status |
|---------|---------------|-------------|--------|
| Offline Storage | IndexedDB | File system (~/.cache) | ✓ Basic |
| Fuzzy Search | Sophisticated scoring | Simple includes | ❌ Needs work |
| Doc Installation | Incremental + progress | All-or-nothing | ❌ Needs work |
| Content Parsing | HTML filters pipeline | Basic regex | ✓ Working |
| Versioning | Multiple versions | Single version | ❌ Missing |
| Type Indexing | Entry types | Not indexed | ❌ Missing |

## Phase 1: Search Improvements

### 1.1 Fuzzy Search Algorithm

From `assets/javascripts/app/searcher.js`:

```javascript
// Port the scoring algorithm
// - Exact match: 100 - (unmatched chars)
// - Fuzzy match: 66-100 based on position
// - Score by: position, separators, match length

export function searchScore(query, value) {
  const q = normalize(query)
  const v = normalize(value)
  
  // Exact match scoring
  let index = v.indexOf(q)
  if (index >= 0) {
    let score = 100 - (v.length - q.length)
    // Bonus for dot-prefixed matches
    if (index > 0 && v[index-1] === '.') score += index - 1
    return Math.max(1, score)
  }
  
  // Fuzzy match: /a.*?b.*?c/
  const fuzzy = new RegExp(q.split('').map(c => c + '.*?').join(''))
  const match = v.match(fuzzy)
  if (match) {
    if (match.index === 0) return Math.max(66, 100 - match[0].length)
    if (match.index + match[0].length === v.length) return Math.max(33, 67 - match[0].length)
    return Math.max(1, 34 - match[0].length)
  }
  
  return 0
}
```

### 1.2 Index Enhancement

From `assets/javascripts/models/entry.js`:

```javascript
// Add type-based indexing
{
  name: "Array.map",
  path: "global_objects/array/map",
  type: "method",        // Entry type
  text: "array.map",     // Normalized search text
  aliases: ["Array.prototype.map"]
}
```

## Phase 2: Offline Storage

### 2.1 IndexedDB (Browser) or SQLite (Node/Bun)

From `assets/javascripts/app/db.js`:

```javascript
// DevDocs uses IndexedDB with:
// - "docs" store for version tracking
// - One store per doc slug for content
// - mtime-based invalidation

// For MCP, use SQLite:
const db = new Database('devdocs.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS docs (
    slug TEXT PRIMARY KEY,
    mtime INTEGER,
    db_size INTEGER,
    installed_at INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS entries (
    doc_slug TEXT,
    path TEXT,
    name TEXT,
    type TEXT,
    content TEXT,
    PRIMARY KEY (doc_slug, path)
  );
  
  CREATE INDEX idx_entries_name ON entries(name);
  CREATE INDEX idx_entries_type ON entries(type);
`)
```

### 2.2 Incremental Installation

From `assets/javascripts/models/doc.js`:

```javascript
// DevDocs supports:
// - Progress callbacks during download
// - Incremental storage (entry by entry)
// - Resume on failure

export async function installDoc(slug, onProgress) {
  const response = await fetch(`${DOCS_URL}/${slug}/db.json`)
  const reader = response.body.getReader()
  
  let received = 0
  const total = parseInt(response.headers.get('content-length'))
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.length
    onProgress?.({ received, total, percent: received / total * 100 })
  }
}
```

## Phase 3: Content Parsing

### 3.1 HTML Filter Pipeline

From `lib/docs/core/scraper.rb`:

```ruby
html_filters.push 'apply_base_url', 'container', 'clean_html', 
                  'normalize_urls', 'internal_urls', 'parse_cf_email'
text_filters.push 'images', 'inner_html', 'clean_text', 'attribution'
```

Port to JavaScript:

```javascript
// src/utils/filters.js

export const filters = {
  cleanHtml(html) {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
  },
  
  normalizeUrls(html, baseUrl) {
    return html.replace(/href="([^"]*)"/g, (m, url) => {
      if (url.startsWith('http')) return m
      return `href="${new URL(url, baseUrl).href}"`
    })
  },
  
  extractCodeBlocks(html) {
    const blocks = []
    const regex = /<pre[^>]*data-language="(\w+)"[^>]*>([\s\S]*?)<\/pre>/gi
    let match
    while ((match = regex.exec(html))) {
      blocks.push({ language: match[1], code: match[2] })
    }
    return blocks
  }
}
```

### 3.2 Type Extraction

From `lib/docs/scrapers/mdn/javascript.rb`:

```javascript
// Extract entry types from index
// Types: method, class, property, function, operator, statement, etc.

export function extractTypes(index) {
  const types = new Map()
  
  for (const entry of index.entries) {
    const type = entry.type || 'unknown'
    if (!types.has(type)) {
      types.set(type, [])
    }
    types.get(type).push(entry)
  }
  
  return Object.fromEntries(types)
}
```

## Phase 4: Version Support

From DevDocs slugs like `react~18`, `react~17`:

```javascript
// src/tools/list-docs.js

export function groupVersions(docs) {
  const groups = new Map()
  
  for (const doc of docs) {
    const base = doc.slug.split('~')[0]
    if (!groups.has(base)) {
      groups.set(base, { latest: null, versions: [] })
    }
    
    const group = groups.get(base)
    if (doc.slug.includes('~')) {
      group.versions.push(doc)
    } else {
      group.latest = doc
    }
  }
  
  return groups
}
```

## Phase 5: Tauri Desktop App

### Architecture

```
devdocs-tauri/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs          # Tauri backend
│   │   └── commands.rs      # IPC commands
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── index.html           # Main UI
│   ├── main.js              # Frontend logic
│   └── styles.css
└── package.json
```

### Tauri Commands

```rust
// src-tauri/src/commands.rs

#[tauri::command]
async fn list_docs(filter: Option<String>) -> Result<Vec<Doc>, String> {
    let docs = fetch_docs().await?;
    Ok(match filter {
        Some(f) => docs.into_iter().filter(|d| 
            d.name.to_lowercase().contains(&f.to_lowercase())
        ).collect(),
        None => docs
    })
}

#[tauri::command]
async fn search_entries(query: String, docs: Vec<String>, limit: usize) -> Result<Vec<Entry>, String> {
    // Use the ported fuzzy search algorithm
    let entries = search_index(&query, &docs, limit).await?;
    Ok(entries)
}

#[tauri::command]
async fn install_doc(slug: String, window: Window) -> Result<(), String> {
    let db = fetch_db(&slug).await?;
    
    // Store in SQLite
    let conn = Connection::open(get_db_path())?;
    store_entries(&conn, &slug, &db, |progress| {
        window.emit("install-progress", progress).ok();
    })?;
    
    Ok(())
}
```

### Frontend (Vanilla JS)

```html
<!-- src/index.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DevDocs</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <aside id="sidebar">
      <input type="search" id="search" placeholder="Search...">
      <div id="doc-list"></div>
    </aside>
    <main id="content"></main>
  </div>
  
  <script type="module" src="main.js"></script>
</body>
</html>
```

```javascript
// src/main.js

import { invoke } from '@tauri-apps/api'

const search = document.getElementById('search')
const content = document.getElementById('content')

search.addEventListener('input', debounce(async (e) => {
  const results = await invoke('search_entries', {
    query: e.target.value,
    docs: [],  // empty = all docs
    limit: 20
  })
  
  renderResults(results)
}, 150))

async function loadEntry(doc, path) {
  const html = await invoke('get_entry', { doc, path })
  content.innerHTML = html
}
```

## Implementation Priority

| Phase | Feature | Effort | Impact |
|-------|---------|--------|--------|
| 1.1 | Fuzzy search scoring | 4h | High |
| 1.2 | Type indexing | 2h | Medium |
| 2.1 | SQLite storage | 6h | High |
| 2.2 | Incremental install | 4h | Medium |
| 3.1 | HTML filters | 4h | Medium |
| 3.2 | Type extraction | 2h | Medium |
| 4 | Version support | 3h | Low |
| 5 | Tauri app | 16h | High |

## Next Steps

1. **Immediate**: Port fuzzy search algorithm to `src/utils/search.js`
2. **Short-term**: Add SQLite storage for better offline support
3. **Medium-term**: Create Tauri desktop app skeleton
4. **Long-term**: Full feature parity with DevDocs
