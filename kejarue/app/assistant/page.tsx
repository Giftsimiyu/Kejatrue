"use client";

import { FormEvent, useState } from "react";
import { PublicPage } from "../components/public-page";

const starterQuestions = [
  "What should I ask before viewing a property?",
  "How can I compare two homes fairly?",
  "What does a good listing include?",
];

export default function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setAnswer(
      "Start with the total monthly cost, water and power reliability, deposit terms, security, commute and what is still unverified. A clear answer is worth more than a polished listing.",
    );
  }

  return (
    <PublicPage
      eyebrow="KejaTrue assistant"
      title="Ask the question before you commit."
      intro="Use the assistant to prepare for viewings and make sense of the details behind a property listing."
    >
      <div className="assistant-panel">
        <div className="assistant-starters">
          <span className="eyebrow">Try asking</span>
          {starterQuestions.map((starter) => (
            <button
              type="button"
              key={starter}
              onClick={() => setQuestion(starter)}
            >
              {starter} <span>↗</span>
            </button>
          ))}
        </div>
        <form className="assistant-form" onSubmit={ask}>
          <label htmlFor="assistant-question">Your question</label>
          <textarea
            id="assistant-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about a home, viewing or cost..."
            rows={4}
          />
          <button className="dark-button" type="submit">
            Ask KejaTrue <span>↗</span>
          </button>
        </form>
        {answer && (
          <div className="assistant-answer">
            <span className="eyebrow">KejaTrue says</span>
            <p>{answer}</p>
          </div>
        )}
      </div>
    </PublicPage>
  );
}
