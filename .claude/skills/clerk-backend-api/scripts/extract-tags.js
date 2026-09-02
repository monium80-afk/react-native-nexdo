let input = "";
process.stdin.on("data", d => input += d);
process.stdin.on("end", () => {
  const lines = input.replace(/\r/g, "").split("\n");
  let tagsIndent = null;
  let inRootTags = false;

  function decodeScalar(value) {
    const trimmed = value.trim();
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
      try { return JSON.parse(trimmed); } catch (_) { return trimmed.slice(1, -1); }
    }
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1).replace(/''/g, "'");
    }
    return trimmed;
  }

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const content = line.trim();

    if (indent === 0 && content === "tags:") {
      inRootTags = true;
      tagsIndent = null;
      continue;
    }
    if (inRootTags && indent === 0) break;
    if (!inRootTags) continue;

    if (tagsIndent === null && content.startsWith("-")) tagsIndent = indent;
    if (tagsIndent === null || indent !== tagsIndent || !content.startsWith("-")) continue;

    const item = content.slice(1).trim();
    if (item.startsWith("name:")) console.log(decodeScalar(item.slice("name:".length)));
  }
});
