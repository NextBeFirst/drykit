# Show HN: Drykit — a linter for AI behavior in React projects

## Title
Show HN: Drykit – a linter for AI behavior in React projects

## URL
https://github.com/NextBeFirst/drykit

## First comment (post immediately after submission)

Hey HN — I built drykit after auditing my own AI-assisted workflow across 13 projects.

The pattern was always the same: AI creates `ConfirmModal.tsx` because it doesn't know `Modal` already has a `confirmation` variant. You correct it. Next session, it does it again. Multiply by every developer, every session — your component directory becomes a graveyard of near-duplicates.

The numbers from my audit: one file edited 524 times across sessions. 150+ context overflows where the AI lost its instructions. 40+ production API keys in plaintext in conversation logs.

Drykit is a pure Node CLI (zero AI calls, zero API keys) that:

1. Scans your project and builds a machine-readable registry of every component, hook, and utility
2. Generates a 200-token fingerprint the AI reads at session start — instead of 50k tokens of file-walking
3. Blocks duplicates and hardcoded secrets at commit time via pre-commit hook
4. Works with Claude Code, Kiro, and Cursor

I scanned 5 popular React repos (Cal.com, Plane, Documenso, Dub, Twenty) — reports linked in the README.

`npx drykit scan` on any React project to see what it finds. No install needed.

Technical details: regex-based extraction (not AST — intentionally, for speed and zero deps), Levenshtein distance for duplicate detection, 15 secret patterns. The entire check runs in milliseconds.

Happy to answer questions about the approach, the audit findings, or why I chose enforcement over documentation.

---

## Prepared responses to top 5 criticisms

### "This is just an ESLint plugin"

ESLint operates on syntax and code patterns within a single file. Drykit operates on project-level structure — it knows that `ConfirmModal` in file A is a duplicate of `Modal variant="confirmation"` in file B. Different scope, different problem. ESLint can't tell you that a component is unregistered or that your Button is used with 6 different prop signatures across 12 files.

That said, an ESLint plugin that reads the drykit registry is on the roadmap. They're complementary.

### "Levenshtein distance isn't enough"

Correct — it's a first pass. Levenshtein catches `ConfirmModal` vs `Modal`, `DeleteDialog` vs `Dialog`. It misses semantic duplicates where names are completely different but functionality overlaps. AST-based similarity comparison is planned for post-launch. But Levenshtein + the dryRisk keyword list catches the 80% case today, and shipping beats perfecting.

### "This is a starter template repackaged"

drykit doesn't generate project scaffolding. It scans your existing project and builds a registry from what's already there. `npx drykit scan` works on any React project right now — no init, no config, no commitment. The value is enforcement (pre-commit hook, AI skill, CI integration), not text files.

### "Token savings numbers are fake"

The token estimates are clearly marked as "(estimate)" everywhere — in the CLI output, in the README, in the docs. The methodology: ~200 tokens for a fingerprint read vs ~40k tokens for a typical AI orientation scan. We don't claim dollar savings or precise numbers. If the estimates feel wrong for your project, the registry and duplicate detection still work without them.

### "The registry is overhead"

`drykit scan` rebuilds the registry automatically. You run it once, commit the result, and the pre-commit hook keeps it honest. If a file isn't in the registry, the hook tells you. Total maintenance: zero, if you use the hook. The registry is ~1KB for a typical project — smaller than your `.eslintrc`.
