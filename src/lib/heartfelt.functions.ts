import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const THEME_IDS = [
  "love",
  "gratitude",
  "birthday",
  "comfort",
  "nostalgia",
  "miss",
  "congrats",
] as const;

const PoemSchema = z.object({
  theme: z.enum(THEME_IDS),
  titleLine: z.string().min(1).max(60),
  poem: z.string().min(40),
  closing: z.string().min(1).max(200),
});

export type PoemResult = z.infer<typeof PoemSchema> & { sender?: string };

const GenerateInput = z.object({
  senderName: z.string().max(80).optional().default(""),
  recipientName: z.string().max(80).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  occasion: z.string().max(40).nullable().optional(),
  themeHint: z.string().max(40).optional().default("gratitude"),
});

export const generatePoem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const recipient = data.recipientName.trim() || "someone special";
    const sender = data.senderName.trim() || "Someone";
    const occasion = data.occasion || "not specified";
    const context = data.description.trim() || "A heartfelt message";

    const prompt = `You are a gifted emotional poet writing a deeply personal poem as a gift.

RECIPIENT: "${recipient}"
FROM: "${sender}"
OCCASION: ${occasion}
THEME HINT: ${data.themeHint}
SITUATION / CONTEXT (this is the most important input — the poem MUST weave in concrete details from this):
"""
${context}
"""

THEME options (pick the single best id): love, gratitude, birthday, comfort, nostalgia, miss, congrats.

CRITICAL RULES:
- titleLine MUST use the actual recipient name (e.g. "Dear Hari", "Dear Mom", "For Sarah"). Never use a placeholder.
- The poem MUST clearly reflect the specific situation/context above — reference real details (names, places, shared moments, feelings) that the sender described. Do NOT write a generic greeting-card poem.
- POEM: exactly 6 stanzas, 4 lines each, AABB rhyme scheme, 8-12 words per line. Emotional arc across the stanzas: memory → sacrifice/struggle → quiet moments → gratitude → forever promise → blessing. No clichés, no AI-sounding phrases.
- Write at the quality of a thoughtful human poet — warm, specific, vivid imagery, honest emotion.
- Separate stanzas with a single blank line (\\n\\n). Separate lines within a stanza with a single newline (\\n).
- closing: one short italic sentence followed by a fitting emoji.

Return ONLY the structured object.`;

    const gateway = createLovableAiGatewayProvider(key);

    try {
      const { text } = await generateText({
        model: gateway("openai/gpt-5-mini"),
        prompt: prompt + "\n\nReturn ONLY valid JSON, no markdown fences, with this exact shape: {\"theme\": <one of the listed theme ids>, \"titleLine\": <string>, \"poem\": <string with stanzas separated by blank lines>, \"closing\": <string>}",
      });

      // Strip code fences if model added them
      let cleaned = text.trim();
      const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) cleaned = fenceMatch[1].trim();
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) cleaned = cleaned.slice(firstBrace, lastBrace + 1);

      const parsed = PoemSchema.parse(JSON.parse(cleaned));
      return { ...parsed, sender: data.senderName.trim() || "" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Poem generation failed", msg);
      if (msg.includes("429")) throw new Error("AI is rate-limiting. Please try again in a moment.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Please add credits in workspace settings.");
      throw new Error("Could not generate poem. Please try again.");
    }
  });

const CreateCheckoutInput = z.object({
  result: PoemSchema.extend({ sender: z.string().optional() }),
  photo: z.string().nullable().optional(),
  occasion: z.string().nullable().optional(),
  recipient: z.string().optional().default(""),
  origin: z.string().url(),
});

function shortId() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateCheckoutInput.parse(d))
  .handler(async ({ data }) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("Stripe is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const giftId = shortId();

    const { error: insertErr } = await supabaseAdmin.from("gifts").insert({
      id: giftId,
      poem: data.result,
      photo: data.photo ?? null,
      occasion: data.occasion ?? null,
      sender: data.result.sender ?? null,
      recipient: data.recipient ?? null,
      paid: false,
    });
    if (insertErr) {
      console.error("Insert gift failed", insertErr);
      throw new Error("Could not create gift");
    }

    const successUrl = `${data.origin}/?paid=1&gift=${giftId}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${data.origin}/?cancelled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: 500,
            product_data: {
              name: "Heartfelt — Gift Link",
              description: "A personalised poem gift link with music and reveal animation.",
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { gift_id: giftId },
    });

    await supabaseAdmin
      .from("gifts")
      .update({ stripe_session_id: session.id })
      .eq("id", giftId);

    return { url: session.url, giftId };
  });

const ConfirmInput = z.object({
  sessionId: z.string(),
  giftId: z.string(),
});

export const confirmPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ConfirmInput.parse(d))
  .handler(async ({ data }) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("Stripe is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const session = await stripe.checkout.sessions.retrieve(data.sessionId);
    if (session.payment_status !== "paid") {
      return { paid: false };
    }
    if (session.metadata?.gift_id !== data.giftId) {
      return { paid: false };
    }

    await supabaseAdmin
      .from("gifts")
      .update({ paid: true })
      .eq("id", data.giftId);

    return { paid: true };
  });

const GetGiftInput = z.object({ id: z.string() });

export const getGift = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => GetGiftInput.parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error } = await supabase
      .from("gifts")
      .select("id, poem, photo, occasion, sender, recipient")
      .eq("id", data.id)
      .eq("paid", true)
      .maybeSingle();
    if (error) {
      console.error("Get gift error", error);
      return null;
    }
    return row;
  });
