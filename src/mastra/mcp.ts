import { MCPClient } from '@mastra/mcp';

export const mcp = new MCPClient({
  servers: {
    constructionLeads: {
      url: new URL('http://0.0.0.0:8000/mcp'),
    },
  },
});
