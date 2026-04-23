/**
 * @fileoverview Tests for fuzzy search utility
 */

import { describe, it, expect } from "bun:test"
import { 
  normalizeString, 
  queryToFuzzyRegexp, 
  search, 
  quickScore 
} from "../src/utils/search.js"

describe("search utils", () => {
  describe("normalizeString", () => {
    it("should lowercase strings", () => {
      expect(normalizeString("Array")).toBe("array")
    })

    it("should preserve dots", () => {
      expect(normalizeString("Array.map")).toBe("array.map")
      expect(normalizeString("Array.prototype.map")).toBe("array.prototype.map")
    })

    it("should normalize separators", () => {
      expect(normalizeString("String::charAt")).toBe("string.charat")
      expect(normalizeString("Promise#then")).toBe("promise.then")
    })

    it("should remove spaces", () => {
      expect(normalizeString("useState hook")).toBe("usestate.hook")
    })

    it("should remove empty parentheses", () => {
      expect(normalizeString("Array()")).toBe("array")
    })
  })

  describe("queryToFuzzyRegexp", () => {
    it("should create fuzzy regexp", () => {
      const re = queryToFuzzyRegexp("abc")
      expect(re.test("abc")).toBe(true)
      expect(re.test("axbxc")).toBe(true)
      expect(re.test("a.b.c")).toBe(true)
    })

    it("should escape special chars", () => {
      const re = queryToFuzzyRegexp("a.b")
      expect(re.test("a.b")).toBe(true)
      expect(re.test("ax.b")).toBe(true)
    })
  })

  describe("quickScore", () => {
    it("should return 100 for exact match", () => {
      expect(quickScore("Array.map", "Array.map")).toBe(100)
    })

    it("should return high score for dot-prefixed match", () => {
      expect(quickScore("Array.map", "map")).toBe(99)
    })

    it("should return 0 for no match", () => {
      expect(quickScore("Array.map", "xyz")).toBe(0)
    })

    it("should support fuzzy matching", () => {
      const score = quickScore("Array.prototype.map", "arry.map")
      expect(score).toBeGreaterThan(70)
    })

    it("should penalize unmatched characters", () => {
      const shortScore = quickScore("Array.map", "map")
      const longScore = quickScore("Array.prototype.map", "map")
      expect(shortScore).toBeGreaterThan(longScore)
    })
  })

  describe("search", () => {
    const items = [
      { name: "Array.map", path: "array/map" },
      { name: "Array.filter", path: "array/filter" },
      { name: "Object.keys", path: "object/keys" },
      { name: "Promise.then", path: "promise/then" },
    ]

    it("should return sorted results by score", () => {
      const results = search(items, "map", "name")
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1].score)
    })

    it("should respect limit", () => {
      const results = search(items, "arr", "name", { limit: 1 })
      expect(results.length).toBe(1)
    })

    it("should support accessor function", () => {
      const results = search(items, "map", item => item.name.toLowerCase())
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.name).toContain("map")
    })

    it("should return empty for empty query", () => {
      const results = search(items, "", "name")
      expect(results).toEqual([])
    })

    it("should handle arrays of aliases", () => {
      const itemsWithAliases = [
        { names: ["Array.map", "Array.prototype.map"] },
      ]
      const results = search(itemsWithAliases, "map", item => item.names)
      expect(results.length).toBe(1)
    })
  })
})
