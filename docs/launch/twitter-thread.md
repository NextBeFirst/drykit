# Twitter/X Thread — Drykit Launch

## Thread (10 tweets)

**Tweet 1 (hook)**
I scanned Cal.com, Plane, Dub, Documenso, and Twenty for AI-generated component bloat.

Here's what I found. 🧵

**Tweet 2**
The pattern is always the same:

AI creates ConfirmModal.tsx.
Your project already has Modal with a confirmation variant.
Nobody catches it. It ships. Now you have two.

Multiply by every dev, every session, every week.

**Tweet 3**
Cal.com: 142 components scanned, 24 potential duplicates, 32 with inconsistent prop signatures.

The AI didn't create all of these. But it made them harder to find — and easier to duplicate.

(link to report gist)

**Tweet 4**
Plane: 190 components, 42 duplicates. 1 hardcoded secret. 37 components with inconsistent prop signatures.

Same pattern. Different repo. The component directory grows, nobody prunes it, and the AI keeps adding to the pile because it doesn't know what's already there.

(link to report gist)

**Tweet 5**
The root cause isn't bad AI. It's bad memory.

AI assistants don't remember your codebase between sessions. Every session = fresh start = 30-80k tokens just to orient.

That's ~1M tokens/week per developer on "what exists here?" (estimate)

**Tweet 6**
What if the AI read a 200-token summary instead of walking 20 files?

That's what a registry does. Machine-readable. Auto-generated. Updated on every scan.

The AI starts every session knowing what exists. Not guessing.

**Tweet 7**
But knowing isn't enough. You also need enforcement.

Three layers:
→ Skill: AI checks registry BEFORE writing code
→ Hook: pre-commit blocks duplicates + secrets
→ CI: markdown report posted as PR comment

Prevention > detection > cleanup.

**Tweet 8**
I also found hardcoded API keys in source files across multiple repos.

Stripe live keys. AWS access keys. GitHub PATs.

The same AI that creates Modal2 also hardcodes your sk_live_ in utils.ts.

**Tweet 9**
I built drykit to fix this.

Pure Node CLI. Zero AI calls. Zero API keys. Works with Claude Code, Kiro, Cursor.

One command to scan any React project:

npx drykit scan

**Tweet 10**
Full doctrine post: "Why AI is bloating your codebase"
→ (link to dev.to post)

Reports for all 5 repos:
→ (links to gists)

GitHub:
→ github.com/NextBeFirst/drykit

For developers who ship with AI.

---

## Notes
- Replace [X], [Y], [Z] with actual numbers after running reports
- Best posting time: Tuesday-Thursday, 8-10am EST
- Space tweets 2-3 minutes apart
- Quote-tweet the hook tweet with each repo report for engagement
