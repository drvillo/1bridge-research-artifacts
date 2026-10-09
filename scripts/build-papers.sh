#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -x /Library/TeX/texbin/pdflatex ]]; then export PATH="/Library/TeX/texbin:$PATH"; fi
command -v pdflatex >/dev/null || { echo 'pdflatex is required; the papers need no shell escape.' >&2; exit 1; }
shopt -s nullglob
sources=(papers/*.tex)
if [[ ${#sources[@]} -eq 0 ]]; then
  echo 'Manuscript publication awaits independent review. Authorized reviewers can place the supplied .tex files in papers/.' >&2
  exit 1
fi
node scripts/analyze.mjs
python3 scripts/insert-results.py
mkdir -p .tmp/pdf
for source in "${sources[@]}"; do
  stem="$(basename "$source" .tex)"
  pdflatex -interaction=nonstopmode -halt-on-error -output-directory .tmp/pdf "$source" > ".tmp/pdf/$stem-build.txt"
  pdflatex -interaction=nonstopmode -halt-on-error -output-directory .tmp/pdf "$source" >> ".tmp/pdf/$stem-build.txt"
  if rg 'undefined references|Citation .* undefined|Reference .* undefined' ".tmp/pdf/$stem.log"; then exit 1; fi
  cp ".tmp/pdf/$stem.pdf" "papers/$stem.pdf"
  echo "Built papers/$stem.pdf"
done
