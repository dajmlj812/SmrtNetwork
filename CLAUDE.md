# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmrtNetwork is a Cisco Meraki network intelligence application that connects to the Meraki Dashboard API, analyzes network health with Claude AI, surfaces issues before they become outages, and allows natural-language queries about devices and traffic flows.

**Core capabilities:**
- Network-wide health scoring and trend analysis
- Device lookup by MAC address or IP with full client history
- Traffic flow visualization across the network
- AI-generated diagnosis of anomalies, misconfigurations, and degradation
- Natural-language querying of network state via Claude

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ App Router (TypeScript) |
| UI | shadcn/ui + Tailwind CSS |
| Data fetching | TanStack Query (React Query v5) |
| Charts | Recharts |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) with prompt caching |
| Meraki | Custom typed API client in `src/lib/meraki/` |

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Run production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

## Environment Variables

```
MERAKI_API_KEY=         # Meraki Dashboard API key (never expose to client)
MERAKI_BASE_URL=        # Default: https://api.meraki.com/api/v1
ANTHROPIC_API_KEY=      # Claude API key (never expose to client)
```

Place these in `.env.local` (not committed). Both API keys must only be accessed from Next.js API routes, never from client components.

## Architecture

### Request Flow

```
Browser → Next.js page (React) → TanStack Query
                                        ↓
                               /api/meraki/* (Next.js Route Handler)
                                        ↓
                               Meraki Dashboard API
                                        ↓
                               /api/analyze/* (Next.js Route Handler)
                                        ↓
                               Anthropic SDK → Claude
```

All Meraki and Anthropic API calls are made exclusively from Next.js Route Handlers (`src/app/api/`). Client components never touch either API key.

### Directory Structure

```
src/
  app/
    api/
      meraki/           # Route Handlers proxying Meraki API
        organizations/
        networks/
        devices/
        clients/
        traffic/
      analyze/          # Route Handlers calling Claude for analysis
        health/         # Overall network health assessment
        device/         # Per-device diagnosis
        traffic/        # Traffic anomaly analysis
    dashboard/          # Network health overview page
    devices/            # Device lookup (MAC / IP search)
    network/            # Traffic flow and topology views
    alerts/             # Active issues and AI-generated recommendations
  components/
    dashboard/          # Health score cards, summary widgets
    devices/            # Device detail panels, client tables
    network/            # Traffic charts, topology graph
    ui/                 # shadcn/ui primitives (auto-generated, do not edit)
  lib/
    meraki/
      client.ts         # Typed Meraki API client (wraps fetch)
      types.ts          # Meraki API response types
    claude/
      client.ts         # Anthropic SDK wrapper with prompt caching
      prompts.ts        # System prompts for each analysis type
    utils/
  types/                # Shared TypeScript types across app
```

### Meraki API Client (`src/lib/meraki/client.ts`)

Wrap all Meraki calls through a typed client that:
- Injects `X-Cisco-Meraki-API-Key` header from `MERAKI_API_KEY`
- Handles rate limiting (Meraki limits to 10 req/s; use exponential backoff)
- Returns typed responses using types from `meraki/types.ts`

Key Meraki API paths used:
- `GET /organizations` — list orgs
- `GET /organizations/{orgId}/networks` — list networks
- `GET /networks/{networkId}/devices` — all devices
- `GET /networks/{networkId}/clients` — connected clients
- `GET /devices/{serial}/clients` — clients on a specific device
- `GET /networks/{networkId}/insight/applications` — application traffic
- `GET /organizations/{orgId}/alerts/profiles` — alert configs
- `GET /devices/{serial}/lossAndLatencyHistory` — uplink health

### Claude Integration (`src/lib/claude/client.ts`)

Use the Anthropic SDK with **prompt caching** for repeated large-context calls (network topology, device inventory). Cache the system prompt and static network context; inject dynamic data (current metrics, alerts) as the user turn.

Analysis types:
- **Health analysis** — takes org/network snapshot, returns health score + issues list
- **Device diagnosis** — takes device details + client history, returns diagnosis
- **Traffic analysis** — takes traffic metrics, identifies anomalies and top talkers
- **Natural language query** — freeform Q&A about the network state

Always stream responses for analysis endpoints (`anthropic.messages.stream()`); the UI should render incrementally.

### Data Freshness

- Network topology / device inventory: cache 5 minutes (TanStack Query `staleTime`)
- Connected clients: cache 60 seconds
- Traffic metrics: cache 30 seconds
- Health score: recalculate on demand or every 5 minutes

## Key Constraints

- Meraki API rate limit: 10 requests/second per org. Batch or queue calls; never fan out unbounded parallel requests.
- Claude context window: large network inventories can exceed limits. Summarize or paginate device lists before sending to Claude rather than dumping raw API responses.
- Prompt caching: mark stable content (system prompt, static network topology) as `cache_control: { type: "ephemeral" }` to reduce cost on repeated analysis calls.
