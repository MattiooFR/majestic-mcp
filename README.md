# Majestic MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for the [Majestic SEO API](https://majestic.com/). Runs locally via stdio transport.

## Features

9 tools to interact with Majestic's SEO data:

| Tool | Description |
|------|-------------|
| `get_index_item_info` | Get Trust Flow, Citation Flow, backlink counts and key metrics |
| `get_backlinks` | Get detailed backlink data for a URL/domain |
| `get_anchor_text` | Get anchor text distribution |
| `get_ref_domains` | Get list of referring domains |
| `get_top_pages` | Get the most backlinked pages on a domain |
| `get_topics` | Get topical Trust Flow breakdown |
| `get_new_lost_backlinks` | Get recently gained or lost backlinks |
| `compare_items` | Compare metrics across multiple URLs/domains |
| `get_subscription_info` | Check API usage and remaining quota |

## Prerequisites

- A [Majestic API key](https://majestic.com/account/api) (requires a Majestic subscription)
- Node.js 18+

## Quick Start

### With npx (no install)

```bash
MAJESTIC_API_KEY=your-key npx majestic-mcp
```

### Global install

```bash
npm install -g majestic-mcp
MAJESTIC_API_KEY=your-key majestic-mcp
```

## MCP Configuration

### For mcporter / OpenClaw

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "majestic": {
      "command": "npx",
      "args": ["-y", "majestic-mcp"],
      "env": {
        "MAJESTIC_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### For Claude Desktop

Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "majestic": {
      "command": "npx",
      "args": ["-y", "majestic-mcp"],
      "env": {
        "MAJESTIC_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Usage with mcporter

```bash
# Get Trust Flow and Citation Flow for a domain
mcporter call majestic.get_index_item_info items='["backlink-eldorado.fr"]'

# Get backlinks
mcporter call majestic.get_backlinks item="example.com" count=50

# Compare domains
mcporter call majestic.compare_items items='["site1.com","site2.com","site3.com"]'

# Check API quota
mcporter call majestic.get_subscription_info
```

## API Reference

### get_index_item_info

Get Trust Flow, Citation Flow, and other key metrics.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `items` | string[] | required | URLs or domains to analyze (max 100) |
| `datasource` | "fresh" \| "historic" | "fresh" | Index to use |
| `includeSubdomains` | boolean | true | Include subdomain data |

### get_backlinks

Get detailed backlink data.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `item` | string | required | URL or domain |
| `datasource` | "fresh" \| "historic" | "fresh" | Index to use |
| `count` | number | 100 | Number of backlinks (max 50000) |
| `mode` | "0" \| "1" | "0" | 0=all, 1=one per domain |
| `filterTopic` | string | - | Filter by topic |
| `filterRefDomain` | string | - | Filter by referring domain |

### get_anchor_text

Get anchor text distribution.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `item` | string | required | URL or domain |
| `datasource` | "fresh" \| "historic" | "fresh" | Index to use |
| `count` | number | 100 | Number to return (max 1000) |
| `mode` | "0" \| "1" | "0" | 0=phrase, 1=word anchors |
| `textMode` | "0" \| "1" \| "2" | "0" | 0=anchor, 1=alt, 2=both |

### get_ref_domains

Get referring domains.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `item` | string | required | URL or domain |
| `datasource` | "fresh" \| "historic" | "fresh" | Index to use |
| `count` | number | 100 | Number to return (max 50000) |
| `orderBy` | string | "TrustFlow" | Sort order |
| `filterTopic` | string | - | Filter by topic |

### get_top_pages

Get most backlinked pages.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `item` | string | required | Domain to analyze |
| `datasource` | "fresh" \| "historic" | "fresh" | Index to use |
| `count` | number | 100 | Number to return (max 10000) |
| `orderBy` | string | "ExtBackLinks" | Sort order |

### get_topics

Get topical Trust Flow breakdown.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `item` | string | required | URL or domain |
| `datasource` | "fresh" \| "historic" | "fresh" | Index to use |

### get_new_lost_backlinks

Get recently gained/lost backlinks.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `item` | string | required | Domain to analyze |
| `count` | number | 100 | Number to return (max 50000) |
| `mode` | "new" \| "lost" | "new" | New or lost backlinks |

### compare_items

Compare metrics across domains.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `items` | string[] | required | 2-5 URLs/domains to compare |
| `datasource` | "fresh" \| "historic" | "fresh" | Index to use |

### get_subscription_info

Check API usage (no parameters).

## Majestic Indexes

- **Fresh Index**: Updated daily, contains links discovered in the last 120 days
- **Historic Index**: Contains 5+ years of backlink data, updated monthly

## License

MIT
