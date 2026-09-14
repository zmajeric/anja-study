#!/usr/bin/env bash
# Read-only fact collector for the project-reference skill.
#
#   scan.sh --full [project-root]     repo-wide pass, for the first bootstrap only
#   scan.sh --paths <dir> [<dir>...]  scoped pass over the directories a task touched
#
# Collects; does not interpret. The skill interprets.

set -u

PRUNE='-name node_modules -o -name .git -o -name dist -o -name build -o -name bin -o -name obj -o -name .next -o -name coverage -o -name vendor -o -name __pycache__ -o -name public -o -name wwwroot -o -name static -o -name .venv -o -name .idea -o -name target -o -name out'

hr() { printf '\n===== %s =====\n' "$1"; }

casing() {
  awk '
    /^[A-Z][a-zA-Z0-9]*$/       {p++; next}
    /^[a-z][a-zA-Z0-9]*$/       {c++; next}
    /^[a-z0-9]+(-[a-z0-9]+)+$/  {k++; next}
    /^[a-z0-9]+(_[a-z0-9]+)+$/  {s++; next}
                                {o++}
    END {printf "PascalCase=%d camelCase=%d kebab-case=%d snake_case=%d other=%d\n",p,c,k,s,o}'
}

MODE=full
PATHS=""
case "${1:-}" in
  --paths) MODE=scoped; shift; PATHS="$*" ;;
  --full)  shift; cd "${1:-$PWD}" || exit 1 ;;
  "")      : ;;
  *)       cd "$1" || exit 1 ;;
esac

if [ "$MODE" = scoped ] && [ -z "$PATHS" ]; then
  echo "--paths needs at least one directory" >&2
  exit 1
fi

# ---------------------------------------------------------------- scoped mode
if [ "$MODE" = scoped ]; then

pfind() { find $PATHS \( $PRUNE \) -prune -o "$@" -print 2>/dev/null; }

hr "SCOPE"
for d in $PATHS; do echo "$d"; done

hr "FILES IN SCOPE"
pfind -type f -name '*.*' | sort | head -80

hr "DIRECTORY NAME CASING IN SCOPE"
pfind -type d | sed 's#.*/##' | casing

hr "COMPONENT FILE NAME CASING IN SCOPE"
pfind -type f \( -name '*.tsx' -o -name '*.jsx' -o -name '*.vue' -o -name '*.svelte' \) \
  | sed 's#.*/##; s/[.].*$//' | casing

hr "COMPANION FILES PER DIRECTORY (what sits beside a component)"
pfind -type d | sort | head -25 | while read -r d; do
  ext=$(find "$d" -maxdepth 1 -type f -name '*.*' 2>/dev/null \
        | sed 's#.*/##' | sed 's/^[^.]*//' | sort -u | tr '\n' ' ')
  [ -n "$ext" ] && printf '%-58s %s\n' "$d" "$ext"
done

hr "BARRELS / TESTS / STYLES PRESENT IN SCOPE"
printf 'index files: '
pfind -type f -name 'index.*' | wc -l
printf 'test files:  '
pfind -type f \( -name '*.test.*' -o -name '*.spec.*' -o -name '*Tests.cs' \) | wc -l
printf 'style files: '
pfind -type f \( -name '*.scss' -o -name '*.css' -o -name '*.less' \) | wc -l
pfind -type f \( -name '*.test.*' -o -name '*.spec.*' \) | head -5

hr "MOST FREQUENT IMPORTS IN SCOPE"
pfind -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) \
  | xargs grep -hoE "from '[^']+'" 2>/dev/null \
  | sort | uniq -c | sort -rn | head -25

hr "EXPORT STYLE IN SCOPE"
printf 'export default files: '
pfind -type f \( -name '*.tsx' -o -name '*.ts' \) | xargs grep -lE '^export default' 2>/dev/null | wc -l
printf 'named export files:   '
pfind -type f \( -name '*.tsx' -o -name '*.ts' \) | xargs grep -lE '^export (const|function|class) ' 2>/dev/null | wc -l

hr "TYPE / PROPS DECLARATIONS IN SCOPE"
pfind -type f -name '*.tsx' \
  | xargs grep -hoE '(interface|type) [A-Za-z0-9_]*(Props|State|Args|Options)' 2>/dev/null \
  | sort -u | head -15

hr "STYLE CLASSES USED IN SCOPE"
pfind -type f \( -name '*.tsx' -o -name '*.jsx' \) \
  | xargs grep -hoE 'className="[^"{]+"' 2>/dev/null \
  | sed 's/className="//; s/"$//' | tr ' ' '\n' | grep -v '^$' \
  | sort | uniq -c | sort -rn | head -30

hr "TOKENS AND MIXINS REFERENCED BY SCOPED STYLES"
pfind -type f \( -name '*.scss' -o -name '*.css' \) \
  | xargs grep -hoE '([$][a-zA-Z0-9_-]+|@include [a-zA-Z0-9_-]+)' 2>/dev/null \
  | sort | uniq -c | sort -rn | head -25

hr "EXEMPLAR CANDIDATES IN SCOPE"
echo "  -- small (presentational) --"
pfind -type f \( -name '*.tsx' -o -name '*.jsx' -o -name '*.cs' \) -size -3k | head -8
echo "  -- large (container) --"
pfind -type f \( -name '*.tsx' -o -name '*.jsx' -o -name '*.cs' \) -size +6k | head -8

hr "END OF SCOPED SCAN"
exit 0
fi

# ------------------------------------------------------------------ full mode
sfind() { find . \( $PRUNE \) -prune -o "$@" -print; }

SRC=""
for d in src app lib source packages components; do
  [ -d "$d" ] && SRC="$SRC $d"
done
[ -n "$SRC" ] || SRC="."
srcfind() { find $SRC \( $PRUNE \) -prune -o "$@" -print; }

hr "ROOT"
pwd

hr "SOURCE ROOTS SCANNED FOR CONVENTIONS"
echo "$SRC"

hr "MANIFESTS AND CONFIG PRESENT"
for f in package.json tsconfig.json jsconfig.json vite.config.ts vite.config.js \
         next.config.js next.config.mjs next.config.ts tailwind.config.js \
         tailwind.config.ts tailwind.config.cjs postcss.config.js .eslintrc.json \
         .eslintrc.cjs eslint.config.js .prettierrc.json .prettierrc \
         jest.config.js jest.config.ts vitest.config.ts pyproject.toml go.mod \
         Directory.Build.props Cargo.toml AGENTS.md CLAUDE.md README.md REFERENCE.md; do
  [ -e "$f" ] && echo "present: $f"
done
sfind -maxdepth 2 -name '*.csproj' -o -maxdepth 2 -name '*.sln' 2>/dev/null | head -20

hr "PACKAGE.JSON (scripts + deps)"
if [ -f package.json ]; then
  sed -n '/"scripts"/,/^  }/p' package.json
  sed -n '/"dependencies"/,/^  }/p' package.json
  sed -n '/"devDependencies"/,/^  }/p' package.json | head -60
fi

hr "TSCONFIG (strictness + aliases)"
[ -f tsconfig.json ] && grep -E '"(strict|target|jsx|baseUrl|paths|noImplicitAny|strictNullChecks)"' tsconfig.json

hr "DIRECTORY TREE (depth 3)"
sfind -type d -maxdepth 3 | sort | head -120

hr "SOURCE FILE COUNTS BY EXTENSION"
srcfind -type f -name '*.*' | sed 's/.*[.]//' | sort | uniq -c | sort -rn | head -20

hr "DIRECTORY NAME CASING"
srcfind -type d -mindepth 2 -maxdepth 4 | sed 's#.*/##' | casing

hr "COMPONENT FILE NAME CASING"
srcfind -type f \( -name '*.tsx' -o -name '*.jsx' -o -name '*.vue' -o -name '*.svelte' \) \
  | sed 's#.*/##; s/[.].*$//' | casing

hr "BARRELS / INDEX FILES"
printf 'index file count: '
srcfind -type f \( -name 'index.ts' -o -name 'index.tsx' -o -name 'index.js' -o -name 'index.jsx' \) | wc -l
srcfind -type f -name 'index.ts*' | head -8

hr "TEST FILES"
srcfind -type f \( -name '*.test.*' -o -name '*.spec.*' -o -name '*Tests.cs' \) | head -15
printf 'total test files: '
srcfind -type f \( -name '*.test.*' -o -name '*.spec.*' -o -name '*Tests.cs' \) | wc -l

hr "HOOKS"
srcfind -type f -name 'use*.ts*' | head -15

hr "STYLE TOKEN SOURCES"
srcfind -type f \( -name 'tailwind.config.*' -o -name '_settings*.scss' -o -name 'settings*.scss' \
  -o -name 'tokens*.json' -o -name 'variables*.scss' -o -name 'variables*.css' \
  -o -name 'theme.*' \) | head -25

hr "DESIGN TOKEN DEFINITIONS"
TOKENFILES=$(srcfind -type f \( -name '*.scss' -o -name '*.css' -o -name '*.less' \) \
  | grep -Ei 'settings|variable|token|theme|config|core|global' | head -8)
if [ -z "$TOKENFILES" ]; then
  TOKENFILES=$(srcfind -type f \( -name '*.scss' -o -name '*.css' \) \
    | xargs grep -lE '^[[:space:]]*([$][a-zA-Z0-9_-]+|--[a-zA-Z0-9_-]+)[[:space:]]*:' 2>/dev/null | head -8)
fi
for f in $TOKENFILES; do
  echo "--- $f"
  grep -E '^[[:space:]]*([$][a-zA-Z0-9_-]+|--[a-zA-Z0-9_-]+)[[:space:]]*:' "$f" 2>/dev/null \
    | sed 's/[[:space:]]*$//' | head -40
done

hr "EXISTING REFERENCE.md"
if [ -f REFERENCE.md ]; then
  echo "exists, $(wc -l < REFERENCE.md) lines"
  grep -n 'manual:start\|manual:end\|^> Generated' REFERENCE.md | head -10
else
  echo "absent"
fi

hr "END OF FULL SCAN"
