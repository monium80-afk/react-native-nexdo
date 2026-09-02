#!/usr/bin/env bash
# extract-tag-endpoints.sh
#
# Extracts all endpoints for a given tag from an OpenAPI YAML spec (stdin),
# along with any $ref'd schemas/components.
#
# Usage:
#   curl -s <spec-url> | bash extract-tag-endpoints.sh "Billing"

set -euo pipefail

TAG="${1:?Usage: extract-tag-endpoints.sh <tag-name>}"
TMPDIR_WORK=$(mktemp -d)
trap 'rm -rf "$TMPDIR_WORK"' EXIT

SPEC="$TMPDIR_WORK/spec.yml"
cat > "$SPEC"

# 1. Find all path+method blocks that have a matching tag
#    Strategy: find line numbers of path entries (lines starting with "  /"),
#    then for each method block under that path, check if it contains the tag.

node - "$TAG" "$SPEC" <<'SCRIPT'
const fs = require("fs");
const tag = process.argv[2];
const specFile = process.argv[3];
const lines = fs.readFileSync(specFile, "utf8").split("\n");

const tagLower = tag.toLowerCase();

// Phase 1: Find all path definitions and their method blocks
// Paths start at indent 2 with "  /"
// Methods start at indent 4 with "    get:", "    post:", etc.
const methods = ["get", "post", "put", "patch", "delete", "options", "head"];
const endpoints = [];
const refs = new Set();

let currentPath = null;
let currentMethod = null;
let blockStart = -1;
let blockLines = [];
let inPaths = false;
let inComponents = false;

// First pass: locate the "paths:" and "components:" top-level keys
let pathsStart = -1;
let pathsEnd = -1;
let componentsStart = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^paths:\s*$/.test(line)) {
    pathsStart = i;
  } else if (pathsStart >= 0 && pathsEnd < 0 && /^\S/.test(line) && i > pathsStart) {
    pathsEnd = i;
  }
  if (/^components:\s*$/.test(line)) {
    componentsStart = i;
  }
}
if (pathsEnd < 0) pathsEnd = lines.length;

// Second pass: extract endpoints matching the tag
function flushBlock() {
  if (!currentPath || !currentMethod || blockLines.length === 0) return;

  // Check if this block has the target tag
  let inTags = false;
  let hasTag = false;
  const blockRefs = [];

  for (const bl of blockLines) {
    const trimmed = bl.trim();

    // Detect tags section
    if (/^tags:\s*$/.test(trimmed)) {
      inTags = true;
      continue;
    }
    if (inTags) {
      if (/^- /.test(trimmed)) {
        const tagVal = trimmed.replace(/^- /, "").trim().replace(/^['"]|['"]$/g, "");
        if (tagVal.toLowerCase() === tagLower) hasTag = true;
      } else {
        inTags = false;
      }
    }

    // Collect $ref values
    const refMatch = bl.match(/\$ref:\s*['"]?(#\/[^'"}\s]+)['"]?/);
    if (refMatch) blockRefs.push(refMatch[1]);
  }

  if (hasTag) {
    // Extract summary, operationId, description
    let summary = "";
    let operationId = "";
    let description = "";
    let params = [];
    let inDesc = false;
    let inParams = false;

    for (const bl of blockLines) {
      const trimmed = bl.trim();
      const indent = bl.length - bl.trimStart().length;

      // Only capture operation-level keys (indent 6 = direct children of the method block)
      if (indent === 6) {
        const sumMatch = trimmed.match(/^summary:\s*(.+)/);
        if (sumMatch) summary = sumMatch[1].replace(/^['"]|['"]$/g, "");

        const opMatch = trimmed.match(/^operationId:\s*(.+)/);
        if (opMatch) operationId = opMatch[1].replace(/^['"]|['"]$/g, "");

        const descMatch = trimmed.match(/^description:\s*(.+)/);
        if (descMatch && !inDesc) {
          const val = descMatch[1].trim();
          if (val === "|-" || val === "|" || val === ">-" || val === ">") {
            inDesc = true;
          } else {
            description = val.replace(/^['"]|['"]$/g, "");
          }
          continue;
        }
      }

      if (inDesc) {
        // Continuation lines of description — grab first non-empty line
        if (!description && trimmed.length > 0) {
          description = trimmed;
        }
        // Stop when we hit the next operation-level key
        if (indent === 6 && trimmed.length > 0 && !/^description:/.test(trimmed)) {
          inDesc = false;
        }
      }
    }

    endpoints.push({
      method: currentMethod.toUpperCase(),
      path: currentPath,
      operationId,
      summary,
      description,
      refs: blockRefs,
      blockLines: [...blockLines],
    });
  }
}

for (let i = pathsStart + 1; i < pathsEnd; i++) {
  const line = lines[i];

  // Path line: exactly 2 spaces + /
  if (/^ {2}\/\S/.test(line)) {
    flushBlock();
    currentPath = line.trim().replace(/:$/, "");
    currentMethod = null;
    blockLines = [];
    continue;
  }

  // Method line: exactly 4 spaces + method name
  const methodMatch = line.match(/^ {4}(\w+):\s*$/);
  if (methodMatch && methods.includes(methodMatch[1])) {
    flushBlock();
    currentMethod = methodMatch[1];
    blockLines = [];
    continue;
  }

  if (currentMethod) {
    blockLines.push(line);
  }
}
flushBlock();

// Output endpoints
if (endpoints.length === 0) {
  console.error(`No endpoints found for tag: "${tag}"`);
  process.exit(1);
}

// Resolve referenced component bodies, including refs nested in other components.
function resolveRef(ref) {
  const parts = ref.replace("#/", "").split("/");
  let searchStart = 0;
  for (let p = 0; p < parts.length; p++) {
    const indent = p * 2;
    const target = " ".repeat(indent) + parts[p] + ":";
    let found = false;
    for (let i = searchStart; i < lines.length; i++) {
      if (lines[i].startsWith(target) && (lines[i] === target || lines[i][target.length] === " ")) {
        searchStart = i + 1;
        found = true;
        break;
      }
    }
    if (!found) return null;
  }

  const baseIndent = parts.length * 2;
  const result = [];
  for (let i = searchStart; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") { result.push(line); continue; }
    const lineIndent = line.length - line.trimStart().length;
    if (lineIndent < baseIndent) break;
    result.push(line);
  }
  return result;
}

function collectDeepRefs(refSet, visited) {
  for (const ref of [...refSet]) {
    if (visited.has(ref)) continue;
    visited.add(ref);
    const body = resolveRef(ref);
    if (!body) continue;
    for (const bl of body) {
      const refMatch = bl.match(/\$ref:\s*['"]?(#\/[^'"}\s]+)['"]?/);
      if (refMatch) refSet.add(refMatch[1]);
    }
  }
  const remaining = [...refSet].filter(ref => !visited.has(ref));
  if (remaining.length > 0) collectDeepRefs(refSet, visited);
}

for (const ep of endpoints) {
  const endpointRefs = new Set(ep.refs);
  collectDeepRefs(endpointRefs, new Set());
  for (const ref of endpointRefs) refs.add(ref);
}

console.log(`## Endpoints for "${tag}" (${endpoints.length} total)\n`);
for (const ep of endpoints) {
  console.log(`### \`${ep.method}\` \`${ep.path}\``);
  if (ep.operationId) console.log(`- **operationId**: \`${ep.operationId}\``);
  if (ep.summary) console.log(`- **summary**: ${ep.summary}`);
  if (ep.description && ep.description !== ep.summary)
    console.log(`- **description**: ${ep.description}`);
  console.log("\n```yaml");
  for (const line of ep.blockLines) console.log(line);
  console.log("```");
  console.log();
}

// Output unique refs list
if (refs.size > 0) {
  console.log(`## Referenced Components (${refs.size} unique)\n`);
  const sorted = [...refs].sort();
  for (const r of sorted) {
    const name = r.split("/").pop();
    const category = r.split("/").slice(0, -1).join("/").replace("#/", "");
    console.log(`- \`${name}\` (${category})`);
    const body = resolveRef(r);
    if (body) {
      console.log("\n```yaml");
      for (const line of body) console.log(line);
      console.log("```");
    } else {
      console.log("\n_(could not resolve)_");
    }
    console.log();
  }
}
SCRIPT
