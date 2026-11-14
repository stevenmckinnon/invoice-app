import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Painted } from "@/lib/day-editor";
import {
  type EditorFields,
  applyEditorEdits,
  describeOpenEditor,
  editorEditSchema,
  parseEditorSnapshot,
} from "@/lib/editor-edits";

const clients = [
  { id: "c1", name: "Lucha Inc" },
  { id: "c2", name: "Arena Ltd" },
];

const fields = (painted: Painted = new Map()): EditorFields => ({
  painted,
  clientId: "c1",
  showName: "Triplemania 34",
  invoiceDate: "2026-11-01",
  notes: "",
});

const edit = (input: unknown) => editorEditSchema.parse(input);

describe("applyEditorEdits", () => {
  it("paints days and leaves dates it wasn't sent alone", () => {
    const start = fields(new Map([["2026-11-02", { type: "dark" as const }]]));
    const result = applyEditorEdits(
      start,
      edit({
        days: [
          { date: "2026-11-03", type: "travel" },
          { date: "2026-11-04", type: "work", alsoTravel: "out" },
        ],
      }),
      clients,
    );
    assert.deepEqual(
      [...result.fields.painted.entries()],
      [
        ["2026-11-02", { type: "dark" }],
        ["2026-11-03", { type: "travel" }],
        ["2026-11-04", { type: "work", alsoTravel: "out" }],
      ],
    );
    assert.deepEqual(result.applied, ["Painted 2 days"]);
    assert.deepEqual(result.rejected, []);
    // The input is never mutated: React state stays as it was
    assert.equal(start.painted.size, 1);
  });

  it("sets overtime on a work day without repainting it", () => {
    const start = fields(
      new Map([
        ["2026-11-04", { type: "work" as const, alsoTravel: "home" as const }],
      ]),
    );
    const result = applyEditorEdits(
      start,
      edit({ days: [{ date: "2026-11-04", overtimeHours: 2.3 }] }),
      clients,
    );
    assert.deepEqual(result.fields.painted.get("2026-11-04"), {
      type: "work",
      alsoTravel: "home",
      overtimeHours: 2.5,
    });
    assert.deepEqual(result.applied, ["Set overtime on 1 day"]);
  });

  it("keeps overtime when a work day is repainted as work, and 0 removes it", () => {
    const start = fields(
      new Map([["2026-11-04", { type: "work" as const, overtimeHours: 3 }]]),
    );
    const kept = applyEditorEdits(
      start,
      edit({ days: [{ date: "2026-11-04", type: "work", alsoTravel: "out" }] }),
      clients,
    );
    assert.deepEqual(kept.fields.painted.get("2026-11-04"), {
      type: "work",
      alsoTravel: "out",
      overtimeHours: 3,
    });
    const removed = applyEditorEdits(
      start,
      edit({ days: [{ date: "2026-11-04", overtimeHours: 0 }] }),
      clients,
    );
    assert.deepEqual(removed.fields.painted.get("2026-11-04"), {
      type: "work",
    });
  });

  it("drops overtime when a work day becomes another kind", () => {
    const start = fields(
      new Map([["2026-11-04", { type: "work" as const, overtimeHours: 3 }]]),
    );
    const result = applyEditorEdits(
      start,
      edit({ days: [{ date: "2026-11-04", type: "dark" }] }),
      clients,
    );
    assert.deepEqual(result.fields.painted.get("2026-11-04"), { type: "dark" });
  });

  it("refuses overtime or travel on a day that isn't work, and keeps the rest", () => {
    const result = applyEditorEdits(
      fields(new Map([["2026-11-05", { type: "travel" as const }]])),
      edit({
        days: [
          { date: "2026-11-05", overtimeHours: 2 },
          { date: "2026-11-06", type: "dark", alsoTravel: "home" },
          { date: "2026-11-07", type: "work" },
        ],
      }),
      clients,
    );
    assert.equal(result.rejected.length, 2);
    assert.match(result.rejected[0], /overtime goes on work days only/);
    assert.match(result.rejected[1], /only a work day can also have travel/);
    assert.deepEqual(result.fields.painted.get("2026-11-05"), {
      type: "travel",
    });
    assert.equal(result.fields.painted.has("2026-11-06"), false);
    assert.deepEqual(result.fields.painted.get("2026-11-07"), { type: "work" });
  });

  it("needs a type for a date that isn't painted yet", () => {
    const result = applyEditorEdits(
      fields(),
      edit({ days: [{ date: "2026-11-05", overtimeHours: 2 }] }),
      clients,
    );
    assert.match(result.rejected[0], /isn't painted yet/);
    assert.equal(result.fields.painted.size, 0);
  });

  it("clears dates, and marks days off inside the job", () => {
    const result = applyEditorEdits(
      fields(
        new Map([
          ["2026-11-04", { type: "work" as const }],
          ["2026-11-05", { type: "work" as const }],
        ]),
      ),
      edit({
        days: [
          { date: "2026-11-04", type: "clear" },
          { date: "2026-11-05", type: "off" },
          { date: "2026-11-09", type: "clear" },
        ],
      }),
      clients,
    );
    assert.deepEqual(
      [...result.fields.painted.entries()],
      [["2026-11-05", { type: "off" }]],
    );
    assert.deepEqual(result.applied, ["Painted 1 day", "Cleared 1 day"]);
  });

  it("refuses a date that doesn't exist", () => {
    const result = applyEditorEdits(
      fields(),
      edit({ days: [{ date: "2026-02-30", type: "work" }] }),
      clients,
    );
    assert.deepEqual(result.rejected, ["2026-02-30 isn't a real date."]);
  });

  it("changes client only to a saved one", () => {
    const ok = applyEditorEdits(fields(), edit({ clientId: "c2" }), clients);
    assert.equal(ok.fields.clientId, "c2");
    assert.deepEqual(ok.applied, ["Client set to Arena Ltd"]);

    const unknown = applyEditorEdits(
      fields(),
      edit({ clientId: "someone-elses" }),
      clients,
    );
    assert.equal(unknown.fields.clientId, "c1");
    assert.match(unknown.rejected[0], /No saved client/);
  });

  it("sets the job, date and notes, and adds expenses", () => {
    const result = applyEditorEdits(
      fields(),
      edit({
        showName: "AAA Guerra",
        invoiceDate: "2026-11-10",
        notes: "Thanks!",
        addExpenses: [{ description: "Taxi", unitPrice: 42.5 }],
      }),
      clients,
    );
    assert.equal(result.fields.showName, "AAA Guerra");
    assert.equal(result.fields.invoiceDate, "2026-11-10");
    assert.equal(result.fields.notes, "Thanks!");
    assert.deepEqual(result.newExpenses, [
      { description: "Taxi", quantity: 1, unitPrice: 42.5 },
    ]);
    assert.equal(result.applied.length, 4);
  });
});

describe("editorEditSchema", () => {
  it("refuses more overtime than the editor allows", () => {
    assert.equal(
      editorEditSchema.safeParse({
        days: [{ date: "2026-11-04", overtimeHours: 20 }],
      }).success,
      false,
    );
  });
});

describe("the snapshot", () => {
  const snapshot = {
    mode: "new",
    invoiceNumber: "INV-2610",
    clientId: "c1",
    clientName: "Lucha Inc",
    showName: "Triplemania 34",
    invoiceDate: "2026-11-01",
    days: [
      { date: "2026-11-03", type: "travel" },
      { date: "2026-11-04", type: "work", alsoTravel: "out", overtimeHours: 2 },
    ],
    expenses: [],
    total: "£1,234.00",
    stillToDo: [],
  };

  it("reads a well-formed snapshot and refuses a malformed one", () => {
    assert.ok(parseEditorSnapshot(snapshot));
    assert.equal(parseEditorSnapshot(undefined), null);
    assert.equal(parseEditorSnapshot({ ...snapshot, mode: "sent" }), null);
    assert.equal(
      parseEditorSnapshot({
        ...snapshot,
        days: Array.from({ length: 121 }, () => snapshot.days[0]),
      }),
      null,
    );
  });

  it("tells the model what's on screen and that nothing is saved", () => {
    const text = describeOpenEditor(parseEditorSnapshot(snapshot)!);
    assert.match(text, /creating new invoice INV-2610/);
    assert.match(text, /2026-11-04 work \+ travel out 2h overtime/);
    assert.match(text, /Total so far: £1,234.00/);
    assert.match(text, /Nothing in it is saved yet/);
    assert.match(text, /editOpenInvoice/);
  });
});
