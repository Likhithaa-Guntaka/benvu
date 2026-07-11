# Benvu

**Your AI teammate for nonprofits.**

Benvu lives inside Slack and does the back-office work that pulls nonprofit staff away from their mission: finding real federal grants, drafting reports and donor notes, tracking deadlines, summarizing meetings, and searching what your team already discussed. No new tools, no dashboards, no forms. Just type what you need, in any language, and Benvu handles it.

Built for the [Slack Agent Builder Challenge](https://slackagentchallenge.devpost.com/) — Agent for Good track.

---

## What it does

**Find grants.** Searches live U.S. federal grants via the Grants.gov API, filtered to your org type's funding categories. Returns structured grant cards with amount, deadline, agency, and a one-click Track deadline button.

**Draft documents.** Impact reports, donor thank-yous, volunteer announcements. Give Benvu one line and it writes the full draft in your language. Follow-up messages revise the same draft in place.

**Track deadlines.** Name something due and Benvu remembers it, then nudges your team in Slack before it arrives. Mark done or snooze from the reminder.

**Summarize meetings.** Paste notes, get a clean summary with decisions and action items.

**Search your workspace.** Uses Slack's Real-Time Search API to ground answers in what your team already said, not just what Benvu knows.

**Multilingual.** Detects the language you write in and replies in it, across all capabilities.

---

## Org-type tailoring

Benvu asks what kind of work you do and reconfigures itself around the answer. Six org types are deeply tailored with sector-specific grant defaults, operational prompts, and a flagship capability:

| Org type | Grant categories | Flagship |
|---|---|---|
| Food Bank / Food & Nutrition | FN, ISS | TEFAP compliance deadline seeding |
| Mental Health / Crisis Support | HL, ISS | Privacy-aware mode (warns before drafting client identifiers) |
| Immigrant & Refugee Services | ISS, CD, ELT | Multilingual-first (intake + translate by default) |
| Housing & Homelessness | HO, ISS | HUD CoC deadline seeding |
| Education / Youth Programs | ED | Academic-calendar-aware deadline framing |
| Arts & Culture | AR, HU | NEA 1:1 match tracker |

The App Home also shows a live count of grants closing in the next 30 days, pulled from Grants.gov and filtered to your org's funding categories.

---

## How to reach Benvu

- **Direct message** — type anything in any language
- **@mention** in a channel — responds in a thread
- **Slash commands** — `/grant`, `/report`, `/deadline`, `/announce`, `/benvu` (help)
- **Message shortcut** — "Send to Benvu" from any message's ⋯ menu
- **Emoji reactions** — 📋 summarize, 💰 find grants, 📝 draft from a message
- **App Home tab** — org picker, tailored quick actions, live grant count
- **Assistant panel** — suggested prompts in a new assistant thread

---

## Tech stack

- **Slack Bolt for JavaScript** (Socket Mode + OAuth/HTTP)
- **Claude Agent SDK** — agent reasoning, tool orchestration
- **In-process MCP server** — all 10 tools registered via `createSdkMcpServer()`
- **Hosted Slack MCP Server** — native Slack read/write/canvas when user token present
- **Slack Real-Time Search (RTS) API** — `assistant.search.context` for workspace search
- **Grants.gov API** — Search2 + fetchOpportunity (live, no key required)
- **Zod** for tool schemas, **Biome** for lint/format, **tsc --checkJs** for types
- **287 tests** via node:test, all passing

---

## Setup

```bash
git clone https://github.com/Likhithaa-Guntaka/benvu
cd benvu
npm install
cp .env.sample .env
# Fill in SLACK_APP_TOKEN and SLACK_BOT_TOKEN (see .env.sample)
npm start
```

For OAuth mode (enables RTS and Slack MCP): use `node app-oauth.js` with the additional OAuth vars from `.env.sample`.

---

## Known limitations

- Most state is in-memory and resets on server restart (deadlines, match progress, sessions). Only org-type selections persist to disk.
- Grants are U.S. federal only via Grants.gov. No state, local, or foundation grants.
- RTS and Slack MCP require a user token (OAuth mode). Socket Mode gets a graceful fallback message.
- The pre-selection Home wordmark image is served from this public repo's raw URL. Making the repo private would break it.
- Deadline reminders are process-local. A server restart clears tracked deadlines.

---

## Acknowledgment

Benvu was built with significant assistance from Claude Code, Anthropic's agentic coding tool, which helped implement, test, and refine the codebase throughout the hackathon. The product direction, design decisions, and nonprofit domain research are our own.

---

## License

MIT
