import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Agent } from '@mastra/core/agent';
import { mcp } from './mcp';
import { leadResearchWorkflow } from './workflows/lead-research-workflow';

const mcpTools = await mcp.listTools();
console.log('MCP tools registered:', Object.keys(mcpTools));

export const constructionLeadAgent = new Agent({
  id: 'construction-lead-agent',
  name: 'Construction Lead Agent',
  instructions: `
    You are a construction lead research assistant for NYC.
    Your job is to find homeowners and businesses looking to hire contractors for roofing, landscaping, and outdoor work.

    When finding leads:
    - Use both scrape_facebook_group and scrape_craigslist_leads tools to gather posts
    - Filter for posts where someone is SEEKING a contractor (not contractors advertising their services)
    - Focus on roofing, landscaping, outdoor work, gutters, siding, fencing, decking, and similar outdoor trades
    - For each relevant lead extract: who posted, what work they need, location if mentioned, urgency signals, budget signals
    - Ignore posts from contractors looking for work or subcontractors
    - Return results as a clean ranked list, highest urgency first
  `,
  model: 'google/gemini-2.5-flash',
  tools: mcpTools,
});

export const mastra = new Mastra({
  workflows: { leadResearchWorkflow },
  agents: { constructionLeadAgent },
  tools: mcpTools,
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: 'file:./mastra.db',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
