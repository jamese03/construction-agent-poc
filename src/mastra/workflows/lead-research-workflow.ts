import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { mcp } from '../mcp';

const leadSchema = z.object({
  poster: z.string().nullable(),
  postText: z.string(),
  postUrl: z.string().nullable(),
  postedAt: z.string().nullable(),
  jobType: z.string(),
  urgency: z.enum(['high', 'medium', 'low']),
  budgetSignal: z.string().nullable(),
  location: z.string().nullable(),
});

const scrapeLeads = createStep({
  id: 'scrape-leads',
  description: 'Scrapes Facebook and Craigslist for construction leads',
  inputSchema: z.object({ maxPosts: z.number().default(25) }),
  outputSchema: z.object({ rawPosts: z.array(z.record(z.string(), z.unknown())) }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('constructionLeadAgent');
    if (!agent) throw new Error('constructionLeadAgent not found');

    const toolsets = await mcp.listToolsets();
    const response = await agent.generate(
      [{
        role: 'user',
        content: `Scrape up to ${inputData.maxPosts} posts from both Facebook and Craigslist and return the raw results as a JSON array.`,
      }],
      { toolsets },
    );

    let rawPosts: Record<string, any>[] = [];
    try {
      const match = response.text.match(/\[[\s\S]*\]/);
      if (match) rawPosts = JSON.parse(match[0]);
    } catch {
      rawPosts = [];
    }

    return { rawPosts };
  },
});

const classifyLeads = createStep({
  id: 'classify-leads',
  description: 'Filters and classifies raw posts into structured leads',
  inputSchema: z.object({ rawPosts: z.array(z.record(z.string(), z.unknown())) }),
  outputSchema: z.object({ leads: z.array(leadSchema) }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('constructionLeadAgent');
    if (!agent) throw new Error('constructionLeadAgent not found');

    const response = await agent.generate(
      [{
        role: 'user',
        content: `
          From these raw posts, filter only those where someone is SEEKING a contractor for roofing, landscaping, or outdoor work.
          Return a JSON array with this shape for each relevant lead:
          {
            "poster": string | null,
            "postText": string,
            "postUrl": string | null,
            "postedAt": string | null,
            "jobType": string,
            "urgency": "high" | "medium" | "low",
            "budgetSignal": string | null,
            "location": string | null
          }
          Raw posts:
          ${JSON.stringify(inputData.rawPosts, null, 2)}
        `,
      }],
    );

    let leads: z.infer<typeof leadSchema>[] = [];
    try {
      const match = response.text.match(/\[[\s\S]*\]/);
      if (match) leads = JSON.parse(match[0]);
    } catch {
      leads = [];
    }

    return { leads };
  },
});

export const leadResearchWorkflow = createWorkflow({
  id: 'lead-research-workflow',
  inputSchema: z.object({ maxPosts: z.number().default(25) }),
  outputSchema: z.object({ leads: z.array(leadSchema) }),
})
  .then(scrapeLeads)
  .then(classifyLeads);

leadResearchWorkflow.commit();
