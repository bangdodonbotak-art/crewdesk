"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEMO_KB } from "@/lib/crew/demo-data";

type KbItem = {
  id: string;
  question: string;
  answer: string;
  updatedAt: string;
};

type Mode = "loading" | "live" | "demo" | "unauthorized" | "not-configured" | "error";

export default function KnowledgePage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [items, setItems] = useState<KbItem[]>(DEMO_KB);
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Live KB from Supabase; demo data is the honest fallback when the
  // visitor is signed out or Supabase is not configured.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/knowledge")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setMode("unauthorized");
          return;
        }
        if (res.status === 503) {
          setMode("not-configured");
          return;
        }
        const data = await res.json();
        if (!data.ok) {
          setMode("error");
          return;
        }
        setItems(
          ((data.items ?? []) as { id: string; question: string; answer: string; updated_at: string }[]).map(
            (i) => ({ id: i.id, question: i.question, answer: i.answer, updatedAt: i.updated_at }),
          ),
        );
        setMode("live");
        if (data.seeded) {
          setNotice("Your knowledge base was empty, so 3 starter answers were added — edit or delete them freely.");
        }
      })
      .catch(() => {
        if (!cancelled) setMode("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const live = mode === "live";
  const demo = mode === "demo" || mode === "unauthorized" || mode === "not-configured" || mode === "error";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q),
    );
  }, [items, query]);

  async function apiCall(method: string, body?: unknown): Promise<{ ok: boolean; item?: KbItem; error?: string }> {
    const res = await fetch("/api/knowledge", {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? `server returned ${res.status}` };
    if (data.item) {
      const i = data.item as { id: string; question: string; answer: string; updated_at: string };
      return { ok: true, item: { id: i.id, question: i.question, answer: i.answer, updatedAt: i.updated_at } };
    }
    return { ok: true };
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setBusy(true);
    if (live) {
      const r = await apiCall("POST", { question: question.trim(), answer: answer.trim() });
      if (r.ok && r.item) {
        setItems((prev) => [r.item!, ...prev]);
        setQuestion("");
        setAnswer("");
        setNotice("Saved to your knowledge base.");
      } else {
        setNotice(`Could not save — ${r.error}.`);
      }
    } else {
      const newItem: KbItem = {
        id: `kb-demo-${Date.now()}`,
        question: question.trim(),
        answer: answer.trim(),
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
      setQuestion("");
      setAnswer("");
      setNotice("Saved to the demo view only — sign in to keep it in your real knowledge base.");
    }
    setBusy(false);
  }

  function startEdit(item: KbItem) {
    setEditingId(item.id);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editQuestion.trim() || !editAnswer.trim()) return;
    setBusy(true);
    if (live) {
      const r = await apiCall("PUT", { id: editingId, question: editQuestion.trim(), answer: editAnswer.trim() });
      if (r.ok && r.item) {
        setItems((prev) => prev.map((item) => (item.id === editingId ? r.item! : item)));
        setEditingId(null);
        setNotice("Saved.");
      } else {
        setNotice(`Could not save — ${r.error}.`);
      }
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, question: editQuestion.trim(), answer: editAnswer.trim(), updatedAt: new Date().toISOString() }
            : item,
        ),
      );
      setEditingId(null);
      setNotice("Edited in the demo view only — sign in to keep it.");
    }
    setBusy(false);
  }

  async function handleDelete(id: string) {
    if (live) {
      const r = await apiCall("DELETE", { id });
      if (r.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setNotice("Deleted from your knowledge base.");
      } else {
        setNotice(`Could not delete — ${r.error}.`);
        return;
      }
    } else {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setNotice("Deleted from the demo view only.");
    }
    if (editingId === id) setEditingId(null);
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-accent hover:underline">
        ← Back to Inbox
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Knowledge base</h1>
      <p className="mt-1 text-sm text-muted">
        {live ? "Your real knowledge base — the crew answers only from here." : "Demo data — not real customers."}
      </p>
      {/* The loading banner only shows when there is nothing to show yet.
        Demo entries render immediately from DEMO_KB while the fetch is
        still in flight, so a "Loading…" banner next to 4 visible entries
        contradicts what the visitor sees. Once the fetch resolves the
        demo banner below takes over. */}
      {mode === "loading" && items.length === 0 ? (
        <p className="mt-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
          Loading your knowledge base…
        </p>
      ) : demo ? (
        <p className="mt-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
          {mode === "unauthorized"
            ? "Demo only — sign in to use your real knowledge base. Changes here are stored in browser state only."
            : mode === "not-configured"
              ? "Demo only — stored in browser state. Real KB needs Supabase (not connected yet)."
              : "Demo only — stored in browser state. Sign in to use your real knowledge base."}
        </p>
      ) : null}
      {notice && (
        <p role="status" className="mt-2 rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-approve">
          {notice}
        </p>
      )}

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
            disabled={busy || !question.trim() || !answer.trim()}
            className="rounded-md min-h-11 bg-cta px-4 py-2 text-sm font-medium text-void transition-transform duration-200 hover:-translate-y-px hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-0 active:scale-[0.98]"
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
                        disabled={busy}
                        className="rounded-md min-h-11 bg-cta px-4 py-2 text-sm font-medium text-void hover:opacity-90 disabled:opacity-50"
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
                        onClick={() => void handleDelete(item.id)}
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
