"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DEMO_KB } from "@/lib/crew/demo-data";

type KbItem = (typeof DEMO_KB)[number];

export default function KnowledgePage() {
  const [items, setItems] = useState<KbItem[]>(DEMO_KB);
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q),
    );
  }, [items, query]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    const newItem: KbItem = {
      id: `kb-demo-${Date.now()}`,
      question: question.trim(),
      answer: answer.trim(),
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [newItem, ...prev]);
    setQuestion("");
    setAnswer("");
  }

  function startEdit(item: KbItem) {
    setEditingId(item.id);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editQuestion.trim() || !editAnswer.trim()) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === editingId
          ? {
              ...item,
              question: editQuestion.trim(),
              answer: editAnswer.trim(),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setEditingId(null);
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) setEditingId(null);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-accent hover:underline">
        ← Back to Inbox
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Knowledge base</h1>
      <p className="mt-1 text-sm text-muted">
        Demo data — not real customers.
      </p>
      <p className="mt-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
        Demo only — stored in browser state. Real KB needs Supabase (not
        connected yet).
      </p>

      <label className="mt-6 block">
        <span className="text-sm font-medium">Search</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions and answers…"
          className="mt-1 w-full min-h-11 rounded-md border border-line bg-panel px-3 py-2 text-sm"
        />
      </label>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Add an answer</h2>
        <form onSubmit={handleAdd} className="mt-3 space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Question</span>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. How do I change my plan?"
              className="mt-1 w-full min-h-11 rounded-md border border-line bg-panel-2 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Answer</span>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              placeholder="Write the answer the crew should use…"
              className="mt-1 w-full min-h-11 rounded-md border border-line bg-panel-2 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={!question.trim() || !answer.trim()}
            className="rounded-md min-h-11 bg-cta px-4 py-2 text-sm font-medium text-void hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to knowledge base
          </button>
        </form>
      </section>

      <section className="mt-6">
        <p className="text-sm text-muted">
          {filtered.length} of {items.length} entries
        </p>
        {filtered.length === 0 ? (
          <p className="mt-3 rounded-lg border border-line bg-panel p-6 text-sm text-muted">
            No entries match your search.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-line bg-panel p-5"
              >
                {editingId === item.id ? (
                  <form onSubmit={handleSaveEdit} className="space-y-3">
                    <label className="block">
                      <span className="text-sm font-medium">Question</span>
                      <input
                        type="text"
                        value={editQuestion}
                        onChange={(e) => setEditQuestion(e.target.value)}
                        className="mt-1 w-full min-h-11 rounded-md border border-line bg-panel-2 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">Answer</span>
                      <textarea
                        value={editAnswer}
                        onChange={(e) => setEditAnswer(e.target.value)}
                        rows={3}
                        className="mt-1 w-full min-h-11 rounded-md border border-line bg-panel-2 px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="rounded-md min-h-11 bg-cta px-4 py-2 text-sm font-medium text-void hover:opacity-90"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-md min-h-11 border border-line bg-panel px-4 py-2 text-sm font-medium hover:border-accent"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h2 className="font-medium leading-snug">
                      {item.question}
                    </h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                      {item.answer}
                    </p>
                    <p className="mt-3 text-xs text-muted">
                      Updated {new Date(item.updatedAt).toISOString().slice(0, 10)}
                    </p>
                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-reject hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
