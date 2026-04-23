/**
 * @fileoverview Tests for DevDocs API client
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test"

describe("API Client", () => {
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

  describe("listDocs", () => {
    it("should fetch and return all docs when no filter", async () => {
      const mockDocs = [
        { name: "JavaScript", slug: "javascript", type: "mdn", release: "ES2024" },
        { name: "Python", slug: "python", type: "sphinx", release: "3.12" }
      ]
      
      mockResponses.set("docs.json", {
        ok: true,
        json: () => Promise.resolve(mockDocs)
      })

      const { listDocs, clearCache } = await import("../src/api/client.js")
      clearCache()
      const result = await listDocs()
      
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("JavaScript")
      expect(result[1].name).toBe("Python")
    })

    it("should filter by name", async () => {
      const mockDocs = [
        { name: "JavaScript", slug: "javascript" },
        { name: "TypeScript", slug: "typescript" },
        { name: "Python", slug: "python" }
      ]
      
      mockResponses.set("docs.json", {
        ok: true,
        json: () => Promise.resolve(mockDocs)
      })

      const { listDocs, clearCache } = await import("../src/api/client.js")
      clearCache()
      const result = await listDocs("script")
      
      expect(result).toHaveLength(2)
      expect(result.every(d => d.name.toLowerCase().includes("script"))).toBe(true)
    })

    it("should throw on HTTP error", async () => {
      mockResponses.set("docs.json", { ok: false, status: 404 })

      const { listDocs, clearCache } = await import("../src/api/client.js")
      clearCache()
      
      expect(listDocs()).rejects.toThrow("HTTP 404")
    })
  })

  describe("getDocIndex", () => {
    it("should fetch doc index", async () => {
      const mockIndex = {
        entries: [
          { name: "Array", path: "Global_Objects/Array", type: "class" },
          { name: "Array.map", path: "Global_Objects/Array/map", type: "method" }
        ],
        types: { class: 1, method: 1 }
      }
      
      mockResponses.set("index.json", {
        ok: true,
        json: () => Promise.resolve(mockIndex)
      })

      const { getDocIndex, clearCache } = await import("../src/api/client.js")
      clearCache()
      const result = await getDocIndex("javascript")
      
      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].name).toBe("Array")
    })
  })

  describe("getDocEntry", () => {
    it("should fetch entry HTML content from db.json", async () => {
      const mockDb = {
        "global_objects/array/map": "<h1>Array.prototype.map()</h1><p>Description...</p>",
        "global_objects/array/filter": "<h1>Array.prototype.filter()</h1>"
      }
      
      mockResponses.set("db.json", {
        ok: true,
        json: () => Promise.resolve(mockDb)
      })

      const { getDocEntry, clearCache } = await import("../src/api/client.js")
      clearCache()
      const result = await getDocEntry("javascript", "Global_Objects/Array/map")
      
      expect(result).toContain("Array.prototype.map")
    })

    it("should cache db.json and reuse for subsequent requests", async () => {
      const mockDb = {
        "global_objects/array/map": "<h1>Map</h1>",
        "global_objects/array/filter": "<h1>Filter</h1>"
      }
      let callCount = 0
      
      mockResponses.set("db.json", {
        ok: true,
        json: () => {
          callCount++
          return Promise.resolve(mockDb)
        }
      })

      const { getDocEntry, clearCache } = await import("../src/api/client.js")
      clearCache()
      await getDocEntry("javascript", "Global_Objects/Array/map")
      await getDocEntry("javascript", "Global_Objects/Array/filter")
      
      expect(callCount).toBe(1)
    })

    it("should throw on missing doc", async () => {
      mockResponses.set("db.json", { ok: false, status: 404 })

      const { getDocEntry, clearCache } = await import("../src/api/client.js")
      clearCache()
      
      expect(getDocEntry("invalid", "path")).rejects.toThrow("Documentation not found")
    })

    it("should throw on missing entry", async () => {
      mockResponses.set("db.json", {
        ok: true,
        json: () => Promise.resolve({ "other/path": "content" })
      })

      const { getDocEntry, clearCache } = await import("../src/api/client.js")
      clearCache()
      
      expect(getDocEntry("javascript", "invalid/path")).rejects.toThrow("Entry not found")
    })
  })

  describe("clearCache", () => {
    it("should clear cached data", async () => {
      const mockDocs = [{ name: "Test", slug: "test" }]
      let callCount = 0
      
      mockResponses.set("docs.json", {
        ok: true,
        json: () => {
          callCount++
          return Promise.resolve(mockDocs)
        }
      })

      const { listDocs, clearCache } = await import("../src/api/client.js")
      clearCache()
      await listDocs()
      clearCache()
      await listDocs()
      
      expect(callCount).toBe(2)
    })
  })
})
