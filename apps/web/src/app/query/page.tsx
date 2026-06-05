"use client";

import { useState } from "react";

interface Source {
  content: string;
  sourceFile: string;
  pageNumber: number;
  similarity: number;
}

interface QueryResult {
  answered: boolean;
  answer: string | null;
  confidence: number;
  sources: Source[];
  reason: string | null;
  suggestion: string | null;
  criticVerdict: string | null;
  gapLogged: boolean;
}

export default function QueryPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: "00000000-0000-0000-0000-000000000001",
          userId: "demo-user",
          question,
        }),
      });
      const data = (await res.json()) as QueryResult;
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function confidenceColor(score: number): string {
    if (score >= 0.65) return "bg-green-500";
    if (score >= 0.4) return "bg-yellow-500";
    return "bg-red-500";
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Ask a Question</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="What would you like to know?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={handleAsk}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${confidenceColor(result.confidence)}`} />
              <span className="text-sm font-medium">
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </span>
              {result.criticVerdict && (
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    result.criticVerdict === "pass"
                      ? "bg-green-100 text-green-700"
                      : result.criticVerdict === "warn"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  Critic: {result.criticVerdict}
                </span>
              )}
            </div>

            {result.answered && result.answer ? (
              <p className="text-gray-800">{result.answer}</p>
            ) : (
              <div>
                <p className="text-gray-700 font-medium mb-1">
                  I cannot answer this question confidently.
                </p>
                {result.reason && <p className="text-gray-600 text-sm mb-2">{result.reason}</p>}
                {result.suggestion && (
                  <p className="text-gray-500 text-sm italic">{result.suggestion}</p>
                )}
              </div>
            )}
          </div>

          {result.sources.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">Sources</h2>
              <div className="space-y-2">
                {result.sources.map((src, i) => (
                  <div key={i} className="bg-white rounded border p-3 text-sm">
                    <p className="text-gray-500 mb-1">
                      {src.sourceFile} · page {src.pageNumber} · similarity{" "}
                      {(src.similarity * 100).toFixed(0)}%
                    </p>
                    <p className="text-gray-700 line-clamp-3">{src.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
