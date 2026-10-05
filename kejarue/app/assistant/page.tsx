"use client";

import { FormEvent, useState } from "react";

import {
  HiArrowUpRight,
  HiCalendarDays,
  HiCurrencyDollar,
  HiHome,
  HiMagnifyingGlass,
  HiMap,
  HiOutlineSparkles,
  HiShieldCheck,
} from "react-icons/hi2";

import { PublicPage } from "../components/public-page";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const starterQuestions = [
  {
    label: "Find a home",
    prompt: "Find me a one bedroom under KSh 20,000 in Rongai.",
    icon: HiMagnifyingGlass,
  },
  {
    label: "Compare properties",
    prompt: "Compare the safest available homes under KSh 25,000.",
    icon: HiHome,
  },
  {
    label: "Check my viewings",
    prompt: "What viewings do I have coming up?",
    icon: HiCalendarDays,
  },
  {
    label: "Explore an area",
    prompt: "Find me a house with reliable water and good network.",
    icon: HiMap,
  },
];

export default function AssistantPage() {
  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm KejaTrue AI. Tell me what you're looking for and I can help you find homes, compare monthly costs and local details, and plan a viewing.",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function ask(event?: FormEvent<HTMLFormElement>, starter?: string) {
    event?.preventDefault();

    const text = String(starter ?? question).trim();

    if (!text || loading) {
      return;
    }

    setQuestion("");
    setError("");

    const userMessage: Message = {
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);

    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer,
        },
      ]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to reach KejaTrue AI.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicPage
      eyebrow="KejaTrue AI"
      title="Your intelligent house-hunting agent."
      intro="Search real listings, understand the real cost of living there, compare homes, check area intelligence and arrange viewings."
      contentClassName="public-page-content assistant-page-content"
    >
      <div className="assistant-panel">
        <div className="assistant-panel-header">
          <span className="assistant-panel-mark" aria-hidden="true">
            <HiOutlineSparkles />
          </span>
          <div className="assistant-panel-identity">
            <strong>KejaTrue AI</strong>
            <span>Your property intelligence assistant</span>
          </div>
          <span className="assistant-ready">
            <i aria-hidden="true" />
            Ready to help
          </span>
        </div>

        <div className="assistant-starters">
          <div className="assistant-starters-heading">
            <span className="eyebrow">A good place to start</span>
            <span>Choose a prompt or ask in your own words.</span>
          </div>

          {starterQuestions.map((starter) => {
            const Icon = starter.icon;

            return (
              <button
                type="button"
                key={starter.label}
                onClick={() => ask(undefined, starter.prompt)}
                disabled={loading}
              >
                <span className="assistant-starter-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="assistant-starter-label">
                  {starter.label}
                </span>
                <HiArrowUpRight
                  className="assistant-starter-arrow"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        <div
          className="assistant-chat"
          aria-label="Conversation"
          aria-live="polite"
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`assistant-message ${
                message.role === "user"
                  ? "assistant-message-user"
                  : "assistant-message-ai"
              }`}
            >
              {message.role === "assistant" && (
                <span className="assistant-message-mark" aria-hidden="true">
                  <HiOutlineSparkles />
                </span>
              )}
              <div className="assistant-message-content">
                <span className="assistant-message-author">
                  {message.role === "user" ? "You" : "KejaTrue AI"}
                </span>
                <p>{message.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="assistant-message assistant-message-ai">
              <span className="assistant-message-mark" aria-hidden="true">
                <HiOutlineSparkles />
              </span>
              <div className="assistant-message-content">
                <span className="assistant-message-author">KejaTrue AI</span>
                <p className="assistant-thinking">Checking KejaTrue data...</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="assistant-answer">
            <span className="eyebrow">Error</span>

            <p>{error}</p>
          </div>
        )}

        <div className="assistant-composer">
          <form className="assistant-form" onSubmit={ask}>
            <label htmlFor="assistant-question">Ask KejaTrue AI</label>

            <textarea
              id="assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Tell us what matters: area, budget, bedrooms or a property question."
              rows={3}
              disabled={loading}
            />

            <div className="assistant-composer-footer">
              <span>
                <HiCurrencyDollar aria-hidden="true" />
                Answers grounded in KejaTrue listings
              </span>
              <button
                className="dark-button"
                type="submit"
                disabled={loading || !question.trim()}
              >
                {loading ? "Thinking..." : "Send question"}
                <HiArrowUpRight aria-hidden="true" />
              </button>
            </div>
          </form>
          <p className="assistant-privacy-note">
            <HiShieldCheck aria-hidden="true" />
            Your question and response may be saved to your account.
          </p>
        </div>
      </div>
    </PublicPage>
  );
}
