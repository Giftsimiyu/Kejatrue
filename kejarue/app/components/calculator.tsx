"use client";

import { useState } from "react";
import { PublicPage } from "./public-page";

type CalculatorProps = {
  kind: "budget" | "bills";
};

export function Calculator({ kind }: CalculatorProps) {
  const [rent, setRent] = useState(70000);
  const [income, setIncome] = useState(180000);
  const [utilities, setUtilities] = useState(12000);
  const [transport, setTransport] = useState(15000);

  const total =
    kind === "budget" ? rent + utilities + transport : utilities + transport;
  const remaining = Math.max(income - total, 0);
  const title =
    kind === "budget"
      ? "Know what home can fit your life."
      : "See the cost beyond rent.";
  const intro =
    kind === "budget"
      ? "Estimate a comfortable monthly housing budget before you start comparing homes."
      : "Add the regular costs around a home to get a clearer monthly picture.";

  return (
    <PublicPage
      eyebrow={kind === "budget" ? "Budget calculator" : "Bills calculator"}
      title={title}
      intro={intro}
    >
      <div className="calculator-layout">
        <div className="calculator-form">
          <label>
            Monthly income
            <input
              type="number"
              min="0"
              value={income}
              onChange={(event) => setIncome(Number(event.target.value))}
            />
          </label>
          <label>
            {kind === "budget" ? "Expected monthly rent" : "Monthly rent"}
            <input
              type="number"
              min="0"
              value={rent}
              onChange={(event) => setRent(Number(event.target.value))}
            />
          </label>
          <label>
            Utilities and internet
            <input
              type="number"
              min="0"
              value={utilities}
              onChange={(event) => setUtilities(Number(event.target.value))}
            />
          </label>
          <label>
            Transport and other home costs
            <input
              type="number"
              min="0"
              value={transport}
              onChange={(event) => setTransport(Number(event.target.value))}
            />
          </label>
        </div>
        <aside className="calculator-result">
          <span className="eyebrow">Your estimate</span>
          <strong>KSh {total.toLocaleString()}</strong>
          <p>Estimated monthly home costs</p>
          <div>
            <span>Income left after costs</span>
            <b>KSh {remaining.toLocaleString()}</b>
          </div>
          <small>
            This is a planning estimate. Confirm actual costs with the property
            owner.
          </small>
        </aside>
      </div>
    </PublicPage>
  );
}
