export const definition = {
  name: "devdocs_list_installed",
  description: "List currently installed/cached documentation",
  inputSchema: {
    type: "object",
    properties: {}
  }
}

export async function handler(args) {
  // TODO: Implement installed docs listing from persistent cache
  return {
    content: [{
      type: "text",
      text: "No documentation currently installed. Use devdocs_install to download docs for offline access."
    }]
  }
}
