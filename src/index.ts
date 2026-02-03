import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Env {
  MAJESTIC_API_KEY: string;
}

// Majestic API base URL
const MAJESTIC_API_URL = "https://api.majestic.com/api/json";

// Helper to make Majestic API calls
async function majesticRequest(
  apiKey: string,
  cmd: string,
  params: Record<string, string | number | boolean>
): Promise<any> {
  const url = new URL(MAJESTIC_API_URL);
  url.searchParams.set("app_api_key", apiKey);
  url.searchParams.set("cmd", cmd);
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Majestic API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.Code !== "OK") {
    throw new Error(`Majestic API error: ${data.ErrorMessage || data.Code}`);
  }
  
  return data;
}

export class MajesticMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "Majestic SEO",
    version: "1.0.0",
  });

  async init() {
    // GetIndexItemInfo - Get Trust Flow, Citation Flow, and other metrics
    this.server.tool(
      "get_index_item_info",
      "Get Trust Flow, Citation Flow, backlink counts and other key metrics for one or more URLs/domains",
      {
        items: z.array(z.string()).describe("List of URLs or domains to analyze (max 100)"),
        datasource: z.enum(["fresh", "historic"]).default("fresh").describe("Index to use: fresh (recent) or historic (5+ years)"),
        includeSubdomains: z.boolean().default(true).describe("Include subdomains in the analysis"),
      },
      async ({ items, datasource, includeSubdomains }) => {
        const result = await majesticRequest(this.env.MAJESTIC_API_KEY, "GetIndexItemInfo", {
          items: items.length,
          ...Object.fromEntries(items.map((item, i) => [`item${i}`, item])),
          datasource,
          DesiredTopics: 0,
          GetSubDomainData: includeSubdomains ? 1 : 0,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.DataTables?.Results?.Data || result, null, 2),
            },
          ],
        };
      }
    );

    // GetBackLinkData - Get list of backlinks
    this.server.tool(
      "get_backlinks",
      "Get detailed backlink data for a URL or domain",
      {
        item: z.string().describe("URL or domain to get backlinks for"),
        datasource: z.enum(["fresh", "historic"]).default("fresh").describe("Index to use"),
        count: z.number().min(1).max(50000).default(100).describe("Number of backlinks to return (max 50000)"),
        mode: z.enum(["0", "1"]).default("0").describe("0 = all backlinks, 1 = one per referring domain"),
        filterTopic: z.string().optional().describe("Filter by topic (e.g., 'Recreation/Travel')"),
        filterRefDomain: z.string().optional().describe("Filter by referring domain"),
      },
      async ({ item, datasource, count, mode, filterTopic, filterRefDomain }) => {
        const params: Record<string, string | number> = {
          item,
          datasource,
          Count: count,
          Mode: mode,
        };
        
        if (filterTopic) params.FilterTopic = filterTopic;
        if (filterRefDomain) params.FilterRefDomain = filterRefDomain;

        const result = await majesticRequest(this.env.MAJESTIC_API_KEY, "GetBackLinkData", params);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.DataTables?.BackLinks?.Data || result, null, 2),
            },
          ],
        };
      }
    );

    // GetAnchorText - Get anchor text distribution
    this.server.tool(
      "get_anchor_text",
      "Get anchor text distribution for a URL or domain",
      {
        item: z.string().describe("URL or domain to analyze"),
        datasource: z.enum(["fresh", "historic"]).default("fresh").describe("Index to use"),
        count: z.number().min(1).max(1000).default(100).describe("Number of anchor texts to return"),
        mode: z.enum(["0", "1"]).default("0").describe("0 = phrase anchors, 1 = word anchors"),
        textMode: z.enum(["0", "1", "2"]).default("0").describe("0 = anchor text, 1 = alt text, 2 = both"),
      },
      async ({ item, datasource, count, mode, textMode }) => {
        const result = await majesticRequest(this.env.MAJESTIC_API_KEY, "GetAnchorText", {
          item,
          datasource,
          Count: count,
          Mode: mode,
          TextMode: textMode,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.DataTables?.AnchorText?.Data || result, null, 2),
            },
          ],
        };
      }
    );

    // GetRefDomains - Get referring domains
    this.server.tool(
      "get_ref_domains",
      "Get list of referring domains linking to a URL or domain",
      {
        item: z.string().describe("URL or domain to analyze"),
        datasource: z.enum(["fresh", "historic"]).default("fresh").describe("Index to use"),
        count: z.number().min(1).max(50000).default(100).describe("Number of referring domains to return"),
        orderBy: z.enum(["TrustFlow", "CitationFlow", "AlexaRank", "RefDomains"]).default("TrustFlow").describe("How to order results"),
        filterTopic: z.string().optional().describe("Filter by topical Trust Flow topic"),
      },
      async ({ item, datasource, count, orderBy, filterTopic }) => {
        const params: Record<string, string | number> = {
          item,
          datasource,
          Count: count,
          OrderBy: orderBy === "TrustFlow" ? 0 : orderBy === "CitationFlow" ? 1 : orderBy === "AlexaRank" ? 2 : 3,
        };
        
        if (filterTopic) params.FilterTopic = filterTopic;

        const result = await majesticRequest(this.env.MAJESTIC_API_KEY, "GetRefDomains", params);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.DataTables?.RefDomains?.Data || result, null, 2),
            },
          ],
        };
      }
    );

    // GetTopPages - Get top backlinked pages
    this.server.tool(
      "get_top_pages",
      "Get the most backlinked pages on a domain",
      {
        item: z.string().describe("Domain to analyze"),
        datasource: z.enum(["fresh", "historic"]).default("fresh").describe("Index to use"),
        count: z.number().min(1).max(10000).default(100).describe("Number of pages to return"),
        orderBy: z.enum(["ExtBackLinks", "RefDomains", "TrustFlow", "CitationFlow"]).default("ExtBackLinks").describe("How to order results"),
      },
      async ({ item, datasource, count, orderBy }) => {
        const result = await majesticRequest(this.env.MAJESTIC_API_KEY, "GetTopPages", {
          item,
          datasource,
          Count: count,
          OrderBy: orderBy === "ExtBackLinks" ? 0 : orderBy === "RefDomains" ? 1 : orderBy === "TrustFlow" ? 2 : 3,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.DataTables?.TopPages?.Data || result, null, 2),
            },
          ],
        };
      }
    );

    // GetTopics - Get topical Trust Flow breakdown
    this.server.tool(
      "get_topics",
      "Get topical Trust Flow breakdown for a URL or domain",
      {
        item: z.string().describe("URL or domain to analyze"),
        datasource: z.enum(["fresh", "historic"]).default("fresh").describe("Index to use"),
      },
      async ({ item, datasource }) => {
        const result = await majesticRequest(this.env.MAJESTIC_API_KEY, "GetIndexItemInfo", {
          items: 1,
          item0: item,
          datasource,
          DesiredTopics: 10,
        });

        const data = result.DataTables?.Results?.Data?.[0];
        if (data) {
          // Extract topic-related fields
          const topics = [];
          for (let i = 0; i < 10; i++) {
            const topic = data[`TopicalTrustFlow_Topic_${i}`];
            const value = data[`TopicalTrustFlow_Value_${i}`];
            if (topic && value) {
              topics.push({ topic, value });
            }
          }
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ item, topics }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    // GetNewLostBackLinks - Get recently gained/lost backlinks
    this.server.tool(
      "get_new_lost_backlinks",
      "Get recently gained or lost backlinks for a domain",
      {
        item: z.string().describe("Domain to analyze"),
        count: z.number().min(1).max(50000).default(100).describe("Number of backlinks to return"),
        mode: z.enum(["new", "lost"]).default("new").describe("Get new or lost backlinks"),
      },
      async ({ item, count, mode }) => {
        const result = await majesticRequest(this.env.MAJESTIC_API_KEY, "GetNewLostBackLinks", {
          item,
          Count: count,
          Mode: mode === "new" ? 0 : 1,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.DataTables?.Data || result, null, 2),
            },
          ],
        };
      }
    );

    // CompareItems - Compare metrics for multiple items
    this.server.tool(
      "compare_items",
      "Compare Trust Flow, Citation Flow and other metrics across multiple URLs/domains",
      {
        items: z.array(z.string()).min(2).max(5).describe("List of URLs or domains to compare (2-5 items)"),
        datasource: z.enum(["fresh", "historic"]).default("fresh").describe("Index to use"),
      },
      async ({ items, datasource }) => {
        const result = await majesticRequest(this.env.MAJESTIC_API_KEY, "GetIndexItemInfo", {
          items: items.length,
          ...Object.fromEntries(items.map((item, i) => [`item${i}`, item])),
          datasource,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.DataTables?.Results?.Data || result, null, 2),
            },
          ],
        };
      }
    );

    // GetSubscriptionInfo - Check API usage and limits
    this.server.tool(
      "get_subscription_info",
      "Get current API subscription info, usage and remaining quota",
      {},
      async () => {
        const result = await majesticRequest(this.env.MAJESTIC_API_KEY, "GetSubscriptionInfo", {});

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MajesticMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return MajesticMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Root - show info
    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({
          name: "Majestic SEO MCP Server",
          version: "1.0.0",
          endpoints: {
            mcp: "/mcp",
            sse: "/sse",
          },
          tools: [
            "get_index_item_info",
            "get_backlinks", 
            "get_anchor_text",
            "get_ref_domains",
            "get_top_pages",
            "get_topics",
            "get_new_lost_backlinks",
            "compare_items",
            "get_subscription_info",
          ],
        }, null, 2),
        { 
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};
