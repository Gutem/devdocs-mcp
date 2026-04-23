export const definition = {
  name: "devdocs_install",
  description: "Download/cache documentation for offline access",
  inputSchema: {
    type: "object",
    properties: {
      slugs: {
        type: "array",
        items: { type: "string" },
        description: "Array of doc slugs to install"
      }
    },
    required: ["slugs"]
  }
}

export async function handler(args) {
  const { slugs } = args
  
  // TODO: Implement persistent cache installation
  return {
    content: [{
      type: "text",
      text: `Documentation installation not yet implemented. Requested: ${slugs.join(", ")}`
    }]
  }
}
