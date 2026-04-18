import { getToolName, isToolUIPart, type UIMessage } from "ai";

export type UIPart = UIMessage["parts"][number];

/** Tap / type pickers (one visible at a time). */
export const CLIENT_INTERACTIVE_TOOL_NAMES = new Set([
  "askUserQuestion",
  "snackRun",
  "versusPick",
  "challengeFact",
  "stampTags",
]);

const HITL_APPROVAL_TOOLS = new Set([
  "saveKnowledge",
  "updateKnowledge",
  "deleteKnowledge",
  "finishOnboarding",
]);

function toolPartResolved(part: { state: string }): boolean {
  return (
    part.state === "output-available" ||
    part.state === "output-error" ||
    part.state === "output-denied"
  );
}

/** True while the user must act on this tool part before later parts should show. */
export function partNeedsClientAnswer(part: UIPart): boolean {
  if (!isToolUIPart(part)) return false;
  const name = getToolName(part);
  if (CLIENT_INTERACTIVE_TOOL_NAMES.has(name)) {
    return part.state === "input-available" || part.state === "input-streaming";
  }
  if (HITL_APPROVAL_TOOLS.has(name)) {
    return !toolPartResolved(part as { state: string });
  }
  return false;
}

/** Show only through the first unanswered client tool so users answer one card at a time. */
export function slicePartsForSequentialFlow(parts: UIPart[]): { visible: UIPart[]; queued: number } {
  const idx = parts.findIndex(partNeedsClientAnswer);
  if (idx === -1) return { visible: parts, queued: 0 };
  return { visible: parts.slice(0, idx + 1), queued: parts.length - idx - 1 };
}
