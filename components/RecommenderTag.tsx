"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_RECOMMENDER_LENGTH } from "@/lib/validation";

/** Mostra "Indicado por …" no card e deixa editar o nome ali mesmo. */
export default function RecommenderTag({
  name,
  title,
  disabled,
  onChange,
}: {
  name?: string | null;
  title: string;
  disabled?: boolean;
  onChange: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function start() {
    setDraft(name ?? "");
    setEditing(true);
  }

  function save() {
    onChange(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="recommender-edit"
        type="text"
        value={draft}
        maxLength={MAX_RECOMMENDER_LENGTH}
        placeholder="Quem indicou?"
        aria-label={`Quem indicou ${title}`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
      />
    );
  }

  return name ? (
    <button type="button" className="recommender-tag" onClick={start} disabled={disabled} title="Editar quem indicou">
      Indicado por <strong>{name}</strong> <span aria-hidden>✎</span>
    </button>
  ) : (
    <button type="button" className="recommender-tag empty" onClick={start} disabled={disabled}>
      + Quem indicou?
    </button>
  );
}
