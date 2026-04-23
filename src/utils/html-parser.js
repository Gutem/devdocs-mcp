/**
 * @fileoverview HTML parser to extract structured documentation
 * @module utils/html-parser
 */

/**
 * @typedef {Object} ParsedSection
 * @property {string} title - Section title
 * @property {string} content - Section content
 * @property {string[]} [codeExamples] - Code examples if any
 */

/**
 * @typedef {Object} ParsedDoc
 * @property {string} title - Document title
 * @property {string} description - Short description
 * @property {ParsedSection[]} sections - Parsed sections
 * @property {Object} [metadata] - Additional metadata
 * @property {string} [metadata.syntax] - Syntax if found
 * @property {string[]} [metadata.parameters] - Parameters list
 * @property {string} [metadata.returnValue] - Return value
 * @property {string[]} [codeExamples] - All code examples
 * @property {string[]} [seeAlso] - Related links
 */

/**
 * Extracts code blocks from HTML
 * @param {string} html - HTML content
 * @returns {string[]} Array of code examples
 */
function extractCodeBlocks(html) {
  const blocks = []
  const preRegex = /<pre[^>]*data-language="(\w+)"[^>]*>([\s\S]*?)<\/pre>/gi
  const codeRegex = /<code[^>]*>([\s\S]*?)<\/code>/gi
  
  let match
  while ((match = preRegex.exec(html)) !== null) {
    const code = match[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .trim()
    if (code) blocks.push(code)
  }
  
  while ((match = codeRegex.exec(html)) !== null) {
    const code = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .trim()
    if (code && code.length > 10 && !blocks.includes(code)) {
      blocks.push(code)
    }
  }
  
  return blocks.slice(0, 10)
}

/**
 * Extracts sections from HTML
 * @param {string} html - HTML content
 * @returns {ParsedSection[]}
 */
function extractSections(html) {
  const sections = []
  const h2Regex = /<h2[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*id=|$)/gi
  
  let match
  while ((match = h2Regex.exec(html)) !== null) {
    const id = match[1]
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const content = match[3]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500)
    
    if (title && content) {
      sections.push({
        title,
        id,
        content,
        codeExamples: extractCodeBlocks(match[3])
      })
    }
  }
  
  return sections.slice(0, 10)
}

/**
 * Extracts the main title and description
 * @param {string} html - HTML content
 * @returns {{title: string, description: string}}
 */
function extractTitleAndDescription(html) {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const title = h1Match 
    ? h1Match[1].replace(/<[^>]+>/g, "").trim() 
    : ""
  
  const descMatch = html.match(/<section[^>]*class="content-section"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i)
  const description = descMatch
    ? descMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 300)
    : ""
  
  return { title, description }
}

/**
 * Extracts parameters from documentation
 * @param {string} html - HTML content
 * @returns {string[]}
 */
function extractParameters(html) {
  const params = []
  const dtRegex = /<dt[^>]*><strong>([^<]+)<\/strong>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/gi
  
  let match
  while ((match = dtRegex.exec(html)) !== null) {
    const name = match[1].trim()
    const desc = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200)
    
    if (name && desc) {
      params.push(`**${name}**: ${desc}`)
    }
  }
  
  return params.slice(0, 20)
}

/**
 * Extracts syntax examples
 * @param {string} html - HTML content
 * @returns {string|null}
 */
function extractSyntax(html) {
  const syntaxMatch = html.match(/<h3[^>]*id="syntax"[^>]*>[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>/i)
  if (syntaxMatch) {
    return syntaxMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim()
  }
  return null
}

/**
 * Extracts return value description
 * @param {string} html - HTML content
 * @returns {string|null}
 */
function extractReturnValue(html) {
  const returnMatch = html.match(/<h[23][^>]*id="return_value"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i)
  if (returnMatch) {
    return returnMatch[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300)
  }
  return null
}

/**
 * Extracts "See also" links
 * @param {string} html - HTML content
 * @returns {string[]}
 */
function extractSeeAlso(html) {
  const links = []
  const seeAlsoMatch = html.match(/<h2[^>]*id="see_also"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i)
  
  if (seeAlsoMatch) {
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi
    let match
    while ((match = linkRegex.exec(seeAlsoMatch[1])) !== null) {
      links.push(`${match[2].trim()} (${match[1]})`)
    }
  }
  
  return links.slice(0, 10)
}

/**
 * Parses HTML documentation into structured format
 * @param {string} html - Raw HTML content
 * @returns {ParsedDoc} Structured documentation
 */
export function parseDocumentation(html) {
  const { title, description } = extractTitleAndDescription(html)
  const sections = extractSections(html)
  const codeExamples = extractCodeBlocks(html)
  const parameters = extractParameters(html)
  const syntax = extractSyntax(html)
  const returnValue = extractReturnValue(html)
  const seeAlso = extractSeeAlso(html)
  
  return {
    title,
    description,
    sections,
    codeExamples,
    metadata: {
      syntax,
      parameters,
      returnValue,
      seeAlso
    }
  }
}

/**
 * Formats parsed documentation for AI consumption (like Context7's APIDOC)
 * @param {ParsedDoc} doc - Parsed documentation
 * @returns {string} Formatted text
 */
export function formatForAI(doc) {
  const lines = []
  
  lines.push(`## ${doc.title}`)
  lines.push("")
  
  if (doc.description) {
    lines.push(doc.description)
    lines.push("")
  }
  
  if (doc.metadata.syntax) {
    lines.push("### Syntax")
    lines.push("```javascript")
    lines.push(doc.metadata.syntax)
    lines.push("```")
    lines.push("")
  }
  
  if (doc.metadata.parameters?.length > 0) {
    lines.push("### Parameters")
    doc.metadata.parameters.forEach(p => lines.push(`- ${p}`))
    lines.push("")
  }
  
  if (doc.metadata.returnValue) {
    lines.push("### Return Value")
    lines.push(doc.metadata.returnValue)
    lines.push("")
  }
  
  if (doc.codeExamples?.length > 0) {
    lines.push("### Examples")
    doc.codeExamples.slice(0, 3).forEach((code, i) => {
      lines.push(`\`\`\`javascript`)
      lines.push(code)
      lines.push("```")
      lines.push("")
    })
  }
  
  if (doc.metadata.seeAlso?.length > 0) {
    lines.push("### See Also")
    lines.push(doc.metadata.seeAlso.join(", "))
  }
  
  return lines.join("\n")
}

/**
 * Calculate quality score for documentation entry
 * @param {ParsedDoc} doc - Parsed documentation
 * @returns {number} Score 0-100
 */
export function calculateQualityScore(doc) {
  let score = 0
  
  if (doc.title) score += 10
  if (doc.description) score += 15
  if (doc.codeExamples?.length > 0) score += Math.min(doc.codeExamples.length * 5, 25)
  if (doc.metadata.syntax) score += 15
  if (doc.metadata.parameters?.length > 0) score += 15
  if (doc.metadata.returnValue) score += 10
  if (doc.sections?.length > 0) score += 5
  if (doc.metadata.seeAlso?.length > 0) score += 5
  
  return Math.min(score, 100)
}
