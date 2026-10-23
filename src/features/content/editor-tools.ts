export function slugFromTitle(title: string) {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 100).replace(/-$/g, "");
}

export const formats = [
  ["h1", "H1", "Heading 1"], ["h2", "H2", "Heading 2"], ["h3", "H3", "Heading 3"],
  ["bold", "B", "Bold"], ["italic", "I", "Italic"], ["quote", "Quote", "Quote"],
  ["list", "List", "Bulleted list"], ["code", "Code", "Code block"], ["link", "Link", "Link"],
] as const;
export type Format = typeof formats[number][0];

export function formatMarkdown(body: string, start: number, end: number, format: Format) {
  const selected = body.slice(start, end);
  if (["h1", "h2", "h3", "quote", "list"].includes(format)) {
    const from = start === 0 ? 0 : body.lastIndexOf("\n", start - 1) + 1;
    const last = end > start && body[end - 1] === "\n" ? end - 1 : end;
    const newline = body.indexOf("\n", last);
    const to = newline < 0 ? body.length : newline;
    const prefix = format === "quote" ? "> " : format === "list" ? "- " : "#".repeat(Number(format[1])) + " ";
    const replacement = body.slice(from, to).split("\n")
      .map(line => prefix + line.replace(/^(?:#{1,6}\s+|>\s*|-\s+)/, "")).join("\n");
    return { body: body.slice(0, from) + replacement + body.slice(to), start: from + prefix.length, end: from + replacement.length };
  }
  const text = selected || (format === "link" ? "link text" : format === "code" ? "your code" : "text");
  const before = format === "bold" ? "**" : format === "italic" ? "*" : format === "link" ? "[" : (start && body[start - 1] !== "\n" ? "\n" : "") + "```\n";
  const after = format === "link" ? "](https://example.com)" : format === "code" ? "\n```\n" : before;
  return { body: body.slice(0, start) + before + text + after + body.slice(end), start: start + before.length, end: start + before.length + text.length };
}
