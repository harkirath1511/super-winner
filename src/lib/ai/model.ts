import { createGateway } from "@ai-sdk/gateway";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export const model = gateway("anthropic/claude-Sonnet-4-5");
