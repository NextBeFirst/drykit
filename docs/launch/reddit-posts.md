# Reddit Launch Posts

## r/reactjs — Technical focus

**Title:** I built a CLI that catches when AI creates Modal2.tsx instead of using your existing Modal

**Body:**

I've been shipping React with AI assistants (Claude Code, Cursor) for the past year. The recurring problem: AI doesn't remember what components exist between sessions. It creates `ConfirmModal` when `Modal variant="confirmation"` is right there.

I audited 13 of my projects and found the pattern everywhere — duplicate components, inconsistent prop usage, files edited hundreds of times because the AI kept losing context.

So I built **drykit** — a pure Node CLI that:

- Scans your project and builds a registry of every component, hook, and utility
- Generates a 200-token fingerprint the AI reads at session start (instead of 50k tokens of file-walking)
- Blocks duplicates at commit time via pre-commit hook
- Detects hardcoded secrets (Stripe keys, AWS tokens, etc.)
- Tracks prop signature consistency — flags when `Button` is used with 6 different prop combos across 12 files

Try it on any React project:

```
npx drykit scan
```

No install, no config. It tells you what it found.

The check generates a markdown report you can pipe into PR comments via GitHub Action (included in the repo).

Technical details: regex-based extraction (not AST — intentional for speed and zero deps), Levenshtein distance for name similarity, 15 secret patterns. Entire check runs in milliseconds.

Works with Claude Code, Kiro, and Cursor. MIT licensed.

GitHub: github.com/NextBeFirst/drykit

Happy to hear feedback on the approach — especially from anyone dealing with component bloat in larger codebases.

---

## r/ClaudeAI — Focus on Claude Code integration + token savings

**Title:** I built a tool that saves ~95% of the tokens Claude Code spends on "figuring out what exists" every session

**Body:**

If you use Claude Code, you've seen this: every session starts with the AI reading 10-20 files to understand your project structure. That's 30-80k tokens just on orientation. Every. Single. Session.

Then it creates `ConfirmModal.tsx` because it missed your existing `Modal` with a `confirmation` variant.

I built **drykit** to fix both problems:

1. **Registry** — scans your project, builds a machine-readable inventory of every component, hook, and utility
2. **Fingerprint** — a 200-token summary Claude reads at session start instead of walking your entire src/ directory
3. **Claude Code skill** — auto-loads when working on components, instructs Claude to check the registry BEFORE creating anything new
4. **Pre-commit hook** — blocks duplicates and hardcoded secrets at commit time

The skill is the key part. Instead of Claude burning tokens generating a duplicate and you correcting it, Claude checks the registry first and uses the existing component with a variant. The duplicate is never created. The tokens are never spent.

It also catches hardcoded API keys — I found 40+ production secrets in plaintext in my Claude conversation logs during an audit. drykit scans for Stripe keys, AWS tokens, GitHub PATs, and 12 other patterns.

```
npx drykit scan
```

Works on any React project. Also generates `.cursorrules` and `AGENTS.md` for Cursor and Kiro users.

GitHub: github.com/NextBeFirst/drykit

---

## r/programming — Focus on "linter for AI" as a category

**Title:** "Linter for AI behavior" — a category that probably needs to exist

**Body:**

ESLint catches syntax errors. TypeScript catches type errors. What catches "AI just created a duplicate of something that already exists"?

I've been thinking about this after auditing my AI-assisted development workflow across 13 projects. The data:

- One file edited 524 times across sessions (AI kept losing context and re-patching)
- 150+ context overflows where the AI lost its instructions mid-session
- Duplicate components everywhere — `Modal`, `Modal2`, `ConfirmModal`, `DeleteModal`
- 40+ production API keys in plaintext in conversation logs

The core problem: AI coding assistants don't remember your codebase between sessions. Documentation (CLAUDE.md, .cursorrules) helps, but it's a suggestion — not a constraint. After 15 turns of conversation, the AI has compressed or dropped those rules.

I built a tool called **drykit** that treats this as a linting problem:

- Maintains a registry of all project components (machine-readable JSON)
- Generates a compact fingerprint the AI reads at session start (~200 tokens vs ~50k for file-walking)
- Blocks duplicates and hardcoded secrets at commit time (pure Node, zero AI calls)
- Posts markdown reports as PR comments via GitHub Action

The interesting question isn't whether this specific tool is the right answer — it's whether "linter for AI behavior" is a category that needs to exist alongside ESLint and TypeScript. As AI writes more of our code, the failure modes are different from human-written code. Duplicates, context loss, hardcoded secrets, inconsistent patterns — these are AI-specific problems that traditional linters don't catch.

`npx drykit scan` on any React project if you want to see what it finds.

GitHub: github.com/NextBeFirst/drykit

Curious what patterns others are seeing with AI-generated code quality.

---

## Posting schedule
- r/reactjs: Day 1 (same day as HN)
- r/ClaudeAI: Day 2
- r/programming: Day 3-4
- One post per day max. Real engagement in comments.
