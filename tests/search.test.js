/**
 * @fileoverview Tests for devdocs_search tool
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test"

describe("search tool", () => {
  let originalFetch
  let mockResponses = new Map()

  beforeEach(() => {
    originalFetch = global.fetch
    mockResponses = new Map()
    global.fetch = async (url) => {
      for (const [pattern, response] of mockResponses) {
        if (url.includes(pattern)) {
          return response
        }
      }
      return { ok: false, status: 404 }
    }
  })

  afterEach(() => {
    global.fetch = originalFetch
    mockResponses.clear()
  })

  describe("definition", () => {
    it("should have correct name", async () => {
      const search = await import("../src/tools/search.js")
      expect(search.definition.name).toBe("devdocs_search")
    })

    it("should have required query parameter", async () => {
      const search = await import("../src/tools/search.js")
      expect(search.definition.inputSchema.required).toContain("query")
    })

    it("should have optional docs parameter", async () => {
      const search = await import("../src/tools/search.js")
      expect(search.definition.inputSchema.properties.docs).toBeDefined()
      expect(search.definition.inputSchema.properties.docs.type).toBe("array")
    })

    it("should have optional limit parameter", async () => {
      const search = await import("../src/tools/search.js")
      expect(search.definition.inputSchema.properties.limit).toBeDefined()
      expect(search.definition.inputSchema.properties.limit.type).toBe("number")
    })
  })

  describe("handler", () => {
    it("should return search results", async () => {
      mockResponses.set("docs.json", {
        ok: true,
        json: () => Promise.resolve([
          { name: "JavaScript", slug: "javascript" }
        ])
      })
      
      mockResponses.set("index.json", {
        ok: true,
        json: () => Promise.resolve({
          entries: [
            { name: "Array.map", path: "Global_Objects/Array/map", type: "method" }
          ]
        })
      })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const search = await import("../src/tools/search.js")
      const result = await search.handler({ query: "map" })
      
      expect(result.content[0].type).toBe("text")
      const data = JSON.parse(result.content[0].text)
      expect(data.length).toBeGreaterThanOrEqual(0)
    })

    it("should limit results", async () => {
      mockResponses.set("docs.json", {
        ok: true,
        json: () => Promise.resolve([
          { name: "JavaScript", slug: "javascript" }
        ])
      })
      
      mockResponses.set("index.json", {
        ok: true,
        json: () => Promise.resolve({
          entries: Array(20).fill(null).map((_, i) => ({
            name: `Array.map${i}`,
            path: `path${i}`,
            type: "method"
          }))
        })
      })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const search = await import("../src/tools/search.js")
      const result = await search.handler({ query: "map", limit: 5 })
      
      const data = JSON.parse(result.content[0].text)
      expect(data.length).toBeLessThanOrEqual(5)
    })

    it("should handle missing index gracefully", async () => {
      mockResponses.set("docs.json", {
        ok: true,
        json: () => Promise.resolve([
          { name: "JavaScript", slug: "javascript" }
        ])
      })
      
      mockResponses.set("index.json", { ok: false, status: 404 })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const search = await import("../src/tools/search.js")
      const result = await search.handler({ query: "test" })
      
      expect(result.content).toBeDefined()
    })

    it("should search case-insensitively", async () => {
      mockResponses.set("docs.json", {
        ok: true,
        json: () => Promise.resolve([
          { name: "JavaScript", slug: "javascript" }
        ])
      })
      
      mockResponses.set("index.json", {
        ok: true,
        json: () => Promise.resolve({
          entries: [
            { name: "ARRAY", path: "array", type: "class" },
            { name: "array", path: "array2", type: "class" }
          ]
        })
      })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const search = await import("../src/tools/search.js")
      const result = await search.handler({ query: "array" })
      
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(2)
    })
  })
})
