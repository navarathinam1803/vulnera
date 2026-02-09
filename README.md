# RiskLens (Vulnera)

An MCP (Model Context Protocol) server that acts as a **developer security assistant**: it scans project dependencies for vulnerabilities, answers ship-readiness questions, prioritizes risks, suggests upgrades, and compares scans over time. Supports **Node.js** (npm audit) and **Python** (pip-audit), with optional **GitHub** repo scanning.

## Features

### MCP Tools

RiskLens provides 6 powerful MCP tools for comprehensive security analysis:

#### 1. **Ship Readiness Check** (`is_app_safe_to_ship`)
- Answers "Is this app safe to ship today?" based on dependency vulnerabilities
- Uses default policy: safe only when there are no critical or high severity issues
- Returns verdict, severity counts, reason, and actionable recommendations
- **Widget**: `/ship-readiness`

#### 2. **Highest Risk Dependency** (`get_highest_risk_dependency`)
- Identifies the single dependency with the highest risk
- Returns top vulnerability with details and full list sorted by severity
- Includes fix availability and CVSS-style prioritization
- **Widget**: `/highest-risk`

#### 3. **Vulnerability Summary** (`summarize_vulnerabilities`)
- Translates technical security audit output into plain-language summaries
- Groups findings by severity level (critical/high/moderate/low/info)
- Distinguishes between direct and transitive dependencies
- **Widget**: `/vulnerability-summary`

#### 4. **Upgrade Suggestions** (`suggest_upgrades`)
- Returns concrete upgrade steps and exact install commands
- Supports both `npm install` (Node.js) and `pip install` (Python)
- Sorted by severity with critical/high vulnerabilities prioritized first
- **Widget**: `/upgrade-suggestions`

#### 5. **Compare Scans Over Time** (`compare_scans_over_time`)
- Saves scans per repo and compares baseline vs current state
- Shows what vulnerabilities were fixed or newly introduced
- Maintains up to 20 scans per repo in memory
- Tracks trends across commits, branches, or time periods
- **Widget**: `/compare-scans`

#### 6. **PDF Report Generation** (`generate_report`)
- Generates professional PDF security audit reports
- Includes summary tables with severity counts
- Detailed vulnerability listings with package names, ranges, and fixes
- Reports saved to `security-reports/` directory with timestamps
- **Widget**: `/security-report`

### Scan Targets

- **Local path** – `package.json` (Node.js) or `requirements.txt` / `pyproject.toml` (Python) at project root
- **GitHub repo** – `owner/repo` or full URL; optional `ref` (branch/tag/SHA) and `subpath` (e.g. `frontend`)
- **Private repos** – Set `GITHUB_TOKEN` in `.env` for repos your account can access
- **Auto-detection** – Automatically detects Node.js vs Python projects

### Supported Technologies

- **Node.js**: Uses `npm audit --json` with `package.json` and lockfiles
- **Python**: Uses `pip-audit` with `requirements.txt` or `pyproject.toml`
- **GitHub Integration**: Full GitHub API support with rate limiting and authentication

## Quick start

### Prerequisites

- **Node.js** 18+ and npm (for the MCP server and Node project scanning).
- **Python** 3.10+ and **pip-audit** for Python project scanning:  
  `pip install pip-audit`

### Install

```bash
git clone https://github.com/navarathinam1803/vulnera.git
cd vulnera
npm install
npm run widget install   # or: npm install --prefix src/widgets
```

### Environment (optional)

Create `.env` in the project root:

```bash
# Optional: for private GitHub repos and higher rate limits
GITHUB_TOKEN=your_github_personal_access_token
```

The server loads `.env` from the project root so it works when started from Cursor or another IDE.

### Run

```bash
# Development (MCP server + Studio + widget dev server)
npm run dev

# Production build and run
npm run build
npm start
```

Then use an MCP client (e.g. Cursor, NitroStack Studio) and point it at this server. Example prompts:

- "Is **owner/repo** safe to ship?"
- "What's the highest risk dependency in **owner/repo**?"
- "Summarize vulnerabilities for **owner/repo**."
- "Suggest upgrades for **owner/repo**."
- "Compare scans over time for **owner/repo**."

## Project structure (src)

```
src/
├── index.ts              # Server entry; loads .env from project root, starts MCP app
├── app.module.ts         # Root module (imports SecurityAssistantModule)
├── modules/
│   └── security-assistant/
│       ├── security-assistant.data.ts   # Types: SeverityLevel, Vulnerability, AuditSummary,
│       │                                # ShipReadiness, UpgradeSuggestion, SavedScan, CompareScansResult
│       ├── security-assistant.service.ts # Resolve project (local/GitHub), detect Node vs Python,
│       │                                  # run npm audit / pip-audit, normalize results,
│       │                                  # ship readiness, highest risk, summary, upgrades,
│       │                                  # compare scans over time (in-memory store)
│       ├── security-assistant.tools.ts  # MCP tools + @Widget wiring for each tool
│       └── security-assistant.module.ts # Module definition
└── widgets/
    ├── app/
    │   ├── layout.tsx              # Root layout for widget app
    │   ├── ship-readiness/page.tsx  # Ship readiness widget
    │   ├── highest-risk/page.tsx   # Highest risk dependency widget
    │   ├── vulnerability-summary/page.tsx
    │   ├── upgrade-suggestions/page.tsx
    │   └── compare-scans/page.tsx  # Compare scans over time widget
    ├── components/
    │   ├── ShipReadinessCard.tsx   # Ship readiness card UI
    │   ├── SeverityBadge.tsx       # Severity chip (critical/high/moderate/low/info)
    │   └── CompactShopCard.tsx     # (Legacy pizza template)
    ├── widget-manifest.json        # Widget metadata and examples for discovery
    ├── next.config.js
    ├── package.json
    └── tsconfig.json
```

## MCP Tools Reference

### Input Schema

All 6 security tools accept the same optional scan target parameters:

| Argument      | Type   | Required | Description |
|--------------|--------|----------|-------------|
| `projectPath` | string | No | Local path to project root (ignored if `githubRepo` is set). |
| `githubRepo`  | string | No | GitHub repo: `owner/repo` or full URL. |
| `ref`         | string | No | Branch, tag, or commit SHA (e.g. `main`, `v1.0.0`). Defaults to default branch. |
| `subpath`     | string | No | Subdirectory (e.g. `frontend`) when manifest is not at repo root. |

If neither `projectPath` nor `githubRepo` is provided, the server uses the current working directory.

### Available Tools

1. **`is_app_safe_to_ship`** - Ship readiness assessment
2. **`get_highest_risk_dependency`** - Identify highest-risk dependency
3. **`summarize_vulnerabilities`** - Human-readable vulnerability summary
4. **`suggest_upgrades`** - Actionable upgrade commands
5. **`compare_scans_over_time`** - Historical scan comparison
6. **`generate_report`** - PDF security report generation

## Commands

```bash
# Install
npm install
npm run widget install     # Install widget app dependencies

# Development
npm run dev                # MCP server + Studio + widget dev server
npm run build              # Build TypeScript and widgets
npm start                  # Build then run production server

# Widgets
npm run widget <cmd>       # Run npm script in src/widgets (e.g. npm run widget run build)
```

## Security behavior

- **Node.js**: looks for `package.json`; uses `package-lock.json` or `npm-shrinkwrap.json` (or runs `npm install --package-lock-only` if missing). Runs `npm audit --json`.
- **Python**: looks for `requirements.txt` or `pyproject.toml` (or `Pipfile` for detection). Runs `pip-audit -r requirements.txt` or `pip-audit .` for pyproject. Tries `python -m pip_audit` if `pip-audit` is not on PATH.
- **GitHub**: checks repo access with Repos API; fetches files via Contents API. Encodes owner/repo and path segments. Uses `GITHUB_TOKEN` when set for private repos and higher rate limits.

## Compare scans over time

- Each run of `compare_scans_over_time` for a given repo (same `githubRepo` or `projectPath`) saves the current scan and compares it to the previous one.
- Repo is identified by `owner/repo`, `owner/repo:subpath`, or `local:<path>`.
- Up to 20 scans per repo are kept in memory (lost on server restart).
- Result includes baseline vs current counts, and lists of **fixed** and **introduced** vulnerabilities.

## License

MIT

---

**Built with [NitroStack](https://nitrostack.ai/)** · Repo: [navarathinam1803/vulnera](https://github.com/navarathinam1803/vulnera)
