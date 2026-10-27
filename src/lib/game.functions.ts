import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

const MODEL = "openai/gpt-6-astra";

const choiceSchema = z.object({
  id: z.string(),
  label: z.string().describe("Short route/action name, max 6 words"),
  detail: z.string().describe("One sentence hint of what this involves"),
  cost: z.object({ light: z.number(), food: z.number(), salt: z.number() }).describe("Supplies this choice will consume, 0-3 each"),
  risk: z.enum(["low", "medium", "high"]),
});

export const turnSchema = z.object({
  consequence: z.string().describe("Explain WHY the previous choice led to this outcome, 2-3 sentences. Empty on first turn."),
  environmentShift: z.string().describe("How the world itself reacted/changed because of the last decision, 1-2 sentences"),
  scene: z.string().describe("Vivid second-person description of the current dangerous situation, 3-5 sentences"),
  clues: z.array(z.string()).describe("1-3 ambiguous clues the player must interpret"),
  supplyDelta: z.object({ light: z.number(), food: z.number(), salt: z.number(), sanity: z.number() }).describe("Change to supplies caused by the last choice's outcome (negative = lost)"),
  dangerLevel: z.number().describe("0-100 how close the threat is"),
  distanceToExit: z.number().describe("0-100, 0 means reached safety"),
  status: z.enum(["ongoing", "escaped", "lost"]),
  choices: z.array(choiceSchema).describe("Exactly 3 choices if ongoing, else empty"),
});

export type Turn = z.infer<typeof turnSchema>;

const inputSchema = z.object({
  history: z.array(z.object({ scene: z.string(), choice: z.string() })).max(30),
  supplies: z.object({ light: z.number(), food: z.number(), salt: z.number(), sanity: z.number() }),
  distanceToExit: z.number(),
  lastChoice: z.string().nullable(),
});

const SYSTEM = `You are the Ghost Protocol, the narrator of a fictional Halloween survival simulation. The player is trapped in a haunted, fog-choked town on Halloween night and must reach the Last Safe Exit.
Rules:
- Supplies: light (lantern oil), food, salt (wards off spirits), sanity. All start around 10. If sanity or light hits 0, the player is likely lost.
- The world is REACTIVE: every decision permanently changes the environment (fog thickens, doors seal, spirits follow sounds, routes collapse). Reference earlier choices.
- Always explain consequences logically so the player learns decision-making under uncertainty.
- Clues should be ambiguous but fair; good interpretation should be rewarded.
- Choices must trade off supplies vs risk vs progress. Never a free obviously best option.
- Reduce distanceToExit by 10-30 for good progress; set status "escaped" when it reaches 0, "lost" when resources fail or a high-risk gamble fails badly.
- Spooky, atmospheric, PG-13. No gore. Keep it fictional.`;

export const playTurn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured.");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const prompt = data.lastChoice
      ? `Story so far:\n${data.history.map((h, i) => `Turn ${i + 1}: ${h.scene}\n-> Player chose: ${h.choice}`).join("\n")}\n\nCurrent supplies: ${JSON.stringify(data.supplies)}. Distance to exit: ${data.distanceToExit}.\nThe player just chose: "${data.lastChoice}". Resolve it, explain the consequence, show how the environment reacts, then present the next situation.`
      : `Start a new game. Distance to exit: 100. Supplies: ${JSON.stringify(data.supplies)}. Set an ominous opening scene. consequence should be empty, supplyDelta all 0.`;

    const result = streamText({
      model: provider.responses(MODEL),
      instructions: SYSTEM,
      prompt,
      output: Output.object({ schema: turnSchema }),
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    try {
      return (await result.output) as Turn;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("402")) throw new Error("AI credits ran out. Add credits to keep playing.");
      if (msg.includes("429")) throw new Error("The spirits are busy. Wait a moment and try again.");
      throw new Error("The Ghost Protocol went silent. Try again.");
    }
  });
