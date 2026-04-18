import { NextRequest } from "next/server";
import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { model } from "@/lib/ai/model";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { allTools } from "@/lib/ai/tools";
import { getSession } from "@/lib/session";
import {
  executeSaveKnowledge,
  executeUpdateKnowledge,
  executeDeleteKnowledge,
} from "@/lib/ai/tools";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.wallet) {
    return new Response("Unauthorized", { status: 401 });
  }
  const wallet = session.wallet;

  const body = (await req.json()) as {
    messages: UIMessage[];
    toolApprovals?: Record<
      string,
      { approved: boolean; toolName: string; args: Record<string, unknown> }
    >;
  };

  // Handle approved HITL tool calls submitted by the client
  if (body.toolApprovals) {
    const results: Record<string, unknown> = {};
    for (const [toolCallId, approval] of Object.entries(body.toolApprovals)) {
      if (!approval.approved) {
        results[toolCallId] = { status: "denied" };
        continue;
      }
      try {
        switch (approval.toolName) {
          case "saveKnowledge": {
            const args = approval.args as Parameters<
              typeof executeSaveKnowledge
            >[0];
            results[toolCallId] = await executeSaveKnowledge({
              ...args,
              wallet,
            });
            break;
          }
          case "updateKnowledge": {
            const args = approval.args as Parameters<
              typeof executeUpdateKnowledge
            >[0];
            results[toolCallId] = await executeUpdateKnowledge({
              ...args,
              wallet,
            });
            break;
          }
          case "deleteKnowledge": {
            const args = approval.args as Parameters<
              typeof executeDeleteKnowledge
            >[0];
            results[toolCallId] = await executeDeleteKnowledge({
              ...args,
              wallet,
            });
            break;
          }
          case "finishOnboarding": {
            session.onboardingComplete = true;
            await session.save();
            results[toolCallId] = {
              status: "complete",
              message: "Onboarding complete. Your knowledge base is ready.",
            };
            break;
          }
          default:
            results[toolCallId] = { error: "Unknown tool" };
        }
      } catch (e) {
        results[toolCallId] = {
          error: e instanceof Error ? e.message : "execution error",
        };
      }
    }
    return Response.json({ toolResults: results });
  }

  // Client-side / HITL tools stay in `input-available` until the user approves.
  // If the user sends a new chat message first, conversion would otherwise throw
  // AI_MissingToolResultsError — strip incomplete tool parts instead (not Pinata).
  const modelMessages = await convertToModelMessages(body.messages, {
    ignoreIncompleteToolCalls: true,
    tools: allTools,
  });
  const result = streamText({
    model,
    system: buildSystemPrompt(wallet),
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
