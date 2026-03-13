# Codebuff

Codebuff is an **open-source AI coding assistant** that edits your codebase through natural language instructions. Instead of using one model for everything, it coordinates specialized agents that work together to understand your project and make precise changes.

<div align="center">
  <img src="./assets/codebuff-vs-claude-code.png" alt="Codebuff vs Claude Code" width="400">
</div>

Codebuff beats Claude Code at 61% vs 53% on [our evals](evals/README.md) across 175+ coding tasks over multiple open-source repos that simulate real-world tasks.


## How it works

When you ask Codebuff to "add authentication to my API," it might invoke:

1. A **File Picker Agent** to scan your codebase to understand the architecture and find relevant files
2. A **Planner Agent** to plan which files need changes and in what order
3. An **Editor Agent** to make precise edits
4. A **Reviewer Agent** to validate changes

<div align="center">
  <img src="./assets/multi-agents.png" alt="Codebuff Multi-Agents" width="250">
</div>

This multi-agent approach gives you better context understanding, more accurate edits, and fewer errors compared to single-model tools.

## CLI: Install and start coding

Install:

```bash
npm install -g codebuff
```

Run:

```bash
cd your-project
codebuff
```

Then just tell Codebuff what you want and it handles the rest:

- "Fix the SQL injection vulnerability in user registration"
- "Add rate limiting to all API endpoints"
- "Refactor the database connection code for better performance"

Codebuff will find the right files, makes changes across your codebase, and runs tests to make sure nothing breaks.

## Sending Images

Codebuff supports sending images alongside your messages so agents can see screenshots, mockups, error dialogs, or any visual context. There are multiple ways to attach images:

### Slash command

Use the `/image` command to attach an image file by path:

```
/image ./screenshot.png please fix the layout issue shown here
```

You can also type `/image` (or `/img`, `/attach`) without a path to enter **image input mode**, which changes the input prompt to accept a file path or a clipboard paste.

### Clipboard paste (Ctrl+V)

Press **Ctrl+V** anywhere in the chat input to paste an image directly from your clipboard. This works cross-platform:

- **macOS** — screenshots (Cmd+Shift+4), copied images, or files copied in Finder
- **Linux** — images from xclip or wl-paste (X11 and Wayland)
- **Windows** — clipboard images or files copied in Explorer

### Drag and drop

Drag an image file from your file manager into the terminal. Codebuff detects the file path and attaches it automatically.

### Inline path detection

Reference image paths directly in your message and Codebuff will detect and attach them:

```
Please compare these two designs: ./before.png and ./after.png
```

Paths can be absolute (`/home/user/img.png`), relative (`../assets/logo.png`), use `~` (`~/Downloads/screenshot.png`), or use the `@path` syntax (`@./screenshot.png`).

### Supported formats and limits

| Format | Extensions |
|--------|-----------|
| JPEG | `.jpg`, `.jpeg` |
| PNG | `.png` |
| WebP | `.webp` |
| GIF | `.gif` |
| BMP | `.bmp` |
| TIFF | `.tiff`, `.tif` |

- **Max single file size**: 10 MB (large images are automatically compressed/resized to fit)
- **Max base64 payload**: 1 MB after compression
- **Max total image size**: 5 MB across all attached images

Images that exceed the base64 limit are iteratively compressed using different quality and dimension settings. A banner above the input shows attached images with their status (processing, ready, compressed, or error).

### SDK usage

When using the SDK programmatically, pass images via the `content` array in `MessageContent`:

```typescript
const result = await client.run({
  agent: 'base',
  prompt: 'Fix the bug shown in this screenshot',
  content: [
    {
      type: 'image',
      image: base64EncodedString,
      mediaType: 'image/png',
    },
  ],
  handleEvent: (event) => console.log(event),
})
```

## Create custom agents

To get started building your own agents, start Codebuff and run the `/init` command:

```bash
codebuff
```

Then inside the CLI:

```
/init
```

This creates:
```
knowledge.md               # Project context for Codebuff
.agents/
└── types/                 # TypeScript type definitions
    ├── agent-definition.ts
    ├── tools.ts
    └── util-types.ts
```

You can write agent definition files that give you maximum control over agent behavior.

Implement your workflows by specifying tools, which agents can be spawned, and prompts. We even have TypeScript generators for more programmatic control.

For example, here's a `git-committer` agent that creates git commits based on the current git state. Notice that it runs `git diff` and `git log` to analyze changes, but then hands control over to the LLM to craft a meaningful commit message and perform the actual commit.

```typescript
export default {
  id: 'git-committer',
  displayName: 'Git Committer',
  model: 'openai/gpt-5-nano',
  toolNames: ['read_files', 'run_terminal_command', 'end_turn'],

  instructionsPrompt:
    'You create meaningful git commits by analyzing changes, reading relevant files for context, and crafting clear commit messages that explain the "why" behind changes.',

  async *handleSteps() {
    // Analyze what changed
    yield { tool: 'run_terminal_command', command: 'git diff' }
    yield { tool: 'run_terminal_command', command: 'git log --oneline -5' }

    // Stage files and create commit with good message
    yield 'STEP_ALL'
  },
}
```

## SDK: Run agents in production

Install the [SDK package](https://www.npmjs.com/package/@codebuff/sdk) -- note this is different than the CLI codebuff package.

```bash
npm install @codebuff/sdk
```

Import the client and run agents!

```typescript
import { CodebuffClient } from '@codebuff/sdk'

// 1. Initialize the client
const client = new CodebuffClient({
  apiKey: 'your-api-key',
  cwd: '/path/to/your/project',
  onError: (error) => console.error('Codebuff error:', error.message),
})

// 2. Do a coding task...
const result = await client.run({
  agent: 'base', // Codebuff's base coding agent
  prompt: 'Add error handling to all API endpoints',
  handleEvent: (event) => {
    console.log('Progress', event)
  },
})

// 3. Or, run a custom agent!
const myCustomAgent: AgentDefinition = {
  id: 'greeter',
  displayName: 'Greeter',
  model: 'openai/gpt-5.1',
  instructionsPrompt: 'Say hello!',
}
await client.run({
  agent: 'greeter',
  agentDefinitions: [myCustomAgent],
  prompt: 'My name is Bob.',
  customToolDefinitions: [], // Add custom tools too!
  handleEvent: (event) => {
    console.log('Progress', event)
  },
})
```

Learn more about the SDK [here](https://www.npmjs.com/package/@codebuff/sdk).

## Why choose Codebuff

**Custom workflows**: TypeScript generators let you mix AI generation with programmatic control. Agents can spawn subagents, branch on conditions, and run multi-step processes.

**Any model on OpenRouter**: Unlike Claude Code which locks you into Anthropic's models, Codebuff supports any model available on [OpenRouter](https://openrouter.ai/models) - from Claude and GPT to specialized models like Qwen, DeepSeek, and others. Switch models for different tasks or use the latest releases without waiting for platform updates.

**Reuse any published agent**: Compose existing [published agents](https://www.codebuff.com/store) to get a leg up. Codebuff agents are the new MCP!

**SDK**: Build Codebuff into your applications. Create custom tools, integrate with CI/CD, or embed coding assistance into your products.

## Contributing to Codebuff

We ❤️ contributions from the community - whether you're fixing bugs, tweaking our agents, or improving documentation.

**Want to contribute?** Check out our [Contributing Guide](./CONTRIBUTING.md) to get started.

### Running Tests

To run the test suite:

```bash
cd cli
bun test
```

**For interactive E2E testing**, install tmux:

```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# Windows (via WSL)
wsl --install
sudo apt-get install tmux
```

See [cli/src/__tests__/README.md](cli/src/__tests__/README.md) for comprehensive testing documentation.

Some ways you can help:

- 🐛 **Fix bugs** or add features
- 🤖 **Create specialized agents** and publish them to the Agent Store
- 📚 **Improve documentation** or write tutorials
- 💡 **Share ideas** in our [GitHub Issues](https://github.com/CodebuffAI/codebuff/issues)

## Get started

### Install

**CLI**: `npm install -g codebuff`

**SDK**: `npm install @codebuff/sdk`

### Resources

**Documentation**: [codebuff.com/docs](https://codebuff.com/docs)

**Community**: [Discord](https://codebuff.com/discord)

**Issues & Ideas**: [GitHub Issues](https://github.com/CodebuffAI/codebuff/issues)

**Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md) - Start here to contribute!

**Support**: [support@codebuff.com](mailto:support@codebuff.com)

<!-- Devin dummy test PR verification -->

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=CodebuffAI/codebuff&type=Date)](https://www.star-history.com/#CodebuffAI/codebuff&Date)
