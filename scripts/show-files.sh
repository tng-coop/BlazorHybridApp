#!/usr/bin/env bash
set -euo pipefail

name_only=false
directory="."
include_regex=""
exclude_regex=""
all=false

# Function to display help message
display_help() {
  cat <<EOF
Usage: $0 [OPTIONS] [DIRECTORY]

Options:
  -n, --name-only         Display only the file names, not their content.
  -r, --regex PATTERN     Include files matching the provided regex pattern.
  -v, --invert PATTERN    Exclude files matching the provided regex pattern.
  -a, --all               Include all files without default exclusions.
  -h, --help              Display this help message.

Arguments:
  DIRECTORY               Directory to search in. Defaults to current directory.
EOF
  exit 0
}

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    -n|--name-only)   name_only=true; shift ;;
    -r|--regex)       include_regex="$2"; shift 2 ;;
    -v|--invert)      exclude_regex="$2"; shift 2 ;;
    -a|--all)         all=true; shift ;;
    -h|--help)        display_help ;;
    --)               shift; break ;;
    -*)               echo "Unknown option: $1" >&2; exit 1 ;;
    *)                directory="$1"; shift ;;
  esac
done

cd "$directory" || { echo "Cannot cd to $directory"; exit 1; }

# Build the base find command as an array
if $all; then
  find_cmd=(find . -type f)
else
  # directories to prune
  skip_dirs=(.git published node_modules logs docs \
             BlazorWebApp.Tests \
             Migrations \
             bin out obj PlaywrightTests asset migration wwwroot)

  prune_clause=()
  for d in "${skip_dirs[@]}"; do
    prune_clause+=( -path "./$d" -o )
  done
  # now prune any directory named dist, obj or bin, anywhere
  prune_clause+=( -type d -name dist -o \
                   -type d -name obj  -o \
                   -type d -name bin )

  # extensions to skip
  skip_exts=(txt md mjs env ps1 pyc)

  find_cmd=(find . "(" "${prune_clause[@]}" ")" -prune -o -type f)
  for ext in "${skip_exts[@]}"; do
    find_cmd+=( ! -name "*.$ext" )
  done
  find_cmd+=( -print )
fi

# Execute find, then include-filter, then exclude-filter, then output
{
  "${find_cmd[@]}"
} | {
  # Optional include
  if [[ -n $include_regex ]]; then
    egrep -i -- "$include_regex"
  else
    cat
  fi
} | {
  # Optional exclude
  if [[ -n $exclude_regex ]]; then
    egrep -iv -- "$exclude_regex"
  else
    cat
  fi
} | {
  # Final name-only vs. full-content
  if $name_only; then
    while IFS= read -r f; do
      echo "$f"
    done
  else
    while IFS= read -r f; do
      echo "$f"
      echo "----------------"
      cat "$f"
      echo "----------------"
    done
  fi
}
