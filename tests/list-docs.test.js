/**
 * @fileoverview Tests for devdocs_list_docs tool
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test"

describe("list-docs tool", () => {
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
      const listDocs = await import("../src/tools/list-docs.js")
      expect(listDocs.definition.name).toBe("devdocs_list_docs")
    })

    it("should have description", async () => {
      const listDocs = await import("../src/tools/list-docs.js")
      expect(listDocs.definition.description).toContain("DevDocs.io")
    })

    it("should have filter parameter", async () => {
      const listDocs = await import("../src/tools/list-docs.js")
      expect(listDocs.definition.inputSchema.properties.filter).toBeDefined()
      expect(listDocs.definition.inputSchema.properties.filter.type).toBe("string")
    })
  })

  describe("handler", () => {
    it("should return list of docs", async () => {
      mockResponses.set("docs.json", {
        ok: true,
        json: () => Promise.resolve([
          { name: "JavaScript", slug: "javascript", release: "ES2024", type: "mdn" },
          { name: "Python", slug: "python", release: "3.12", type: "sphinx" }
        ])
      })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const listDocs = await import("../src/tools/list-docs.js")
      const result = await listDocs.handler({})
      
      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe("text")
      
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(2)
      expect(data[0].name).toBe("JavaScript")
    })

    it("should limit results to 50", async () => {
      const manyDocs = Array(100).fill(null).map((_, i) => ({
        name: `Doc ${i}`,
        slug: `doc-${i}`,
        release: "1.0"
      }))
      
      mockResponses.set("docs.json", {
        ok: true,
        json: () => Promise.resolve(manyDocs)
      })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const listDocs = await import("../src/tools/list-docs.js")
      const result = await listDocs.handler({})
      
      const data = JSON.parse(result.content[0].text)
      expect(data.length).toBeLessThanOrEqual(50)
    })

    it("should include metadata", async () => {
      mockResponses.set("docs.json", {
        ok: true,
        json: () => Promise.resolve([
          { name: "Test", slug: "test", release: "1.0" }
        ])
      })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const listDocs = await import("../src/tools/list-docs.js")
      const result = await listDocs.handler({})
      
      expect(result._meta).toBeDefined()
      expect(result._meta.total).toBe(1)
      expect(result._meta.shown).toBe(1)
    })

    it("should handle version field", async () => {
      mockResponses.set("docs.json", {
        ok: true,
        json: () => Promise.resolve([
          { name: "Angular", slug: "angular~18", version: "18", release: "18.2.0" }
        ])
      })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const listDocs = await import("../src/tools/list-docs.js")
      const result = await listDocs.handler({})
      
      const data = JSON.parse(result.content[0].text)
      expect(data[0].version).toBe("18")
    })

    it("should default version to 'latest'", async () => {
      mockResponses.set("docs.json", {
        ok: true,
        json: () => Promise.resolve([
          { name: "JavaScript", slug: "javascript", release: "ES2024" }
        ])
      })

      const { clearCache } = await import("../src/api/client.js")
      clearCache()
      
      const listDocs = await import("../src/tools/list-docs.js")
      const result = await listDocs.handler({})
      
      const data = JSON.parse(result.content[0].text)
      expect(data[0].version).toBe("latest")
    })
  })
})
