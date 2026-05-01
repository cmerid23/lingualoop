import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import type { LangCode } from "../../data/languages";
import { tutor } from "../../lib/claude";

interface TutorDrawerProps {
  nativeLang: LangCode;
  targetLang: LangCode;
  level: "A1" | "A2" | "B1";
  lessonTitle: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function TutorDrawer({
  nativeLang,
  targetLang,
  level,
  lessonTitle,
}: TutorDrawerProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const reply = await tutor({
        messages: next.map((m) => ({ role: m.role, content: m.content })),
        nativeLang,
        targetLang,
        level,
        lessonTitle,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Tutor reply failed", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry — I couldn't reach the tutor. Try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open tutor"
        className="fixed bottom-7 right-7 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-violet transition hover:scale-110"
        style={{ background: "linear-gradient(135deg, var(--violet), var(--violet-light))" }}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Tutor chat"
        className={`fixed bottom-0 right-0 z-50 flex h-[70vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-lift sm:w-[400px] transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        {/* Handle */}
        <div className="mx-auto mt-3.5 h-1 w-10 shrink-0 rounded bg-surface-2" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-surface-2 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-white"
              style={{ background: "linear-gradient(135deg, var(--violet), var(--violet-light))" }}
            >
              <MessageCircle className="h-[18px] w-[18px]" />
            </div>
            <div>
              <div className="font-display text-base font-semibold leading-tight">
                Tutor
              </div>
              <div className="text-xs font-medium text-[#22c55e]">● Online</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close tutor"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink-3 hover:bg-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          {messages.length === 0 && (
            <p className="my-8 text-center text-sm text-ink-3">
              Ask me anything about this lesson.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "self-end rounded-[18px_4px_18px_18px] text-white"
                  : "self-start rounded-[4px_18px_18px_18px] bg-surface text-ink"
              }`}
              style={
                m.role === "user"
                  ? { background: "var(--violet)" }
                  : undefined
              }
            >
              {m.content}
            </div>
          ))}
          {sending && (
            <div className="flex w-fit gap-1 self-start rounded-[4px_18px_18px_18px] bg-surface px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-ink-3 animate-typing" style={{ opacity: 0.5 }} />
              <span className="h-2 w-2 rounded-full bg-ink-3 animate-typing" style={{ animationDelay: "0.2s", opacity: 0.5 }} />
              <span className="h-2 w-2 rounded-full bg-ink-3 animate-typing" style={{ animationDelay: "0.4s", opacity: 0.5 }} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="flex shrink-0 items-end gap-2.5 border-t border-surface-2 px-6 py-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask the tutor…"
            className="flex-1 resize-none rounded-full border border-surface-3 bg-surface px-5 py-3 text-sm text-ink outline-none transition focus:border-violet"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:scale-105 disabled:opacity-40"
            style={{ background: "var(--violet)" }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
