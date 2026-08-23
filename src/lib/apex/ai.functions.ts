import { briefSchema, runReasoningChain, type ApexBrief, type ApexReasoning } from "./ai.server";

export type { ApexBrief, ApexReasoning };

export async function apexReasoning(input: { data: unknown }): Promise<ApexReasoning> {
  try {
    const parsed = briefSchema.parse(input.data);
    return await runReasoningChain(parsed);
  } catch (err) {
    return {
      analyst: "",
      devilsAdvocate: "",
      chief: "",
      available: false,
      error:
        err instanceof Error
          ? `Brief parsing failed: ${err.message}`
          : "AI reasoning brief validation failed.",
    };
  }
}
