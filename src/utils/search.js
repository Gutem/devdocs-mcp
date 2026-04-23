/**
 * @fileoverview Fuzzy search algorithm ported from DevDocs
 * @module utils/search
 * 
 * Ported from: assets/javascripts/app/searcher.js
 * Original scoring:
 * - Exact match: 100 - (unmatched chars)
 * - Fuzzy match: 66-100 based on position and match length
 */

const SEPARATOR = "."

/**
 * Normalizes a string for search
 * @param {string} str - Input string
 * @returns {string} Normalized string
 */
export function normalizeString(str) {
  return str
    .toLowerCase()
    .replace(/\.\.\./g, "")
    .replace(/ event$/g, "")
    .replace(/\s\(\w+?\)$/g, "")
    .replace(/#|::|:-|->|\$(?=\w)|\-(?=\w)|\:(?=\w)|\ [\/\-&]\ |:\ |\ /g, SEPARATOR)
    .replace(/\.+/g, SEPARATOR)
    .replace(/\(\)/g, "")
    .replace(/\s/g, "")
}

/**
 * Converts query to fuzzy regexp
 * @param {string} query - Search query
 * @returns {RegExp} Fuzzy regexp
 * 
 * @example
 * queryToFuzzyRegexp("abc") // => /a.*?b.*?c.*?/
 */
export function queryToFuzzyRegexp(query) {
  const chars = query.split("")
  const escaped = chars.map(c => escapeRegExp(c))
  return new RegExp(escaped.join(".*?"))
}

/**
 * Escapes special regexp characters
 * @param {string} str - Input string
 * @returns {string} Escaped string
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Calculates score for exact match
 * @param {string} value - The value being matched
 * @param {string} query - The search query
 * @param {number} index - Position of match
 * @returns {number} Score (1-100)
 */
function scoreExactMatch(value, query, index) {
  const valueLength = value.length
  const queryLength = query.length
  
  // Start with base score
  let score = 100 - (valueLength - queryLength)
  
  if (index > 0) {
    // If preceded by dot, treat as if at beginning
    if (value.charAt(index - 1) === SEPARATOR) {
      score += index - 1
    } else if (queryLength === 1) {
      // Single char must be at beginning or after dot
      return 0
    } else {
      // Penalty for unmatched chars before match
      let i = index - 2
      while (i >= 0 && value.charAt(i) !== SEPARATOR) {
        i--
      }
      score -= (index - i) + (valueLength - queryLength - index)
    }
    
    // Penalty for dots before match
    let separators = 0
    for (let i = index - 2; i >= 0; i--) {
      if (value.charAt(i) === SEPARATOR) separators++
    }
    score -= separators
  }
  
  // Heavy penalty for dots after match
  let separators = 0
  for (let i = valueLength - queryLength - index - 1; i >= 0; i--) {
    if (value.charAt(index + queryLength + i) === SEPARATOR) separators++
  }
  score -= separators * 5
  
  return Math.max(1, score)
}

/**
 * Calculates score for fuzzy match
 * @param {string} value - The value being matched
 * @param {number} matchIndex - Position of match
 * @param {number} matchLength - Length of match
 * @returns {number} Score (1-100)
 */
function scoreFuzzyMatch(value, matchIndex, matchLength) {
  const valueLength = value.length
  
  // At beginning or after dot
  if (matchIndex === 0 || value.charAt(matchIndex - 1) === SEPARATOR) {
    return Math.max(66, 100 - matchLength)
  }
  
  // At end
  if (matchIndex + matchLength === valueLength) {
    return Math.max(33, 67 - matchLength)
  }
  
  // In middle
  return Math.max(1, 34 - matchLength)
}

/**
 * Searches for exact match and returns score
 * @param {string} value - The value to search in
 * @param {string} query - The search query
 * @returns {number|null} Score or null if no match
 */
function exactMatch(value, query) {
  const index = value.indexOf(query)
  if (index < 0) return null
  
  // Check for multiple matches, return best score
  const lastIndex = value.lastIndexOf(query)
  
  if (index !== lastIndex) {
    return Math.max(
      scoreExactMatch(value, query, index),
      scoreExactMatch(value, query, lastIndex)
    )
  }
  
  return scoreExactMatch(value, query, index)
}

/**
 * Searches for fuzzy match and returns score
 * @param {string} value - The value to search in
 * @param {string} query - The search query
 * @param {RegExp} fuzzyRegexp - Pre-compiled fuzzy regexp
 * @returns {number|null} Score or null if no match
 */
function fuzzyMatch(value, query, fuzzyRegexp) {
  const valueLength = value.length
  const queryLength = query.length
  
  // Skip if value is shorter than query or contains exact match
  if (valueLength <= queryLength || value.includes(query)) {
    return null
  }
  
  fuzzyRegexp.lastIndex = 0
  const match = fuzzyRegexp.exec(value)
  if (!match) return null
  
  const matchIndex = match.index
  const matchLength = match[0].length
  let score = scoreFuzzyMatch(value, matchIndex, matchLength)
  
  // Also check from last separator
  const lastSepIndex = value.lastIndexOf(SEPARATOR) + 1
  if (lastSepIndex > 0) {
    fuzzyRegexp.lastIndex = 0
    const subMatch = fuzzyRegexp.exec(value.slice(lastSepIndex))
    if (subMatch) {
      const subScore = scoreFuzzyMatch(
        value,
        lastSepIndex + subMatch.index,
        subMatch[0].length
      )
      score = Math.max(score, subScore)
    }
  }
  
  return score
}

/**
 * @typedef {Object} SearchResult
 * @property {Object} item - The matched item
 * @property {number} score - Match score (1-100)
 */

/**
 * Searches an array of items
 * @param {Array} items - Items to search
 * @param {string} query - Search query
 * @param {string|Function} key - Property name or accessor function
 * @param {Object} [options] - Search options
 * @param {number} [options.limit=20] - Maximum results
 * @param {number} [options.fuzzyMinLength=3] - Minimum query length for fuzzy
 * @returns {SearchResult[]} Sorted search results
 */
export function search(items, query, key, options = {}) {
  const { limit = 20, fuzzyMinLength = 3 } = options
  
  const normalizedQuery = normalizeString(query)
  const queryLength = normalizedQuery.length
  
  if (queryLength === 0 || normalizedQuery === SEPARATOR) {
    return []
  }
  
  const accessor = typeof key === "function" ? key : (item) => item[key]
  const fuzzyRegexp = queryLength >= fuzzyMinLength 
    ? queryToFuzzyRegexp(normalizedQuery) 
    : null
  
  /** @type {Array<{item: any, score: number}>} */
  const results = []
  const scoreMap = new Array(101)
  
  for (const item of items) {
    const value = accessor(item)
    if (!value) continue
    
    const normalizedValue = typeof value === "string" 
      ? normalizeString(value)
      : value.map(v => normalizeString(v))
    
    let bestScore = 0
    
    if (typeof normalizedValue === "string") {
      // Exact match first
      const exactScore = exactMatch(normalizedValue, normalizedQuery)
      if (exactScore) bestScore = Math.max(bestScore, exactScore)
      
      // Fuzzy match
      if (fuzzyRegexp && !exactScore) {
        const fuzzyScore = fuzzyMatch(normalizedValue, normalizedQuery, fuzzyRegexp)
        if (fuzzyScore) bestScore = Math.max(bestScore, fuzzyScore)
      }
    } else {
      // Array of aliases
      for (const v of normalizedValue) {
        const exactScore = exactMatch(v, normalizedQuery)
        if (exactScore) bestScore = Math.max(bestScore, exactScore)
        
        if (fuzzyRegexp && !exactScore) {
          const fuzzyScore = fuzzyMatch(v, normalizedQuery, fuzzyRegexp)
          if (fuzzyScore) bestScore = Math.max(bestScore, fuzzyScore)
        }
      }
    }
    
    if (bestScore > 0) {
      const roundedScore = Math.round(bestScore)
      if (!scoreMap[roundedScore]) {
        scoreMap[roundedScore] = []
      }
      scoreMap[roundedScore].push({ item, score: bestScore })
    }
  }
  
  // Collect results from highest to lowest score
  const sorted = []
  for (let i = scoreMap.length - 1; i >= 0 && sorted.length < limit; i--) {
    if (scoreMap[i]) {
      sorted.push(...scoreMap[i])
    }
  }
  
  return sorted.slice(0, limit)
}

/**
 * Quick search score for a single value
 * @param {string} value - Value to score
 * @param {string} query - Search query
 * @returns {number} Score (0-100)
 */
export function quickScore(value, query) {
  const normalizedValue = normalizeString(value)
  const normalizedQuery = normalizeString(query)
  
  if (!normalizedQuery || normalizedQuery === SEPARATOR) return 0
  
  // Try exact match
  const exact = exactMatch(normalizedValue, normalizedQuery)
  if (exact) return exact
  
  // Try fuzzy match
  if (normalizedQuery.length >= 3) {
    const fuzzy = fuzzyMatch(
      normalizedValue, 
      normalizedQuery, 
      queryToFuzzyRegexp(normalizedQuery)
    )
    if (fuzzy) return fuzzy
  }
  
  return 0
}
