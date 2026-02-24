# How to Use Codebuff

Codebuff is an open-source AI coding assistant that edits your codebase through natural language instructions. It coordinates specialized agents -- a File Picker, Planner, Editor, and Reviewer -- to understand your project and make precise changes. This guide covers everything you need to get started and make the most of Codebuff.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
  - [CLI (End Users)](#cli-end-users)
  - [SDK (Programmatic Usage)](#sdk-programmatic-usage)
  - [Windows Setup](#windows-setup)
- [Using the CLI](#using-the-cli)
  - [Starting Codebuff](#starting-codebuff)
  - [Example Prompts](#example-prompts)
  - [CLI Commands](#cli-commands)
  - [Prompt Modes](#prompt-modes)
  - [Shell Shims](#shell-shims)
- [Using the SDK](#using-the-sdk)
  - [Basic Usage](#basic-usage)
  - [Continuing a Conversation](#continuing-a-conversation)
  - [Custom Agents and Tools](#custom-agents-and-tools)
  - [Knowledge Files](#knowledge-files)
  - [File Filtering](#file-filtering)
  - [Loading Local Agents](#loading-local-agents)
  - [SDK API Reference](#sdk-api-reference)
- [Creating Custom Agents](#creating-custom-agents)
  - [Initializing the Agent Directory](#initializing-the-agent-directory)
  - [Agent Definition Structure](#agent-definition-structure)
  - [Prompt Agents vs Programmatic Agents](#prompt-agents-vs-programmatic-agents)
  - [Example: Git Committer Agent](#example-git-committer-agent)
  - [Publishing Agents](#publishing-agents)
- [Project Architecture](#project-architecture)
  - [Monorepo Structure](#monorepo-structure)
  - [How Requests Flow](#how-requests-flow)
  - [Built-in Agents](#built-in-agents)
- [Configuration](#configuration)
  - [Knowledge Files](#knowledge-files-configuration)
  - [The `.codebuffignore` File](#the-codebuffignore-file)
  - [Environment Variables](#environment-variables)
- [Development Setup (Contributing)](#development-setup-contributing)
  - [Prerequisites](#prerequisites)
  - [Setting Up the Dev Environment](#setting-up-the-dev-environment)
  - [Running Services](#running-services)
  - [Running Tests](#running-tests)
  - [Publishing Agents Locally](#publishing-agents-locally)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
  - [Windows-Specific Issues](#windows-specific-issues)
  - [Getting Help](#getting-help)

---

## Quick Start

```bash
# Install the CLI globally
npm install -g codebuff

# Navigate to your project
cd your-project

# Launch Codebuff
codebuff
```

Then type a natural language instruction, and Codebuff handles the rest:

```
> Add input validation to the user registration endpoint
```

---

## Installation

### CLI (End Users)

Install the Codebuff CLI globally via npm:

```bash
npm install -g codebuff
```

**Requirements:**
- Node.js (LTS recommended)
- A Codebuff account (sign up at [codebuff.com](https://codebuff.com))

After installation, run `codebuff` in any project directory. On first run you will be prompted to log in via your browser.

### SDK (Programmatic Usage)

Install the SDK package (separate from the CLI):

```bash
npm install @codebuff/sdk
```

The SDK lets you run Codebuff agents programmatically from your own applications, CI/CD pipelines, or scripts. You will need a [Codebuff API key](https://www.codebuff.com/api-keys).

### Windows Setup

Codebuff runs on Windows with a few extra steps:

1. **Install Chocolatey** (package manager): follow [chocolatey.org/install](https://chocolatey.org/install)
2. **Install NVM**: `choco install nvm -y`
3. **Install Node**: `nvm install node`
4. **Install Codebuff**: `npm i -g codebuff`

Codebuff requires `bash`. You can satisfy this by:
- Installing [Git for Windows](https://git-scm.com/download/win) (includes `bash.exe`)
- Or using WSL: `wsl --install`

See [WINDOWS.md](./WINDOWS.md) for detailed Windows troubleshooting.

---

## Using the CLI

### Starting Codebuff

```bash
cd your-project
codebuff
```

This opens the Codebuff TUI (Terminal User Interface). You interact with Buffy, the AI assistant behind Codebuff, by typing natural language instructions.

### Example Prompts

Here are things you can ask Codebuff to do:

- **Fix bugs:** `"Fix the SQL injection vulnerability in user registration"`
- **Add features:** `"Add rate limiting to all API endpoints"`
- **Refactor:** `"Refactor the database connection code for better performance"`
- **Write tests:** `"Add unit tests for the calculator class"`
- **Explain code:** `"Explain how the authentication flow works"`
- **Generate code:** `"Create a REST API for managing blog posts"`

Codebuff will find the right files, make changes across your codebase, and can run tests to make sure nothing breaks.

### CLI Commands

Inside the Codebuff CLI, you can use special commands prefixed with `/`:

| Command     | Description                                      |
|-------------|--------------------------------------------------|
| `/init`     | Initialize Codebuff in your project (creates `knowledge.md` and `.agents/` directory) |
| `/usage`    | Check how many credits you have used and remaining |
| `help`      | Show available commands                           |

### Prompt Modes

When sending prompts to Codebuff, you can select different modes that control how the agent responds:

| Mode      | Description                                                            |
|-----------|------------------------------------------------------------------------|
| **DEFAULT** | Balanced mode -- good quality with reasonable speed and credit usage  |
| **MAX**     | Highest quality output -- reads more files, uses stronger models, more thorough review |
| **FAST**    | Speed-focused -- prioritizes getting the task done quickly             |
| **PLAN**    | Planning-only mode -- analyzes and plans changes without implementing them |

### Shell Shims

You can install agent shims so you can invoke agents directly from your shell without launching the full CLI:

```bash
# Install a specific agent as a shell shim
codebuff shims install codebuff/base-lite@1.0.0

# Set up the shim environment
eval "$(codebuff shims env)"

# Run the agent directly
base-lite "fix this bug"
```

---

## Using the SDK

The SDK lets you run Codebuff agents programmatically. Install it with:

```bash
npm install @codebuff/sdk
```

### Basic Usage

```typescript
import { CodebuffClient } from '@codebuff/sdk'

const client = new CodebuffClient({
  apiKey: process.env.CODEBUFF_API_KEY, // Get from https://www.codebuff.com/api-keys
  cwd: process.cwd(),
  onError: (error) => console.error('Codebuff error:', error.message),
})

const result = await client.run({
  agent: 'base',                   // Codebuff's default coding agent
  prompt: 'Add error handling to all API endpoints',
  handleEvent: (event) => {
    console.log('Progress:', event) // Stream agent progress in real-time
  },
})
```

### Continuing a Conversation

Pass the result of a previous `run()` call to maintain context:

```typescript
// First run
const run1 = await client.run({
  agent: 'codebuff/base@0.0.16',
  prompt: 'Create a simple calculator class',
  handleEvent: (event) => console.log(event),
})

// Follow-up with context from the first run
const run2 = await client.run({
  agent: 'codebuff/base@0.0.16',
  prompt: 'Add unit tests for the calculator',
  previousRun: run1,              // Maintains conversation context
  handleEvent: (event) => console.log(event),
})
```

### Custom Agents and Tools

Define your own agents and tools to extend Codebuff:

```typescript
import { z } from 'zod/v4'
import { CodebuffClient, getCustomToolDefinition } from '@codebuff/sdk'
import type { AgentDefinition } from '@codebuff/sdk'

const client = new CodebuffClient({
  apiKey: process.env.CODEBUFF_API_KEY,
  cwd: process.cwd(),
})

// Define a custom agent
const sentimentAgent: AgentDefinition = {
  id: 'sentiment-analyzer',
  model: 'x-ai/grok-4-fast',
  displayName: 'Sentiment Analyzer',
  toolNames: ['fetch_api_data'],
  instructionsPrompt: `Analyze sentiment along 5 dimensions:
    happiness, sadness, anger, fear, and surprise.`,
}

// Define a custom tool
const fetchTool = getCustomToolDefinition({
  toolName: 'fetch_api_data',
  description: 'Fetch data from an API endpoint',
  inputSchema: z.object({
    url: z.url(),
    method: z.enum(['GET', 'POST']).default('GET'),
    headers: z.record(z.string(), z.string()).optional(),
  }),
  exampleInputs: [{ url: 'https://api.example.com/data', method: 'GET' }],
  execute: async ({ url, method, headers }) => {
    const response = await fetch(url, { method, headers })
    const data = await response.text()
    return [{ type: 'json' as const, value: { message: data.slice(0, 5000) } }]
  },
})

// Run with custom agent and tools
const { output } = await client.run({
  agent: 'sentiment-analyzer',
  prompt: "Today I'm feeling very happy!",
  agentDefinitions: [sentimentAgent],
  customToolDefinitions: [fetchTool],
  handleEvent: (event) => console.log(event),
})

if (output.type === 'error') {
  console.error(`Run failed: ${output.message}`)
} else {
  console.log('Output:', output)
}
```

### Knowledge Files

Knowledge files provide project context to agents. The SDK auto-discovers them from your project:

- **Project files** (checked in priority order): `knowledge.md`, `AGENTS.md`, or `CLAUDE.md` in each directory
- **User-level files**: `~/.knowledge.md`, `~/.AGENTS.md`, or `~/.CLAUDE.md`

You can also provide them explicitly:

```typescript
await client.run({
  agent: 'codebuff/base@0.0.16',
  prompt: 'Help me refactor',
  knowledgeFiles: { 'knowledge.md': '# Guidelines\n- Use TypeScript strictly' },
  userKnowledgeFiles: { '~/.knowledge.md': '# Preferences\n- Be concise' },
})
```

### File Filtering

Control which files agents can access:

```typescript
const client = new CodebuffClient({
  apiKey: process.env.CODEBUFF_API_KEY,
  fileFilter: (filePath) => {
    if (filePath === '.env') return { status: 'blocked' }          // Returns [BLOCKED]
    if (filePath.endsWith('.env.example')) return { status: 'allow-example' } // Prefixed with [TEMPLATE]
    return { status: 'allow' }                                      // Normal read
  },
})
```

When no `fileFilter` is provided, gitignore rules are applied automatically.

### Loading Local Agents

Load agent definitions from `.agents` directories on disk:

```typescript
import { loadLocalAgents, CodebuffClient } from '@codebuff/sdk'

// Auto-discovers agents in .agents/ directories
const agents = await loadLocalAgents({ verbose: true })

// Or load from a specific path
// const agents = await loadLocalAgents({ agentsPath: './my-agents' })

// Use with client.run()
const client = new CodebuffClient({ apiKey: process.env.CODEBUFF_API_KEY })
const result = await client.run({
  agent: 'my-custom-agent',
  agentDefinitions: Object.values(agents),
  prompt: 'Hello',
})
```

**Supported file types:** `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs` (excludes `.d.ts` and `.test.ts`)

### SDK API Reference

#### `client.run(options)`

| Parameter              | Type     | Required | Description |
|------------------------|----------|----------|-------------|
| `agent`                | string   | Yes      | Agent ID to run (e.g., `'base'` or a custom agent ID) |
| `prompt`               | string   | Yes      | Natural language instruction for the agent |
| `handleEvent`          | function | No       | Callback for real-time progress events |
| `previousRun`          | object   | No       | State from a previous run (for multi-turn conversations) |
| `projectFiles`         | object   | No       | Map of file paths to contents for context |
| `knowledgeFiles`       | object   | No       | Knowledge files to inject into the run |
| `agentDefinitions`     | array    | No       | Custom agent definitions |
| `customToolDefinitions`| array    | No       | Custom tool definitions |
| `maxAgentSteps`        | number   | No       | Safety limit on agent steps (recommended: ~20) |

**Returns:** A `Promise` resolving to a success object (with `RunState` for chaining) or a failure object (with `Error`).

---

## Creating Custom Agents

Codebuff's real power comes from creating your own specialized agents.

### Initializing the Agent Directory

Run the `/init` command inside the Codebuff CLI:

```bash
codebuff
```

Then inside the CLI:

```
/init
```

This creates the following structure in your project:

```
knowledge.md               # Project context for Codebuff
.agents/
  types/                   # TypeScript type definitions
    agent-definition.ts
    tools.ts
    util-types.ts
```

### Agent Definition Structure

An agent definition is a TypeScript object with the following key fields:

| Field               | Type     | Description |
|---------------------|----------|-------------|
| `id`                | string   | Unique identifier for the agent |
| `displayName`       | string   | Human-readable name |
| `model`             | string   | LLM model to use (any [OpenRouter](https://openrouter.ai/models) model) |
| `toolNames`         | string[] | Tools the agent can use (e.g., `read_files`, `run_terminal_command`, `end_turn`) |
| `instructionsPrompt`| string   | Instructions that guide the agent's behavior |
| `handleSteps`       | generator| (Optional) Programmatic control via a generator function |
| `spawnableAgents`   | string[] | (Optional) Sub-agents this agent can spawn |
| `systemPrompt`      | string   | (Optional) System-level prompt for the underlying LLM |

### Prompt Agents vs Programmatic Agents

**Prompt agents** rely entirely on the LLM to decide what to do based on the instructions prompt and available tools. They are simpler to write.

**Programmatic agents** use `handleSteps` generator functions to mix AI generation with deterministic control flow. This lets you:
- Execute specific tool calls in a fixed order
- Branch on conditions
- Spawn sub-agents
- Run multi-step processes

Use `yield { tool: '...', ... }` for deterministic steps and `yield 'STEP_ALL'` to hand control to the LLM.

### Example: Git Committer Agent

```typescript
export default {
  id: 'git-committer',
  displayName: 'Git Committer',
  model: 'openai/gpt-5-nano',
  toolNames: ['read_files', 'run_terminal_command', 'end_turn'],

  instructionsPrompt:
    'You create meaningful git commits by analyzing changes, reading relevant files for context, and crafting clear commit messages that explain the "why" behind changes.',

  async *handleSteps() {
    // Deterministic: always run these commands first
    yield { tool: 'run_terminal_command', command: 'git diff' }
    yield { tool: 'run_terminal_command', command: 'git log --oneline -5' }

    // Hand control to the LLM to decide commit message and run git commit
    yield 'STEP_ALL'
  },
}
```

### Publishing Agents

You can publish agents to the [Codebuff Agent Store](https://www.codebuff.com/store) for others to reuse:

```bash
codebuff
```

Then inside the CLI:

```
publish my-agent-id
```

Published agents can be used by anyone via the `@agent-name` syntax in prompts or by referencing them in `spawnableAgents`.

---

## Project Architecture

### Monorepo Structure

Codebuff is organized as a Bun workspace monorepo:

```
codebuff/
  cli/              # TUI client (OpenTUI + React) -- the user-facing CLI
  sdk/              # TypeScript SDK for programmatic usage
  web/              # Next.js web application + API routes
  agents/           # Built-in agent definitions shipped with Codebuff
  .agents/          # Local agent templates (prompt + programmatic agents)
  common/           # Shared types, tools, schemas, and utilities
  packages/         # Internal packages (agent-runtime, billing, bigquery, etc.)
  evals/            # Evaluation framework and benchmarks
  scripts/          # Development and utility scripts
  python-app/       # Experimental Python CLI
```

### How Requests Flow

1. **CLI/SDK** sends user input + project context to the Codebuff web API
2. **Agent runtime** (server-side) processes the request through the appropriate agents
3. **Events and chunks** stream back through SDK callbacks
4. **Tools execute locally** (file edits, terminal commands, search) to satisfy tool calls from the agent

### Built-in Agents

Codebuff ships with several specialized agents:

| Agent          | Purpose |
|----------------|---------|
| **base2**      | The main orchestrator agent ("Buffy") that coordinates all other agents |
| **file-picker** / **file-explorer** | Scan the codebase to find relevant files |
| **editor**     | Make precise code edits |
| **reviewer**   | Validate and review changes |
| **researcher** | Research documentation and APIs online |
| **thinker**    | Deep reasoning for complex problems |
| **commander**  | Execute terminal commands (build, test, lint, etc.) |
| **context-pruner** | Automatically manage context window size |

The orchestrator spawns these agents in the right order: gather context first, then plan, then edit, then review.

---

## Configuration

### Knowledge Files (Configuration)

A `knowledge.md` file in your project root gives Codebuff context about your project. This is the single most impactful way to improve Codebuff's output. Include:

- Project goals and architecture overview
- Key technologies and frameworks used
- Coding conventions and style guidelines
- Important file locations
- Testing and build instructions

Example:

```markdown
# My Project

## Tech Stack
- TypeScript monorepo (pnpm workspaces)
- Next.js frontend
- Express backend with Prisma ORM
- PostgreSQL database

## Conventions
- Use functional React components with hooks
- All API routes go in src/api/
- Tests use Vitest with @testing-library/react
- Run `pnpm test` to verify changes
```

### The `.codebuffignore` File

Similar to `.gitignore`, this file tells Codebuff which files and directories to exclude from its context:

```
# Exclude test fixtures
__mock-projects__
test-repos

# Include specific config files (negation pattern)
!codebuff.json
```

### Environment Variables

When developing Codebuff locally, environment variables are loaded from (highest precedence last):

- `.env.local` -- secrets (gitignored)
- `.env.development.local` -- worktree overrides like ports (gitignored)

Copy `.env.example` to `.env.local` to get started. Key variables include:

| Variable                 | Purpose |
|--------------------------|---------|
| `OPEN_ROUTER_API_KEY`    | OpenRouter API key for LLM access |
| `OPENAI_API_KEY`         | OpenAI API key |
| `ANTHROPIC_API_KEY`      | Anthropic API key |
| `DATABASE_URL`           | PostgreSQL connection string |
| `CODEBUFF_GITHUB_ID`     | GitHub OAuth app ID |
| `CODEBUFF_GITHUB_SECRET` | GitHub OAuth app secret |

---

## Development Setup (Contributing)

Want to contribute to Codebuff itself? Here is how to set up the full development environment.

### Prerequisites

- **[Bun](https://bun.sh/docs/installation)** (v1.3.5+) -- runtime and package manager
- **[Docker](https://www.docker.com/)** -- for the web server database
- **[tmux](https://github.com/tmux/tmux)** (optional) -- for interactive CLI testing

### Setting Up the Dev Environment

```bash
# 1. Clone the repository
git clone https://github.com/CodebuffAI/codebuff.git
cd codebuff

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local:
#   DATABASE_URL=postgresql://manicode_user_local:secretpassword_local@localhost:5432/manicode_db_local

# 3. Install dependencies
bun install

# 4. Set up a GitHub OAuth app (https://docs.github.com/en/apps/oauth-apps)
#    Add to .env.local:
#    CODEBUFF_GITHUB_ID=<your-github-app-id>
#    CODEBUFF_GITHUB_SECRET=<your-github-app-secret>
```

### Running Services

**Option A: All-in-one (recommended)**

```bash
bun run dev
# Starts web server, builds SDK, and launches CLI
```

**Option B: Separate terminals (more control)**

```bash
# Terminal 1 -- Web server
bun run start-web
# Ready on http://localhost:3000

# Terminal 2 -- CLI client
bun run start-cli
# Welcome to Codebuff!
```

**Service management commands:**

| Command           | Description |
|-------------------|-------------|
| `bun dev`         | Start everything (web + SDK + CLI) |
| `bun up`          | Start background services |
| `bun down`        | Stop background services |
| `bun ps`          | Check service status |
| `bun start-web`   | Start the web server |
| `bun start-cli`   | Start the CLI |
| `bun start-db`    | Start the database |
| `bun start-studio`| Open Drizzle Studio (database UI) |

**Giving yourself credits:** After logging in at `http://localhost:3000/login`, open Drizzle Studio with `bun run start-studio` and edit the `credit_ledger` table to set your balance.

### Running Tests

```bash
# Run all tests
bun test

# Run tests for a specific package
cd cli && bun test

# Watch mode
bun test --watch

# Run a specific test file
bun test specific.test.ts

# Type checking
bun run typecheck
```

**Interactive CLI testing** requires tmux:

```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# Verify setup
cd cli && bun run test:tmux-poc
```

### Publishing Agents Locally

To run the CLI in directories outside the codebuff repo, you need to publish agents to the local database:

```bash
# 1. Create a publisher profile at http://localhost:3000/publishers
#    (set publisher_id to "codebuff")

# 2. Publish agents (add more as needed based on error messages)
bun start-cli publish base context-pruner file-explorer file-picker researcher thinker reviewer

# 3. Run CLI in any directory
bun run start-cli --cwd /path/to/other/project
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **CLI won't start** | Make sure you have Node.js installed and run `npm install -g codebuff` |
| **Authentication errors** | Run `codebuff` and follow the browser login prompt |
| **No credits remaining** | Check usage with `/usage` in the CLI, or visit [codebuff.com](https://codebuff.com) |
| **Agent errors / timeouts** | Check your internet connection; Codebuff requires access to LLM APIs |
| **Database connection errors** (dev) | Verify `DATABASE_URL` in `.env.local` and run `bun run db:migrate` |
| **Empty Agent Store** (dev) | Expected in dev mode -- agents from `.agents/` must be published to the database first |

### Windows-Specific Issues

- **"Failed to determine latest version"**: Check internet/firewall access to `github.com`. See [WINDOWS.md](./WINDOWS.md).
- **"Bash is required but was not found"**: Install [Git for Windows](https://git-scm.com/download/win) or use WSL.
- **Login browser window fails to open**: Manually copy and paste the login URL shown in the terminal.
- **Git commands fail**: Use WSL for complex operations, or ensure Git for Windows is installed.

### Getting Help

- **Documentation**: [codebuff.com/docs](https://codebuff.com/docs)
- **Community Discord**: [codebuff.com/discord](https://codebuff.com/discord)
- **Report issues**: [GitHub Issues](https://github.com/CodebuffAI/codebuff/issues)
- **Email**: [support@codebuff.com](mailto:support@codebuff.com)

---

## Further Reading

- [README.md](./README.md) -- Project overview and quick start
- [CONTRIBUTING.md](./CONTRIBUTING.md) -- Contribution guidelines and code style
- [WINDOWS.md](./WINDOWS.md) -- Windows-specific setup and troubleshooting
- [SDK README](./sdk/README.md) -- Full SDK documentation
- [CLI README](./cli/README.md) -- CLI development details
- [Codebuff Agent Store](https://www.codebuff.com/store) -- Browse and publish agents
- [OpenRouter Models](https://openrouter.ai/models) -- Supported LLM models
