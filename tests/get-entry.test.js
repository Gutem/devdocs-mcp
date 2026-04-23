/**
 * @fileoverview Tests for devdocs_get_entry tool
 */

import { describe, it, expect, mock, beforeEach } from "bun:test"
import * as getEntry from "../src/tools/get-entry.js"

describe("get-entry tool", () => {
  beforeEach(() => {
    mock.restore()
  })

  describe("definition", () => {
    it("should have correct name", () => {
      expect(getEntry.definition.name).toBe("devdocs_get_entry")
    })

    it("should have required doc and path parameters", () => {
      expect(getEntry.definition.inputSchema.required).toContain("doc")
      expect(getEntry.definition.inputSchema.required).toContain("path")
    })
  })

  describe("handler", () => {
    it("should return entry content", async () => {
      mock.module("../src/api/client.js", () => ({
        getDocEntry: mock(() => Promise.resolve("<h1>Array.map</h1><p>Description</p>"))
      }))

      const result = await getEntry.handler({
        doc: "javascript",
        path: "Global_Objects/Array/map"
      })
      
      expect(result.content[0].type).toBe("text")
      expect(result.content[0].text).toContain("Array.map")
    })

    it("should strip HTML tags", async () => {
      mock.module("../src/api/client.js", () => ({
        getDocEntry: mock(() => Promise.resolve("<script>alert('x')</script><h1>Title</h1>"))
      }))

      const result = await getEntry.handler({
        doc: "javascript",
        path: "test"
      })
      
      expect(result.content[0].text).not.toContain("<script>")
      expect(result.content[0].text).not.toContain("<h1>")
      expect(result.content[0].text).toContain("Title")
    })

    it("should strip style tags", async () => {
      mock.module("../src/api/client.js", () => ({
        getDocEntry: mock(() => Promise.resolve("<style>.foo{}</style><p>Content</p>"))
      }))

      const result = await getEntry.handler({
        doc: "javascript",
        path: "test"
      })
      
      expect(result.content[0].text).not.toContain("<style>")
      expect(result.content[0].text).toContain("Content")
    })

    it("should truncate long content", async () => {
      const longContent = "<p>" + "x".repeat(15000) + "</p>"
      
      mock.module("../src/api/client.js", () => ({
        getDocEntry: mock(() => Promise.resolve(longContent))
      }))

      const result = await getEntry.handler({
        doc: "javascript",
        path: "test"
      })
      
      expect(result.content[0].text).toContain("truncated")
      expect(result.content[0].text.length).toBeLessThan(15000)
    })

    it("should not truncate short content", async () => {
      mock.module("../src/api/client.js", () => ({
        getDocEntry: mock(() => Promise.resolve("<p>Short content</p>"))
      }))

      const result = await getEntry.handler({
        doc: "javascript",
        path: "test"
      })
      
      expect(result.content[0].text).not.toContain("truncated")
    })

    it("should handle entry not found", async () => {
      mock.module("../src/api/client.js", () => ({
        getDocEntry: mock(() => Promise.reject(new Error("Entry not found")))
      }))

      expect(getEntry.handler({
        doc: "invalid",
        path: "invalid"
      })).rejects.toThrow("Entry not found")
    })
  })
})
