"use client";

import { useState } from "react";

type BuyerMessage = {
  role: "user" | "assistant";
  content: string;
  products?: {
    id: string;
    name: string;
    description: string;
    price: string;
    category: string;
    product_type: "direct" | "affiliate";
  }[];
};

type Props = {
  onSelectProduct: (productId: string) => void;
};

export default function BuyerAI({ onSelectProduct }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<BuyerMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();
    if (!content || loading) return;

    const nextMessages = [
      ...messages,
      { role: "user" as const, content },
    ].slice(-10);

    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/buyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI assistant is unavailable.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply || "How can I help you find a product?",
          products: Array.isArray(data.products) ? data.products : [],
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <section
          aria-label="ANAMZI shopping assistant"
          className="fixed bottom-24 right-4 z-[40] flex h-[min(600px,75vh)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b100d] text-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-white/10 bg-[#111813] p-4">
            <div>
              <p className="text-xs font-bold tracking-widest text-[#b7ff35]">ANAMZI AI</p>
              <h2 className="mt-1 font-black">Shopping Assistant</h2>
              <p className="mt-1 text-xs text-neutral-400">Find products from our catalog</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-full bg-white/10 px-3 py-2 text-neutral-300 hover:bg-white/20"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="rounded-2xl border border-[#b7ff35]/20 bg-[#b7ff35]/5 p-4">
                <p className="font-bold text-[#b7ff35]">Welcome to ANAMZI!</p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  Tell me what you are looking for. I can help you discover products in our catalog.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[90%] rounded-2xl p-3 ${
                  message.role === "user"
                    ? "ml-auto bg-[#b7ff35] text-black"
                    : "border border-white/10 bg-[#151c17] text-neutral-100"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>

                {message.products?.map((product) => (
                  <div
                    key={product.id}
                    className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3"
                  >
                    <p className="font-bold">{product.name}</p>
                    <p className="mt-1 text-xs text-neutral-400">{product.category}</p>
                    {product.description && (
                      <p className="mt-2 text-xs leading-5 text-neutral-300">
                        {product.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-[#b7ff35]">
                        {product.price}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onSelectProduct(product.id);
                        }}
                        className="rounded-full bg-[#b7ff35] px-3 py-2 text-xs font-black text-black hover:bg-[#9de51f]"
                      >
                        {product.product_type === "affiliate" ? "View offer" : "Order"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {loading && (
              <p className="text-sm text-neutral-400">ANAMZI AI is thinking...</p>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>

          <form onSubmit={sendMessage} className="border-t border-white/10 bg-[#111813] p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={1500}
                placeholder="Ask about a product..."
                aria-label="Your message"
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#b7ff35]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-[#b7ff35] px-4 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open ANAMZI shopping assistant"
        className="fixed bottom-5 right-5 z-[40] flex items-center gap-2 rounded-full bg-[#b7ff35] px-5 py-4 font-black text-black shadow-xl transition hover:scale-105"
      >
        <span>✦</span>
        <span>Ask ANAMZI AI</span>
      </button>
    </>
  );
}
