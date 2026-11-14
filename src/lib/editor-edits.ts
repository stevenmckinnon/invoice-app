/**
 * The assistant working the invoice editor you have open. While the editor is
 * on screen, the chat request carries a snapshot of it, and the model gets one
 * more tool, `editOpenInvoice`, which has no server side: the browser applies
 * it to the editor's state through `applyEditorEdits`, so the calendar paints
 * itself and nothing is saved until you press Create invoice.
 *
 * Pure, and shared by the route (schemas, prompt text) and the editor (the
 * rules), so what a request does to the editor is tested, not eyeballed.
 */
import { z } from "zod";

import type { BillableDay } from "@/lib/billing";
import type { Painted, PaintedDay } from "@/lib/day-editor";
import { OT_MAX, OT_STEP } from "@/lib/day-keyboard";

export const EDIT_OPEN_INVOICE_TOOL = "editOpenInvoice";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be an ISO date (YYYY-MM-DD)");

/** What the model sends. Each day entry changes one date and leaves the rest */
export const editorEditSchema = z.object({
  days: z
    .array(
      z.object({
        date: isoDate,
        type: z
          .enum(["work", "travel", "dark", "off", "clear"])
          .optional()
          .describe(
            'work, travel or dark paints the date; "off" marks a day off inside the job; "clear" removes the date. Omit to keep the day as it is and change only its overtime.',
          ),
        alsoTravel: z
          .enum(["out", "home"])
          .optional()
          .describe(
            'Work days only: also travelled that day, "out" (flew in) or "home" (flew home after wrap). A work day sent without it has no travel.',
          ),
        overtimeHours: z
          .number()
          .min(0)
          .max(OT_MAX)
          .optional()
          .describe(
            "Work days only: hours of overtime, in half hours. 0 removes it. Omitted on a work day, any overtime it had is kept.",
          ),
      }),
    )
    .max(62)
    .optional()
    .describe(
      "Only the dates that change. Dates not listed stay exactly as they are.",
    ),
  showName: z.string().trim().min(1).max(200).optional(),
  clientId: z
    .string()
    .optional()
    .describe("A saved client's ID. Changing client re-prices the invoice."),
  invoiceDate: isoDate.optional(),
  notes: z.string().max(2000).optional(),
  addExpenses: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(999).default(1),
        unitPrice: z.number().min(0).max(1_000_000),
      }),
    )
    .max(20)
    .optional()
    .describe("Expenses or fixed fees to add. Existing ones are kept."),
});

export type EditorEdit = z.infer<typeof editorEditSchema>;

export interface EditorExpense {
  description: string;
  quantity: number;
  unitPrice: number;
}

/** The parts of the editor the assistant may change */
export interface EditorFields {
  painted: Painted;
  clientId: string | null;
  showName: string;
  invoiceDate: string;
  notes: string;
}

export interface EditorEditResult {
  fields: EditorFields;
  /** Expenses to append, already checked */
  newExpenses: EditorExpense[];
  /** What was done, in words the model can repeat */
  applied: string[];
  /** What was refused and why, so the model can say so or fix the call */
  rejected: string[];
}

const isRealDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
};

const snapOvertime = (hours: number) =>
  Math.min(OT_MAX, Math.max(0, Math.round(hours / OT_STEP) * OT_STEP));

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Applies one request from the model. Each part stands alone: a bad date or an
 * unknown client is refused with a reason while the rest still applies, since
 * the person is watching and can see what happened.
 */
export const applyEditorEdits = (
  current: EditorFields,
  edit: EditorEdit,
  clients: ReadonlyArray<{ id: string; name: string }>,
): EditorEditResult => {
  const applied: string[] = [];
  const rejected: string[] = [];
  const painted: Painted = new Map(current.painted);
  let { clientId, showName, invoiceDate, notes } = current;

  if (edit.clientId !== undefined && edit.clientId !== clientId) {
    const client = clients.find((c) => c.id === edit.clientId);
    if (client) {
      clientId = client.id;
      applied.push(`Client set to ${client.name}`);
    } else {
      rejected.push(`No saved client has the ID ${edit.clientId}.`);
    }
  }

  if (edit.showName !== undefined && edit.showName !== showName) {
    showName = edit.showName;
    applied.push(`Job named "${showName}"`);
  }

  if (edit.invoiceDate !== undefined) {
    if (isRealDate(edit.invoiceDate)) {
      invoiceDate = edit.invoiceDate;
      applied.push(`Invoice dated ${invoiceDate}`);
    } else {
      rejected.push(`${edit.invoiceDate} isn't a real date.`);
    }
  }

  if (edit.notes !== undefined) {
    notes = edit.notes;
    applied.push(notes ? "Notes updated" : "Notes cleared");
  }

  let painting = 0;
  let clearing = 0;
  let overtimeSet = 0;
  for (const entry of edit.days ?? []) {
    if (!isRealDate(entry.date)) {
      rejected.push(`${entry.date} isn't a real date.`);
      continue;
    }
    const before = painted.get(entry.date);

    if (entry.type === "clear") {
      if (before) {
        painted.delete(entry.date);
        clearing++;
      }
      continue;
    }

    const type = entry.type ?? before?.type;
    if (!type) {
      rejected.push(
        `${entry.date} isn't painted yet, so say what kind of day it is.`,
      );
      continue;
    }
    if (type !== "work" && entry.overtimeHours) {
      rejected.push(
        `${entry.date}: overtime goes on work days only, and this is a ${type} day.`,
      );
      continue;
    }
    if (type !== "work" && entry.alsoTravel) {
      rejected.push(
        `${entry.date}: only a work day can also have travel; use a travel day instead.`,
      );
      continue;
    }

    let next: PaintedDay;
    if (type === "work") {
      // Overtime stays unless it's set; travel follows what was sent when the
      // type was sent, and stays when only the overtime changes
      const overtime =
        entry.overtimeHours !== undefined
          ? snapOvertime(entry.overtimeHours)
          : before?.type === "work"
            ? before.overtimeHours
            : undefined;
      const alsoTravel = entry.type
        ? entry.alsoTravel
        : (entry.alsoTravel ??
          (before?.type === "work" ? before.alsoTravel : undefined));
      next = {
        type: "work",
        ...(alsoTravel && { alsoTravel }),
        ...(overtime ? { overtimeHours: overtime } : {}),
      };
      if (entry.overtimeHours !== undefined) overtimeSet++;
    } else {
      next = { type };
    }
    if (entry.type) painting++;
    painted.set(entry.date, next);
  }
  if (painting) applied.push(`Painted ${plural(painting, "day")}`);
  if (clearing) applied.push(`Cleared ${plural(clearing, "day")}`);
  if (overtimeSet) {
    applied.push(`Set overtime on ${plural(overtimeSet, "day")}`);
  }

  const newExpenses = (edit.addExpenses ?? []).map((e) => ({
    description: e.description,
    quantity: e.quantity,
    unitPrice: e.unitPrice,
  }));
  if (newExpenses.length) {
    applied.push(`Added ${plural(newExpenses.length, "expense")}`);
  }

  return {
    fields: { painted, clientId, showName, invoiceDate, notes },
    newExpenses,
    applied,
    rejected,
  };
};

/**
 * What the editor shows, sent with every chat request while it's open. The
 * browser builds it, so the route checks it like any other input and caps it.
 */
export const editorSnapshotSchema = z.object({
  mode: z.enum(["new", "edit", "correction"]),
  invoiceNumber: z.string().max(60),
  clientId: z.string().max(100).nullable(),
  clientName: z.string().max(200).nullable(),
  showName: z.string().max(200),
  invoiceDate: isoDate,
  days: z
    .array(
      z.object({
        date: isoDate,
        type: z.enum(["work", "travel", "dark"]),
        alsoTravel: z.enum(["out", "home"]).optional(),
        overtimeHours: z.number().min(0).max(OT_MAX).optional(),
      }),
    )
    .max(120),
  expenses: z
    .array(
      z.object({
        description: z.string().max(200),
        quantity: z.number(),
        unitPrice: z.number(),
      }),
    )
    .max(50),
  total: z.string().max(40),
  stillToDo: z.array(z.string().max(200)).max(10),
});

export type EditorSnapshot = z.infer<typeof editorSnapshotSchema>;

/** The snapshot's days, as the editor resolves them for billing */
export const snapshotDays = (billable: BillableDay[]): EditorSnapshot["days"] =>
  billable.map((d) => ({
    date: d.date,
    type: d.type,
    ...(d.alsoTravel && { alsoTravel: d.alsoTravel }),
    ...(d.overtimeHours ? { overtimeHours: d.overtimeHours } : {}),
  }));

/** Reads the snapshot from a request body; null if missing or malformed */
export const parseEditorSnapshot = (value: unknown): EditorSnapshot | null => {
  const parsed = editorSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const describeDay = (d: EditorSnapshot["days"][number]) =>
  [
    d.date,
    d.type,
    d.alsoTravel && `+ travel ${d.alsoTravel}`,
    d.overtimeHours && `${d.overtimeHours}h overtime`,
  ]
    .filter(Boolean)
    .join(" ");

/** The prompt section that tells the model the editor is open, and what's in it */
export const describeOpenEditor = (snapshot: EditorSnapshot) => {
  const heading =
    snapshot.mode === "edit"
      ? `editing draft invoice ${snapshot.invoiceNumber}`
      : snapshot.mode === "correction"
        ? `writing invoice ${snapshot.invoiceNumber || "(new)"}, a correction`
        : `creating new invoice ${snapshot.invoiceNumber || "(number pending)"}`;
  const days = snapshot.days.length
    ? snapshot.days.map((d) => `  - ${describeDay(d)}`).join("\n")
    : "  (none painted)";
  const expenses = snapshot.expenses.length
    ? snapshot.expenses
        .map((e) => `  - ${e.description}: ${e.quantity} × ${e.unitPrice}`)
        .join("\n")
    : "  (none)";
  return `## The invoice editor is open
The user has the invoice editor on screen, ${heading}. Nothing in it is saved yet.
- Client: ${snapshot.clientName ? `${snapshot.clientName} (ID: ${snapshot.clientId})` : "not picked"}
- Job: ${snapshot.showName || "not named"}
- Invoice date: ${snapshot.invoiceDate}
- Total so far: ${snapshot.total}
- Days:
${days}
- Expenses:
${expenses}
${snapshot.stillToDo.length ? `- Still needed before it can be saved: ${snapshot.stillToDo.join(", ")}` : "- Ready to save"}

While the editor is open, changes to this invoice go through ${EDIT_OPEN_INVOICE_TOOL}, which updates the editor in front of the user; don't create or update a separate draft for it. Send only the dates that change. The user saves it themselves with the button under the invoice, so after an edit tell them what changed, the new total, and that it isn't saved until they press it. If the result lists anything rejected, say so plainly.`;
};
