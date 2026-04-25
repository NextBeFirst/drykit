# Why AI is bloating your codebase

*And what the discipline pattern looks like.*

---

Every team shipping with AI has the same dirty secret: their codebase is getting fatter, not leaner. The promise was "10x productivity." The reality is `Modal`, `Modal2`, `ConfirmModal`, `DeleteModal`, and `ConfirmDeleteModal` — all doing roughly the same thing, all created by an AI that forgot what existed three turns ago.

This isn't a tooling failure. It's a memory failure. And no amount of documentation fixes it.

## The bloat problem

AI coding assistants don't remember your codebase between sessions. Every time you start a new conversation, the AI re-discovers your project from scratch — reading 10 to 20 files, burning 30,000 to 80,000 tokens just to orient itself. Next session, it does it again. And again.

The orientation cost alone runs roughly one million tokens per developer per week at 20 sessions. But the real damage isn't the tokens — it's what happens when the AI misses something during that expensive file-walk.

"Add a confirmation dialog when the user deletes an item."

The AI reads a dozen files. It misses your existing `Modal` component with its `confirmation` variant. It creates `ConfirmModal.tsx`. You catch it, correct it, move on. But the next developer doesn't catch it. The next AI session doesn't catch it. The duplicate ships.

In an audit of 13 projects covering 98 conversations and roughly 2,800 messages, we found patterns that repeat everywhere:

- A single backend file edited 524 times across sessions — the same file, rewritten and patched because the AI kept losing context.
- One component file with 212 edits. Another with 195. These aren't complex files. They're files the AI keeps breaking and fixing because it doesn't remember what it did last time.
- 150+ context overflows where the AI lost its instructions mid-session and started repeating mistakes.

The hallucinationtracker.com project has documented over 12,000 AI hallucinations. The most common form isn't fabricated facts — it's creating something that already exists under a different name. The AI doesn't hallucinate from nothing. It hallucates from ignorance of what's already there.

Multiply this across every developer, every session, every week. Your component directory becomes a graveyard of near-identical files that nobody can safely delete because eight screens import different ones.

## Why rules don't work

The standard fix is documentation. Write a `CLAUDE.md`. Add `.cursorrules`. Create an `AGENTS.md`. Tell the AI: "Check what exists before creating anything new."

It reads the rules. It nods. It creates `Modal2.tsx` anyway.

This isn't because the AI is disobedient. It's because documentation is a suggestion, and suggestions degrade under pressure. After 15 turns of conversation, the AI's context window is full of your current task. The rules from the system prompt are compressed, summarized, or dropped entirely. The audit found this happening in every single project — 150+ context overflows where the AI lost its instructions and reverted to default behavior.

The analogy is ESLint. ESLint doesn't suggest you use semicolons. It fails your build if you don't. The difference between a suggestion and a constraint is whether the system enforces it or hopes you'll comply.

Rules in markdown files are suggestions. They work when the AI has spare context. They fail exactly when you need them most — in long sessions, complex tasks, and multi-file changes where the AI is already struggling to keep track of what it's doing.

The audit documented 151 interruptions in a single project where the developer had to manually stop the AI from doing things nobody asked for. "Who told you to build that?" "Stop building, I didn't ask for a build." "STOP." These are symptoms of an AI that lost its guardrails mid-session.

You can't solve a memory problem with more text.

## The discipline pattern

The fix has three layers, and the order matters.

**Layer 1: Registry.** A machine-readable JSON file listing every component, hook, and utility in your project — with names, paths, props, variants, and dependencies. This is the source of truth. Not the filesystem, not the AI's memory, not a markdown document. A structured file that scripts can read and validate.

**Layer 2: Fingerprint.** A 200-token summary generated from the registry that the AI reads at session start. Instead of walking 20 files (30,000+ tokens), the AI reads one file (200 tokens) and knows what exists. If it needs details about UI components, it reads a second file. If it needs API routes, a third. Total cost: 1,000 to 3,000 tokens instead of 50,000+.

That's roughly 95% fewer tokens on orientation per session (estimate). But the real value isn't cost savings — it's that the AI starts every session with accurate knowledge of what exists, instead of a partial, error-prone scan.

**Layer 3: Enforcement.** Three mechanisms, from proactive to reactive:

First, a skill file that the AI agent loads automatically when working on components. Before the AI writes a single line of code, the skill instructs it to check the registry. If `Modal` exists with a `confirmation` variant, the AI uses it instead of creating `ConfirmModal`. The duplicate is prevented before generation — zero tokens wasted on code that shouldn't exist.

Second, a pre-commit hook that runs a pure Node.js check. No AI calls, no API keys, no tokens. Milliseconds. If you try to commit an unregistered component, a near-duplicate, or a hardcoded API key, the commit fails with a specific message telling you what to do instead.

Third, CI integration. A GitHub Action that posts a markdown report as a PR comment — duplicates found, inconsistent prop usage, unregistered files, secrets. The report has a 100% open rate because it's in the PR, not in a dashboard nobody visits.

The key insight: prevent the duplicate before generation, not after. A pre-commit hook that catches `ConfirmModal.tsx` is good. A skill that prevents the AI from writing it in the first place is better. The token was never spent. The file was never created. The review never needed to happen.

## Drykit

We built this pattern into a CLI tool called drykit.

ESLint catches syntax errors. TypeScript catches type errors. Drykit catches `Modal2`.

It's a pure Node.js CLI — zero AI calls, zero API keys, zero tokens spent on the tool itself. It scans your project, builds the registry, generates the fingerprint, writes rules into every AI tool you use (Claude Code, Kiro, Cursor), and installs the pre-commit hook. One command to set up, one command to scan.

It also catches hardcoded secrets — 15 patterns covering Stripe keys, AWS tokens, GitHub PATs, passwords, and private keys. Because the same AI that creates duplicate components also hardcodes your `sk_live_` key in a utility file.

The registry tracks usage: which files import each component, how many unique prop combinations exist across call sites. When `Button` is used with 6 different prop signatures across 12 files, that's a signal — either the component needs more variants, or the codebase has drifted.

Weekly deltas tell you what changed: "+3 duplicates since last week" is news that drives action. "5 duplicates total" is a status that drives nothing.

Drykit works with Claude Code, Kiro, and Cursor. The registry and pre-commit hook work without any AI tool at all. It's MIT licensed, free, and has no telemetry.

The codebase bloat problem isn't going away. AI assistants are getting faster, not more careful. The developers who ship clean code with AI won't be the ones with better prompts — they'll be the ones with better constraints.

```bash
npx drykit scan
```
