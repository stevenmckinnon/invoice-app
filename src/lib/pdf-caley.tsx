import { renderDocument } from "@formepdf/core";
import { Document, Fixed, Page, Text, View } from "@formepdf/react";

import { type StripDay, shortDateList, toStripDays } from "@/lib/day-strip";
import { summariseInvoice, type SummaryLine } from "@/lib/invoice-summary";
import type { InvoicePdfInput, calculateInvoiceTotals } from "@/lib/pdf";

/*
 * The "Caley" template: the invoice page's paper, on A4. Same order and the
 * same grouped lines (read through summariseInvoice, so the PDF can't
 * disagree with the page), the same mini schedule. Colours are the page's
 * tokens as flat print-safe hex; the figures sit right-aligned in
 * Helvetica's tabular digits, since formepdf 0.16 can't embed the app's own
 * fonts (a registered TTF is accepted, then ignored for Helvetica).
 */
const INK = "#0F1A24";
const MUTED = "#5C6670";
const RULE = "#E4E1D8";
const PRIMARY = "#1F66A8";
const PRIMARY_TINT = "#DCE8F4";
const WARNING = "#B0610A";
const WARNING_TINT = "#F6E3CC";

const MARGIN = 44;
const CELL = 20;

const dayMonth = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const Eyebrow = ({ children }: { children: string }) => (
  <Text
    style={{
      fontSize: 7,
      fontWeight: "bold",
      color: MUTED,
      letterSpacing: 1.2,
      marginBottom: 5,
    }}
  >
    {children.toUpperCase()}
  </Text>
);

const Block = ({ lines }: { lines: Array<string | undefined> }) => (
  <View>
    {lines
      .map((line) => line?.trim())
      .filter(Boolean)
      .map((line, i) => (
        <Text key={i} style={{ fontSize: 9, color: MUTED, lineHeight: 1.45 }}>
          {line}
        </Text>
      ))}
  </View>
);

/** One day as a block, with its overtime stood on top */
const ScheduleDay = ({
  day,
  overtime,
}: {
  day: StripDay;
  overtime: number;
}) => {
  const fill =
    day.type === "work"
      ? { backgroundColor: PRIMARY }
      : day.type === "travel"
        ? {
            backgroundColor: PRIMARY_TINT,
            borderWidth: 0.75,
            borderColor: PRIMARY,
          }
        : day.type === "dark"
          ? { borderWidth: 0.75, borderColor: MUTED }
          : { borderBottomWidth: 0.75, borderColor: RULE };
  return (
    <View style={{ width: CELL, marginRight: 3, marginBottom: 6 }}>
      <View style={{ height: 9, justifyContent: "flex-end" }}>
        {overtime > 0 && (
          <View
            style={{
              height: Math.min(8, 2 + overtime * 1.2),
              backgroundColor: WARNING_TINT,
              borderWidth: 0.75,
              borderColor: WARNING,
            }}
          />
        )}
      </View>
      <View
        style={{
          height: 9,
          flexDirection: day.alsoTravel === "home" ? "row-reverse" : "row",
          ...fill,
        }}
      >
        {day.alsoTravel && (
          <View style={{ width: 5, backgroundColor: PRIMARY_TINT }} />
        )}
      </View>
      <Text
        style={{
          fontSize: 6.5,
          color: MUTED,
          textAlign: "center",
          marginTop: 2,
        }}
      >
        {Number(day.date.slice(8, 10))}
      </Text>
    </View>
  );
};

const Legend = () => (
  <View style={{ flexDirection: "row", marginTop: 2 }}>
    {[
      ["Work", { backgroundColor: PRIMARY }],
      [
        "Travel",
        {
          backgroundColor: PRIMARY_TINT,
          borderWidth: 0.75,
          borderColor: PRIMARY,
        },
      ],
      ["Dark", { borderWidth: 0.75, borderColor: MUTED }],
      [
        "Overtime",
        {
          backgroundColor: WARNING_TINT,
          borderWidth: 0.75,
          borderColor: WARNING,
        },
      ],
    ].map(([label, swatch]) => (
      <View
        key={label as string}
        style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}
      >
        <View
          style={{ width: 8, height: 6, marginRight: 4, ...(swatch as object) }}
        />
        <Text style={{ fontSize: 7, color: MUTED }}>{label as string}</Text>
      </View>
    ))}
  </View>
);

const COLS = { qty: 52, rate: 66, amount: 80 };

const Cell = ({
  children,
  width,
  muted,
  bold,
}: {
  children: string;
  width: number;
  muted?: boolean;
  bold?: boolean;
}) => (
  <Text
    style={{
      width,
      textAlign: "right",
      fontSize: 9,
      fontWeight: bold ? "bold" : "normal",
      color: muted ? MUTED : INK,
    }}
  >
    {children}
  </Text>
);

const LineGroup = ({
  title,
  lines,
  fmt,
}: {
  title: string;
  lines: SummaryLine[];
  fmt: Intl.NumberFormat;
}) =>
  lines.length ? (
    <View style={{ marginTop: 14 }}>
      <Eyebrow>{title}</Eyebrow>
      {lines.map((line, i) => (
        <View
          key={i}
          wrap={false}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            paddingVertical: 4.5,
            borderTopWidth: 0.5,
            borderColor: RULE,
          }}
        >
          <Text style={{ flex: 1, fontSize: 9, color: INK, paddingRight: 10 }}>
            {line.description}
            {line.dates?.length ? (
              <Text style={{ color: MUTED }}>
                {" · "}
                {shortDateList(line.dates)}
              </Text>
            ) : (
              ""
            )}
          </Text>
          <Cell width={COLS.qty}>{`${line.qty}${line.unit ?? ""}`}</Cell>
          <Cell width={COLS.rate} muted>
            {fmt.format(line.rate)}
          </Cell>
          <Cell width={COLS.amount}>{fmt.format(line.amount)}</Cell>
        </View>
      ))}
    </View>
  ) : null;

export const generateCaleyInvoicePdf = async (
  input: InvoicePdfInput,
  totals: ReturnType<typeof calculateInvoiceTotals>,
): Promise<Uint8Array> => {
  const fmt = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: totals.currency,
  });

  const storedDays = input.days ?? [];
  const summary = summariseInvoice({
    items: totals.items,
    overtimeEntries: totals.overtimeEntries,
    customExpenseEntries: totals.customExpenseEntries,
    days: storedDays,
    terms: input.terms,
  });
  const days = toStripDays(storedDays);
  const overtime = new Map<string, number>();
  for (const e of totals.overtimeEntries) {
    const date = e.date.toISOString().slice(0, 10);
    overtime.set(date, (overtime.get(date) ?? 0) + e.hours);
  }

  const payment = [
    ["IBAN", input.iban],
    ["SWIFT / BIC", input.swiftBic],
    ["Account no.", input.accountNumber],
    ["Sort code", input.sortCode],
    ["Bank address", input.bankAddress],
  ].filter(([, value]) => value);

  const groups = [
    summary.labour,
    summary.perDiems,
    summary.other,
    summary.expenses,
  ];

  const doc = (
    <Document title={`Invoice ${input.invoiceNumber}`} author={input.fullName}>
      <Page size="A4" margin={0}>
        <Fixed position="footer">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: MARGIN,
              paddingBottom: 20,
            }}
          >
            <Text style={{ fontSize: 7.5, color: MUTED }}>
              {input.invoiceNumber} · {input.fullName}
            </Text>
            <Text style={{ fontSize: 7.5, color: MUTED }}>
              Page {"{{pageNumber}}"} of {"{{totalPages}}"}
            </Text>
          </View>
        </Fixed>

        <View style={{ paddingHorizontal: MARGIN, paddingTop: MARGIN }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View>
              <Eyebrow>Invoice</Eyebrow>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: INK }}>
                {input.invoiceNumber}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: INK }}>
                {input.fullName}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Block
                  lines={[
                    input.email,
                    input.addressLine1,
                    input.addressLine2,
                    [input.city, input.state, input.postalCode]
                      .filter(Boolean)
                      .join(", "),
                    input.country,
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", marginTop: 20 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow>Billed to</Eyebrow>
              {input.clientName ? (
                <>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: INK }}>
                    {input.clientName}
                  </Text>
                  <Block
                    lines={[
                      input.attentionTo
                        ? `Attn: ${input.attentionTo}`
                        : undefined,
                      input.clientAddress1,
                      input.clientAddress2,
                      [
                        input.clientCity,
                        input.clientState,
                        input.clientPostalCode,
                      ]
                        .filter(Boolean)
                        .join(", "),
                      input.clientCountry,
                    ]}
                  />
                </>
              ) : (
                <Text style={{ fontSize: 9, color: MUTED }}>—</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow>Project</Eyebrow>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: INK }}>
                {input.showName}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow>Date</Eyebrow>
              <Text style={{ fontSize: 9, color: INK }}>
                {dayMonth(input.invoiceDate.toISOString().slice(0, 10))}
              </Text>
            </View>
          </View>

          {days.length > 0 && (
            <View style={{ marginTop: 18 }} wrap={false}>
              <Eyebrow>Schedule</Eyebrow>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {days.map((day) => (
                  <ScheduleDay
                    key={day.date}
                    day={day}
                    overtime={overtime.get(day.date) ?? 0}
                  />
                ))}
              </View>
              <Legend />
            </View>
          )}

          <LineGroup title="Labour" lines={summary.labour} fmt={fmt} />
          <LineGroup title="Per diems" lines={summary.perDiems} fmt={fmt} />
          <LineGroup title="Other" lines={summary.other} fmt={fmt} />
          <LineGroup title="Expenses" lines={summary.expenses} fmt={fmt} />
          {groups.every((g) => !g.length) && (
            <Text style={{ fontSize: 9, color: MUTED, marginTop: 16 }}>
              Nothing billed on this invoice.
            </Text>
          )}

          <View
            wrap={false}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1.5,
              borderColor: INK,
            }}
          >
            <Text
              style={{
                fontSize: 7.5,
                fontWeight: "bold",
                color: INK,
                letterSpacing: 1.2,
              }}
            >
              TOTAL DUE
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: INK }}>
              {fmt.format(totals.totalAmount)}
            </Text>
          </View>

          {input.notes && (
            <View style={{ marginTop: 18 }} wrap={false}>
              <Eyebrow>Notes</Eyebrow>
              <Text style={{ fontSize: 9, color: INK, lineHeight: 1.45 }}>
                {input.notes}
              </Text>
            </View>
          )}

          {payment.length > 0 && (
            <View
              wrap={false}
              style={{
                marginTop: 16,
                paddingTop: 10,
                borderTopWidth: 0.5,
                borderColor: RULE,
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              <View style={{ width: "33%", marginBottom: 6 }}>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: INK }}>
                  Pay to
                </Text>
                <Text style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>
                  {input.fullName}
                </Text>
              </View>
              {payment.map(([label, value]) => (
                <View key={label} style={{ width: "33%", marginBottom: 6 }}>
                  <Text style={{ fontSize: 8, fontWeight: "bold", color: INK }}>
                    {label}
                  </Text>
                  <Text style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );

  return renderDocument(doc);
};
