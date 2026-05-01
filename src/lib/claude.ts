import Anthropic from "@anthropic-ai/sdk";

// TODO: PHASE-2 — move all calls to a Supabase Edge Function proxy.
// dangerouslyAllowBrowser is intentional for Phase 1 solo testing only.
const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const MODELS = {
  cheap: "claude-haiku-4-5",   // tutor chat, hints
  smart: "claude-sonnet-4-6",  // lesson generation
};

export { client };
