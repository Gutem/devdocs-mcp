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
      const searchTool = await import("../src/tools/search.js")
      expect(searchTool.definition.name).toBe("devdocs_search")
    })

    it("should have required query parameter", async () => {
      const searchTool = await import("../src/tools/search.js")
      expect(searchTool.definition.inputSchema.required).toContain("query")
    })

    it("should have optional docs parameter", async () => {
      const searchTool = await import("../src/tools/search.js")
      expect(searchTool.definition.inputSchema.properties.docs).toBeDefined()
      expect(searchTool.definition.inputSchema.properties.docs.type).toBe("array")
    })

    it("should have optional limit parameter", async () => {
      const searchTool = await import("../src/tools/search.js")
      expect(searchTool.definition.inputSchema.properties.limit).toBeDefined()
      expect(searchTool.definition.inputSchema.properties.limit.type).toBe("number")
    })
  })

  describe("handler", () => {
    it("should return search results with scores", async () => {
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
            { name: "Array.map", path: "array/map", type: "method" },
            { name: "Array.filter", path: "array/filter", type: "method" }
          ]
        })
      })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const searchTool = await import("../src/tools/search.js")
      const result = await searchTool.handler({ query: "map" })
      
      expect(result.content[0].type).toBe("text")
      const data = JSON.parse(result.content[0].text)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0].score).toBeDefined()
      expect(data[0].score).toBeGreaterThan(0)
    })

    it("should use fuzzy matching", async () => {
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
            { name: "Array.prototype.map", path: "array/map", type: "method" }
          ]
        })
      })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const searchTool = await import("../src/tools/search.js")
      const result = await searchTool.handler({ query: "arry.map" })
      
      const data = JSON.parse(result.content[0].text)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0].name).toContain("map")
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
      
      const searchTool = await import("../src/tools/search.js")
      const result = await searchTool.handler({ query: "map", limit: 5 })
      
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
      
      const searchTool = await import("../src/tools/search.js")
      const result = await searchTool.handler({ query: "test" })
      
      expect(result.content).toBeDefined()
    })

    it("should include metadata", async () => {
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
            { name: "Array.map", path: "array/map", type: "method" }
          ]
        })
      })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const searchTool = await import("../src/tools/search.js")
      const result = await searchTool.handler({ query: "map" })
      
      expect(result._meta).toBeDefined()
      expect(result._meta.query).toBe("map")
      expect(result._meta.totalSearched).toBeGreaterThan(0)
    })
  })
})
