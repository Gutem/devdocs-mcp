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

    it("should have format parameter with options", () => {
      const formatProp = getEntry.definition.inputSchema.properties.format
      expect(formatProp).toBeDefined()
      expect(formatProp.enum).toContain("ai")
      expect(formatProp.enum).toContain("text")
      expect(formatProp.enum).toContain("json")
      expect(formatProp.enum).toContain("raw")
    })
  })

  describe("handler", () => {
    it("should return structured AI format by default", async () => {
      mock.module("../src/api/client.js", () => ({
        getDocEntry: mock(() => Promise.resolve("<h1>Array.map</h1><p>Description</p>"))
      }))

      const result = await getEntry.handler({
        doc: "javascript",
        path: "Global_Objects/Array/map"
      })
      
      expect(result.content[0].type).toBe("text")
      expect(result.content[0].text).toContain("Quality Score")
      expect(result._meta.qualityScore).toBeDefined()
    })

    it("should return raw HTML with format=raw", async () => {
      mock.module("../src/api/client.js", () => ({
        getDocEntry: mock(() => Promise.resolve("<h1>Array.map</h1><p>Description</p>"))
      }))

      const result = await getEntry.handler({
        doc: "javascript",
        path: "test",
        format: "raw"
      })
      
      expect(result.content[0].text).toContain("<h1>")
    })

    it("should return plain text with format=text", async () => {
      mock.module("../src/api/client.js", () => ({
        getDocEntry: mock(() => Promise.resolve("<style>.foo{}</style><p>Content</p>"))
      }))

      const result = await getEntry.handler({
        doc: "javascript",
        path: "test",
        format: "text"
      })
      
      expect(result.content[0].text).not.toContain("<style>")
      expect(result.content[0].text).toContain("Content")
    })

    it("should return JSON with format=json", async () => {
      mock.module("../src/api/client.js", () => ({
        getDocEntry: mock(() => Promise.resolve("<h1>Array.map</h1><p>Description</p><pre data-language=\"js\">code</pre>"))
      }))

      const result = await getEntry.handler({
        doc: "javascript",
        path: "test",
        format: "json"
      })
      
      const data = JSON.parse(result.content[0].text)
      expect(data.title).toBeDefined()
      expect(data.qualityScore).toBeDefined()
    })

    it("should include quality score in metadata", async () => {
      mock.module("../src/api/client.js", () => ({
        getDocEntry: mock(() => Promise.resolve("<h1>Array.map</h1><p>Description</p>"))
      }))

      const result = await getEntry.handler({
        doc: "javascript",
        path: "test"
      })
      
      expect(result._meta.qualityScore).toBeGreaterThanOrEqual(0)
      expect(result._meta.qualityScore).toBeLessThanOrEqual(100)
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
