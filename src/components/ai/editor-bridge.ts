"use client";

/**
 * How the chat reaches the invoice editor on screen. The editor registers
 * itself while it's mounted; the chat reads a snapshot of it for each request
 * and hands it the `editOpenInvoice` tool calls. One editor at a time, and
 * none on most pages, which is how the route knows not to offer the tool.
 */
import type { EditorEdit, EditorSnapshot } from "@/lib/editor-edits";

export interface EditorEditOutput {
  applied: string[];
  rejected: string[];
  /** The editor's total after the change, formatted */
  total: string;
  stillToDo: string[];
  saved: false;
}

export interface OpenEditor {
  snapshot: () => EditorSnapshot;
  apply: (edit: EditorEdit) => EditorEditOutput;
}

let current: OpenEditor | null = null;

export const registerOpenEditor = (editor: OpenEditor) => {
  current = editor;
  return () => {
    if (current === editor) current = null;
  };
};

export const getOpenEditor = () => current;
