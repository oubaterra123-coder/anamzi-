import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";


type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PublicProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  product_type: "direct" | "affiliate";
};

export async function POST(request: Request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const clientIp =
      request.headers.get("x-real-ip")?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      (process.env.NODE_ENV !== "production" ? "127.0.0.1" : null);

    if (!serviceRoleKey || !clientIp) {
      return NextResponse.json(
        { error: "AI service is temporarily unavailable." },
        { status: 503 }
      );
    }

    const keyHash = createHmac("sha256", serviceRoleKey)
      .update(clientIp)
      .digest("hex");

    const rateLimitClient = createSupabaseAdminClient();
    const { data: limitData, error: limitError } = await rateLimitClient.rpc(
      "consume_ai_rate_limit",
      { p_key_hash: keyHash, p_limit: 10, p_window_seconds: 600 }
    );

    if (limitError || !Array.isArray(limitData) || !limitData[0]) {
      console.error("Buyer AI rate limit error:", limitError?.message ?? "Invalid response");
      return NextResponse.json(
        { error: "AI service is temporarily unavailable." },
        { status: 503 }
      );
    }

    const rateLimit = limitData[0] as {
      allowed: boolean;
      remaining: number;
      reset_at: string;
    };

    if (!rateLimit.allowed) {
      const retryAfter = Math.max(
        1,
        Math.ceil((new Date(rateLimit.reset_at).getTime() - Date.now()) / 1000)
      );
      return NextResponse.json(
        { error: "Too many messages. Please try again in a few minutes." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service is not configured." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const rawMessages = body?.messages;

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json(
        { error: "Please send a message." },
        { status: 400 }
      );
    }

    if (rawMessages.length > 10) {
      return NextResponse.json(
        { error: "Conversation is too long. Start a new chat." },
        { status: 400 }
      );
    }

    const messages: ChatMessage[] = [];

    for (const item of rawMessages) {
      if (
        !item ||
        !["user", "assistant"].includes(item.role) ||
        typeof item.content !== "string" ||
        item.content.length > 1500
      ) {
        return NextResponse.json(
          { error: "Invalid message." },
          { status: 400 }
        );
      }

      messages.push({
        role: item.role,
        content: item.content.trim(),
      });
    }

    if (
      messages[messages.length - 1].role !== "user" ||
      !messages[messages.length - 1].content
    ) {
      return NextResponse.json(
        { error: "The last message must be from the buyer." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc(
      "get_approved_products_with_affiliate"
    );

    if (error) {
      console.error("Buyer AI catalog error:", error.message);
      return NextResponse.json(
        { error: "The product catalog is temporarily unavailable." },
        { status: 503 }
      );
    }

    const catalog: PublicProduct[] = (data ?? [])
      .slice(0, 80)
      .map((item: {
        id: string;
        title: string;
        description: string | null;
        price: number;
        currency: string | null;
        category: string | null;
        product_type: string | null;
      }) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? "",
        price: Number(item.price),
        currency: item.currency ?? "",
        category: item.category ?? "Other",
        product_type:
          item.product_type === "affiliate" ? "affiliate" : "direct",
      }));

    if (catalog.length === 0) {
      return NextResponse.json({
        reply: "There are no approved products available right now.",
        products: [],
      });
    }

    const prompt = `
You are ANAMZI's friendly shopping assistant.
Help buyers discover products from the catalog below.

STRICT RULES:
- Recommend ONLY products whose exact IDs exist in this catalog.
- Never invent products, prices, discounts, stock, shipping details or guarantees.
- Use only the supplied catalog information.
- If the catalog does not answer a question, say you do not have that information.
- Reply in the same language as the buyer (Darija, French, English, or Arabic).
- Be concise, helpful and natural.
- Return valid JSON only, with this exact structure:
{"reply":"your answer","productIds":["existing-id"]}
- productIds must contain only relevant catalog IDs, maximum 4.
- If no product is relevant, return an empty productIds array.

APPROVED PUBLIC CATALOG:
${JSON.stringify(catalog)}

CONVERSATION:
${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}
`;

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => null);
      console.error(
        "Buyer AI Gemini error:",
        errorData?.error?.message ?? geminiResponse.status
      );
      return NextResponse.json(
        { error: "The AI assistant is temporarily unavailable." },
        { status: 502 }
      );
    }

    const result = await geminiResponse.json();
    const rawText =
      result?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("") ?? "";

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("Buyer AI returned invalid JSON.");
      return NextResponse.json(
        { error: "Could not process the AI response. Please try again." },
        { status: 502 }
      );
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "The AI returned an invalid response. Please try again." },
        { status: 502 }
      );
    }

    const parsedResponse = parsed as {
      reply?: unknown;
      productIds?: unknown;
    };

    const validIds = new Set(catalog.map((product) => product.id));
    const selectedIds = Array.isArray(parsedResponse.productIds)
      ? [...new Set(parsedResponse.productIds.filter(
          (id): id is string => typeof id === "string" && validIds.has(id)
        ))].slice(0, 4)
      : [];

    const selectedProducts = catalog
      .filter((product) => selectedIds.includes(product.id))
      .map((product) => ({
        id: product.id,
        name: product.title,
        description: product.description,
        price: `${product.price.toFixed(2)} ${product.currency}`.trim(),
        category: product.category,
        product_type: product.product_type,
      }));

    return NextResponse.json({
      reply:
        typeof parsedResponse.reply === "string" && parsedResponse.reply.trim()
          ? parsedResponse.reply.slice(0, 2000)
          : "I can help you find a product. What are you looking for?",
      products: selectedProducts,
    });
  } catch (error) {
    console.error(
      "Buyer AI route error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
