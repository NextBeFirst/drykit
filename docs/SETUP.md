# Setup guide

## 1. Clone the template

```bash
# into a brand new folder
npx degit YOUR_GH_USER/claudestarter my-project
cd my-project

# ...or on top of an existing project (merge)
cd my-existing-project
npx degit YOUR_GH_USER/claudestarter#main . --force
```

## 2. Install dependencies

```bash
npm install
```

`husky` is installed as a devDependency. The `prepare` script in
`package.json` wires it up automatically when you run `npm install` in a git
repo. If you just ran `git init`, also run `npx husky init` once.

## 3. Personalize `CLAUDE.md`

Open `CLAUDE.md` and replace the placeholders at the top:

- `[NAZWA_PROJEKTU]`
- `[TECH_STACK]`
- `[CSS_FRAMEWORK]`
- `[TYPESCRIPT]`

This file is the context Claude Code reads on every session — keep it short,
current, and project-specific.

## 4. Backfill the registry (for existing projects)

If you dropped the template on top of an existing codebase, register each
component you already have:

```bash
# one-by-one
npm run component:register Modal src/components/Modal.tsx
npm run component:register Button src/components/Button.tsx

# or loop over them (Linux/macOS)
for f in src/components/*.tsx; do
  name=$(basename "$f" .tsx)
  npm run component:register "$name" "$f"
done
```

Then regenerate the docs + CLAUDE.md block:

```bash
npm run docs:generate
```

## 5. Verify the pre-commit hook

```bash
# should print: "Registry clean."
npm run registry:check

# try committing an unregistered file to see it block you
echo "export const Foo = () => null;" > src/components/Foo.tsx
git add src/components/Foo.tsx
git commit -m "test"   # <- should fail with registration instructions
```

## 6. Daily commands

```bash
npm run registry:find Modal          # search registry by name/path
npm run component:register <Name> <path>   # add or update a component
npm run registry:check               # what's unregistered?
npm run registry:duplicates          # full duplicate scan (not --ci)
npm run docs:generate                # rebuild docs + CLAUDE.md block
```

## Troubleshooting

**Husky hook didn't install.** Run `npx husky init` once in the repo root,
then re-save any file inside `.husky/` to mark it executable.

**Windows line endings in `.husky/pre-commit`.** Run `git config core.autocrlf
false` in the repo, or open the file and save with LF endings.

**False-positive duplicate warning.** The Levenshtein threshold is tuned for
short component names. Rename the less-descriptive of the two, or add an
`ignored` entry to `registry.json` (roadmap — not implemented in MVP).
