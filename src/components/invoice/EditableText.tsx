"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Text on the paper that becomes an input when tapped. It reads as the
 * document until you touch it: you edit the invoice, not a form about it.
 * A dotted underline is the only hint it's editable.
 */
export const EditableText = ({
  value,
  onChange,
  label,
  placeholder,
  multiline = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name: the paper's own heading isn't attached to the field */
  label: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    onChange(draft.trim());
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  // Inherits the paper's type so nothing jumps when it becomes an input.
  // 16px minimum on phones, or iOS zooms the page on focus.
  const shared = cn(
    "bg-muted/60 -mx-1 w-[calc(100%+0.5rem)] rounded px-1 text-base outline-none sm:text-[length:inherit]",
    "focus-visible:ring-ring focus-visible:ring-2",
    className,
  );

  if (editing) {
    const props = {
      autoFocus: true,
      "aria-label": label,
      value: draft,
      placeholder,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setDraft(e.target.value),
      onBlur: commit,
      // Short fields select their text so typing replaces it (an invoice
      // number is rewritten, not appended to); notes keep the caret at the end
      onFocus: (
        e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        if (!multiline) e.currentTarget.select();
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Escape") cancel();
        if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit();
        }
      },
    };
    return multiline ? (
      <textarea {...props} rows={3} className={cn(shared, "resize-none")} />
    ) : (
      <input {...props} className={shared} />
    );
  }

  return (
    <button
      type="button"
      aria-label={`${label}: ${value || "empty"}. Edit`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={cn(
        "hover:bg-muted/60 -mx-1 rounded px-1 text-left transition-colors",
        "decoration-muted-foreground/50 underline decoration-dotted underline-offset-4",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        !value && "text-muted-foreground",
        className,
      )}
    >
      {value || placeholder}
    </button>
  );
};
