# RiskLens (Vulnera)

An MCP (Model Context Protocol) server that acts as a **developer security assistant**: it scans project dependencies for vulnerabilities, answers ship-readiness questions, prioritizes risks, suggests upgrades, and compares scans over time. Supports **Node.js** (npm audit) and **Python** (pip-audit), with optional **GitHub** repo scanning.

## Features

### Security assistant

- **Ship readiness** – "Is this app safe to ship?" based on critical/high severity (configurable policy).
- **Highest risk** – Single highest-risk dependency and full list sorted by severity.
- **Vulnerability summary** – Plain-language summary of findings by severity.
- **Upgrade suggestions** – Concrete `npm install` or `pip install` commands, ordered by severity.
- **Compare scans over time** – Save scans per repo and compare baseline vs current (fixed vs introduced).

### Scan targets

- **Local path** – `package.json` (Node) or `requirements.txt` / `pyproject.toml` (Python) at project root.
- **GitHub repo** – `owner/repo` or full URL; optional `ref` (branch/tag/SHA) and `subpath` (e.g. `frontend`).
- **Private repos** – Set `GITHUB_TOKEN` in `.env` for repos your account can access.

### Widgets (NitroStack)

Each tool can drive a widget in MCP clients (e.g. Cursor, Studio):

| Tool                     | Widget route         | Description                          |
|--------------------------|----------------------|--------------------------------------|
| `is_app_safe_to_ship`    | `/ship-readiness`    | Safe-to-ship verdict and counts      |
| `get_highest_risk_dependency` | `/highest-risk` | Top vulnerability and list           |
| `summarize_vulnerabilities`   | `/vulnerability-summary` | Human-language summary        |
| `suggest_upgrades`       | `/upgrade-suggestions`   | Upgrade commands by severity    |
| `compare_scans_over_time`    | `/compare-scans`     | Baseline vs current (fixed/introduced) |

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

## MCP tools (input schema)

All security tools accept the same optional scan target:

| Argument      | Type   | Description |
|--------------|--------|-------------|
| `projectPath` | string | Local path to project root (ignored if `githubRepo` is set). |
| `githubRepo`  | string | GitHub repo: `owner/repo` or full URL. |
| `ref`         | string | Branch, tag, or commit (e.g. `main`, `v1.0.0`). |
| `subpath`     | string | Subdirectory (e.g. `frontend`) when manifest is not at repo root. |

If neither `projectPath` nor `githubRepo` is provided, the server uses the current working directory.

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
