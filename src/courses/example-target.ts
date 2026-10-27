/** Find the editor-declared whole-word form, with exactly one occurrence. */
export function exampleTargetParts(text: string, targetForm: string | undefined): [string, string, string] | null {
  if (typeof targetForm !== "string" || !targetForm.trim() || targetForm !== targetForm.trim()) return null;
  const escaped = targetForm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...text.matchAll(new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, "gi"))];
  if (matches.length !== 1 || matches[0].index === undefined) return null;
  const index = matches[0].index;
  return [text.slice(0, index), matches[0][0], text.slice(index + matches[0][0].length)];
}
