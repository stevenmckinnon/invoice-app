"use client";

import type { ReactNode } from "react";

import {
  Airplane01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  MinusSignIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  type Act,
  Collapse,
  Count,
  Stage,
  Window,
} from "@/components/stageshow/kit";
import { monthGrid } from "@/lib/day-editor";
import type { SummaryLine } from "@/lib/invoice-summary";

import { type Bill, type Kind, OT_DATE, TERMS, billFor, hoursOf, money, splitText } from "./bill";
import "./caley-demo.css";

// Caley's own editor, painting a job: drag Monday to Thursday as work days,
// switch to Travel for Friday, then give Thursday three hours of overtime. The
// invoice builds beside it from the same billing code the product runs, and
// the total rolls to what the client is owed. The reset is the story leaving
// the way it came: Friday, then each work day, then the overtime.
//
// Real strings: the days painted, the brushes, the month, the overtime split,
// the invoice's job, client and lines. The rest is filler at the edges.

type S = {
  brush: Kind;
  painted: Record<string, Kind>;
  selected: string | null;
  /** What's typed into the overtime field */
  ot: string;
};

const initial: S = { brush: "work", painted: {}, selected: null, ot: "" };

const WORK_DAYS = ["2026-10-12", "2026-10-13", "2026-10-14", OT_DATE];
const TRAVEL_DAY = "2026-10-16";

const POSTER: S = {
  brush: "travel",
  painted: {
    "2026-10-12": "work",
    "2026-10-13": "work",
    "2026-10-14": "work",
    [OT_DATE]: "work",
    [TRAVEL_DAY]: "travel",
  },
  selected: OT_DATE,
  ot: "3",
};

const GRID = monthGrid(2026, 9);
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BRUSHES: { id: string; label: string; kind?: Kind }[] = [
  { id: "work", label: "Work", kind: "work" },
  { id: "worktravel", label: "Work + travel" },
  { id: "travel", label: "Travel", kind: "travel" },
  { id: "dark", label: "Dark" },
  { id: "off", label: "Off" },
];

const find = (lines: SummaryLine[], start: string) =>
  lines.find((line) => line.description.startsWith(start));

/** The six places a line can appear, in the order the paper draws them */
const slots = (bill: Bill) => {
  const { labour, perDiems } = bill.summary;
  const rows = [
    { key: "work", label: "Work days", line: find(labour, "Work days"), rate: TERMS.dayRate },
    { key: "travel", label: "Travel days", line: find(labour, "Travel days"), rate: TERMS.dayRate },
    { key: "ot1", label: "Overtime at 1.5×", line: find(labour, "Overtime at 1.5×"), rate: (TERMS.dayRate / 10) * 1.5, unit: "h" },
    { key: "ot2", label: "Overtime at 2×", line: find(labour, "Overtime at 2×"), rate: (TERMS.dayRate / 10) * 2, unit: "h" },
  ];
  const diems = [
    { key: "pdwork", label: "Work days", line: find(perDiems, "Work days"), rate: TERMS.perDiem.work },
    { key: "pdtravel", label: "Travel days", line: find(perDiems, "Travel days"), rate: TERMS.perDiem.travel },
  ];
  return { rows, diems };
};

function Line({
  label,
  line,
  rate,
  unit,
}: {
  label: string;
  line?: SummaryLine;
  rate: number;
  unit?: string;
}) {
  return (
    <Collapse open={Boolean(line)}>
      <div className="cd-line">
        <span className="cd-line__label">{label}</span>
        <span className="cd-line__calc">
          <Count value={line?.qty ?? 0} format={(n) => `${Math.round(n * 2) / 2}${unit ?? ""}`} />
          <span>× {money(rate)}</span>
        </span>
        <span className="cd-line__amount">
          <Count value={line?.amount ?? 0} format={money} />
        </span>
      </div>
    </Collapse>
  );
}

async function script(a: Act<S>) {
  const day = (iso: string) => `day-${iso}`;
  await a.wait(700);

  // 1. Drag across Monday to Thursday with the Work brush
  a.mark("paint");
  await a.move({ at: day(WORK_DAYS[0]!), x: 0.5, y: 0.55 });
  await a.wait(250);
  const end = a.rect(day(WORK_DAYS[3]!));
  await a.set((s) => ({ painted: { ...s.painted, [WORK_DAYS[0]!]: "work" } }));
  await a.drag({ x: end.x + end.width * 0.5, y: end.y + end.height * 0.55 }, (at) => {
    a.put((s) => {
      const next = { ...s.painted };
      for (const iso of WORK_DAYS) {
        const r = a.rect(day(iso));
        if (at.x >= r.x) next[iso] = "work";
      }
      return { painted: next };
    });
  }, { duration: 1200 });
  await a.wait(900);

  // 2. Friday is a travel day: change the brush, then paint it
  a.mark("travel");
  await a.move({ at: "brush-travel", x: 0.2, y: 0.7 });
  await a.wait(250);
  await a.click();
  await a.set({ brush: "travel" });
  await a.wait(500);
  await a.move({ at: day(TRAVEL_DAY), x: 0.5, y: 0.55 });
  await a.wait(200);
  await a.click();
  await a.set((s) => ({ painted: { ...s.painted, [TRAVEL_DAY]: "travel" } }));
  await a.wait(1000);

  // 3. Thursday ran late: select it and type the hours
  a.mark("overtime");
  await a.set({ brush: "work" });
  await a.move({ at: day(OT_DATE), x: 0.5, y: 0.55 });
  await a.wait(250);
  await a.click();
  await a.set({ selected: OT_DATE });
  await a.wait(700);
  await a.move({ at: "ot-field", x: 0.7, y: 0.55 });
  await a.wait(250);
  await a.click();
  await a.type("ot", "3", { interval: 120 });
  await a.wait(500);
  await a.move("rest");

  // 4. The result holds: the total is what the client is owed
  a.mark("payoff");
  await a.wait(2600);

  // Leave the way it came, so the next loop opens on the empty editor
  await a.set({ selected: null });
  await a.wait(150);
  await a.set({ ot: "" });
  await a.stagger(
    [TRAVEL_DAY, ...[...WORK_DAYS].reverse()],
    (iso) =>
      a.set((s) => {
        const next = { ...s.painted };
        delete next[iso];
        return { painted: next };
      }),
    70,
  );
  await a.set({ brush: "work" });
  await a.wait(300);
}

/** The browser on wide; on a phone the cards sit on the page itself */
function Shell({ compact, children }: { compact: boolean; children: ReactNode }) {
  if (compact) return <div className="cd-win cd-win--bare">{children}</div>;
  return (
    <Window url="caley.app/invoices/new" urlShape="pill" className="cd-win">
      {children}
    </Window>
  );
}

export function CaleyDemo() {
  return (
    <Stage<S>
      width={1000}
      height={640}
      initial={initial}
      poster={POSTER}
      script={script}
      cursor={{ at: "rest" }}
      compact={{ below: 560, width: 358, height: 680 }}
      className="cd"
    >
      {(s, _rect, layout) => {
        const compact = layout === "compact";
        const bill = billFor(s.painted, s.ot);
        const { rows, diems } = slots(bill);
        const hours = hoursOf(s.ot);
        const selectedKind = s.selected ? s.painted[s.selected] : undefined;

        return (
          <div className="cd-mask" data-compact={compact || undefined}>
            <Shell compact={compact}>
              <div className="cd-body">
                <div className="cd-left">
                  <section className="cd-card cd-days" data-target="days">
                    <div className="cd-days__head">
                      <div className="cd-month">
                        <span className="cd-iconbtn">
                          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                        </span>
                        <span className="cd-month__name">October 2026</span>
                        <span className="cd-iconbtn">
                          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                        </span>
                      </div>
                      <div className="cd-brushes">
                        {BRUSHES.filter((b) => !compact || ["work", "travel", "dark"].includes(b.id)).map((b) => (
                          <span
                            key={b.id}
                            className="cd-brush"
                            data-on={(b.kind && s.brush === b.kind) || undefined}
                            data-target={b.kind ? `brush-${b.kind}` : undefined}
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="cd-weekdays">
                      {WEEKDAYS.map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>
                    <div className="cd-grid">
                      {(compact ? GRID.slice(14, 28) : GRID).map((iso) => {
                        const kind = s.painted[iso];
                        const out = !iso.startsWith("2026-10");
                        const overtime = iso === OT_DATE && kind === "work" ? hours : 0;
                        return (
                          <div
                            key={iso}
                            className="cd-day"
                            data-target={`day-${iso}`}
                            data-kind={kind}
                            data-out={out || undefined}
                            data-selected={s.selected === iso || undefined}
                            data-ot={overtime > 0 || undefined}
                          >
                            <span className="cd-day__num">{Number(iso.slice(8))}</span>
                            {kind === "travel" && (
                              <HugeiconsIcon icon={Airplane01Icon} size={14} className="cd-day__plane" />
                            )}
                            {overtime > 0 && <span className="cd-day__ot">+{overtime}h</span>}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <Collapse open={selectedKind === "work"} reveal="drop">
                    <section className="cd-card cd-detail">
                      <p className="cd-detail__date">Thursday 15 October</p>
                      <div className="cd-detail__row">
                        <span className="cd-detail__label">Overtime</span>
                        <div className="cd-stepper">
                          <span className="cd-iconbtn cd-iconbtn--box">
                            <HugeiconsIcon icon={MinusSignIcon} size={14} />
                          </span>
                          <span className="cd-field" data-target="ot-field" data-cursor="ibeam">
                            {s.ot || "0"}
                            <span className="cd-caret" data-on={s.ot === "" || undefined} />
                            <span className="cd-field__unit">h</span>
                          </span>
                          <span className="cd-iconbtn cd-iconbtn--box">
                            <HugeiconsIcon icon={PlusSignIcon} size={14} />
                          </span>
                        </div>
                      </div>
                      <p className="cd-detail__split">{splitText(hours)}</p>
                    </section>
                  </Collapse>

                  <section className="cd-card cd-expenses">
                    <p className="cd-expenses__title">Expenses</p>
                    <span className="cd-ghostbtn">Add expense</span>
                  </section>
                </div>

                <div className="cd-right">
                  <article className="cd-paper">
                    <header className="cd-paper__head">
                      <div>
                        <p className="cd-paper__job">Harbour Lights Pilot</p>
                        <p className="cd-paper__client">Mallard Productions</p>
                      </div>
                      <p className="cd-paper__no">INV-2610</p>
                    </header>

                    <p className="cd-group">Labour</p>
                    {rows.map((row) => (
                      <Line key={row.key} label={row.label} line={row.line} rate={row.rate} unit={row.unit} />
                    ))}
                    <p className="cd-group">Per diems</p>
                    {diems.map((row) => (
                      <Line key={row.key} label={row.label} line={row.line} rate={row.rate} />
                    ))}

                    <div className="cd-total">
                      <span>Total</span>
                      <span className="cd-total__amount" data-target="total">
                        <Count value={bill.total} format={money} />
                      </span>
                    </div>
                  </article>
                  <section className="cd-card cd-notes">
                    <p className="cd-notes__title">Notes</p>
                    <span className="cd-bar" style={{ width: "86%" }} />
                    <span className="cd-bar" style={{ width: "62%" }} />
                    <span className="cd-bar" style={{ width: "74%" }} />
                  </section>
                </div>
              </div>
            </Shell>
            <span data-target="rest" className="cd-rest" />
          </div>
        );
      }}
    </Stage>
  );
}
