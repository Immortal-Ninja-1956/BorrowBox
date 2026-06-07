// LLM helper stub - not used in BorrowBox core flow.
// Set OPENAI_API_KEY and update this file to use OpenAI/Anthropic/etc.
export async function chatCompletion(_prompt: string): Promise<string> {
  throw new Error("LLM not configured.");
}
