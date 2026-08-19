import { renderDocument } from "@formepdf/core";
import { Document, Page, View, Text, Table, Row, Cell, Fixed } from "@formepdf/react";

import { deriveOvertimeHourlyRate, overtimeEntryCost } from "@/lib/overtime";

// Helper to format date without timezone conversion
const formatDateGB = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateGBShort = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return d.toLocaleDateString("en-GB");
};

export type InvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  cost?: number;
};

export type OvertimeEntry = {
  date: Date;
  hours: number;
  rateType: "1.5x" | "2x";
  description?: string;
};

export type CustomExpenseEntry = {
  description: string;
  quantity: number;
  unitPrice: number;
  cost: number;
};

export type InvoicePdfInput = {
  invoiceNumber: string;
  invoiceDate: Date;
  showName: string;

  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;

  // Client
  clientName?: string;
  clientAddress1?: string;
  clientAddress2?: string;
  clientCity?: string;
  clientState?: string;
  clientPostalCode?: string;
  clientCountry?: string;
  attentionTo?: string;

  iban: string;
  swiftBic: string;
  accountNumber?: string;
  sortCode?: string;
  bankAddress?: string;
  dateOfBirth?: string | Date;
  currency?: string;

  // Itemized lines
  items: InvoiceLine[];
  overtimeEntries: OvertimeEntry[];
  customExpenseEntries: CustomExpenseEntry[];

  notes?: string;
};

export const calculateInvoiceTotals = (input: InvoicePdfInput) => {
  const currency = input.currency || "GBP";
  const regularRate = deriveOvertimeHourlyRate(input.items);

  const normalized = input.items.map((it) => ({
    ...it,
    cost: typeof it.cost === "number" ? it.cost : it.quantity * it.unitPrice,
  }));

  const overtimeTotal = input.overtimeEntries.reduce(
    (sum, entry) => sum + overtimeEntryCost(entry, regularRate),
    0,
  );

  const customExpensesTotal = input.customExpenseEntries.reduce(
    (sum, entry) => sum + entry.cost,
    0,
  );

  const subtotalLabor = 0;
  const subtotalPerDiem = 0;
  const subtotalTravel = 0;
  const itemsTotal = normalized.reduce((sum, it) => sum + (it.cost ?? 0), 0);
  const totalAmount = itemsTotal + overtimeTotal + customExpensesTotal;

  return {
    currency,
    regularRate,
    items: normalized,
    overtimeEntries: input.overtimeEntries,
    customExpenseEntries: input.customExpenseEntries,
    itemsTotal,
    overtimeTotal,
    customExpensesTotal,
    subtotalLabor,
    subtotalPerDiem,
    subtotalTravel,
    totalAmount,
  };
};

export type PdfTemplate = "classic" | "modern" | "minimal";


// Modern template — sidebar layout with an accent-colored header block.
const generateModernInvoicePdf = async (
  input: InvoicePdfInput,
  totals: ReturnType<typeof calculateInvoiceTotals>,
): Promise<Uint8Array> => {
  const accentColor = "#B36633"; // rgb(0.7, 0.4, 0.2)
  const secondaryColor = "#F2F2F7"; // rgb(0.95, 0.95, 0.97)
  const textColor = "#262626"; // rgb(0.15, 0.15, 0.15)
  const mutedTextColor = "#808080"; // rgb(0.5, 0.5, 0.5)
  const borderColor = "#E6E6E6"; // rgb(0.9, 0.9, 0.9)

  const fmt = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: totals.currency,
  });

  const lineItems = totals.items.filter((item) => item.quantity > 0);

  const doc = (
    <Document title={`Invoice ${input.invoiceNumber}`} author={input.fullName}>
      <Page size="A4" margin={0}>
        <Fixed position="footer">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 25,
              paddingTop: 8,
              paddingBottom: 16,
            }}
          >
            <Text style={{ fontSize: 8, color: mutedTextColor }}>
              {input.fullName}
            </Text>
            <Text style={{ fontSize: 8, color: mutedTextColor }}>
              Page {"{{pageNumber}}"} of {"{{totalPages}}"}
            </Text>
          </View>
        </Fixed>

        <View style={{ flexDirection: "row", minHeight: 300 }}>
          <View style={{ width: 170, backgroundColor: secondaryColor }}>
            <View
              style={{
                backgroundColor: accentColor,
                paddingHorizontal: 25,
                paddingTop: 45,
                paddingBottom: 20,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: "bold", color: "#ffffff" }}>
                INVOICE
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "bold", color: "#ffffff", marginTop: 12 }}
              >
                {`#${input.invoiceNumber}`}
              </Text>
              <Text style={{ fontSize: 10, color: "#f2f2f2", marginTop: 4 }}>
                {formatDateGB(input.invoiceDate)}
              </Text>
            </View>

            <View style={{ paddingHorizontal: 25, paddingTop: 40 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: textColor }}>
                PAYMENT
              </Text>
              <Text
                style={{ fontSize: 10, fontWeight: "bold", color: textColor, marginBottom: 4 }}
              >
                DETAILS
              </Text>

              <Text
                style={{ fontSize: 7, fontWeight: "bold", color: mutedTextColor, marginTop: 12 }}
              >
                IBAN
              </Text>
              <Text style={{ fontSize: 8, color: textColor, marginTop: 2 }}>
                {input.iban}
              </Text>

              <Text
                style={{ fontSize: 7, fontWeight: "bold", color: mutedTextColor, marginTop: 8 }}
              >
                SWIFT/BIC
              </Text>
              <Text style={{ fontSize: 8, color: textColor, marginTop: 2 }}>
                {input.swiftBic}
              </Text>

              {input.accountNumber && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: mutedTextColor }}>
                    ACCOUNT
                  </Text>
                  <Text style={{ fontSize: 8, color: textColor, marginTop: 2 }}>
                    {input.accountNumber}
                  </Text>
                </View>
              )}

              {input.sortCode && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: mutedTextColor }}>
                    SORT CODE
                  </Text>
                  <Text style={{ fontSize: 8, color: textColor, marginTop: 2 }}>
                    {input.sortCode}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ flex: 1, paddingHorizontal: 30, paddingTop: 32, paddingBottom: 20 }}>
            {input.showName && (
              <Text
                style={{ fontSize: 20, fontWeight: "bold", color: accentColor, marginBottom: 20 }}
              >
                {input.showName.toUpperCase()}
              </Text>
            )}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <View style={{ width: "45%" }}>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: mutedTextColor }}>
                  FROM
                </Text>
                <Text
                  style={{ fontSize: 11, fontWeight: "bold", color: textColor, marginTop: 6 }}
                >
                  {input.fullName}
                </Text>
                <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                  {input.email}
                </Text>
                <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                  {input.addressLine1}
                </Text>
                {input.addressLine2 && (
                  <Text style={{ fontSize: 9, color: textColor }}>{input.addressLine2}</Text>
                )}
                <Text style={{ fontSize: 9, color: textColor }}>
                  {input.city}
                  {input.state ? `, ${input.state}` : ""} {input.postalCode}
                </Text>
                <Text style={{ fontSize: 9, color: textColor }}>{input.country}</Text>
                {input.dateOfBirth && (
                  <Text style={{ fontSize: 8, color: mutedTextColor, marginTop: 6 }}>
                    {`DOB: ${formatDateGBShort(input.dateOfBirth)}`}
                  </Text>
                )}
              </View>
              <View style={{ width: "45%" }}>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: mutedTextColor }}>
                  TO
                </Text>
                {input.clientName && (
                  <Text
                    style={{ fontSize: 11, fontWeight: "bold", color: textColor, marginTop: 6 }}
                  >
                    {input.clientName}
                  </Text>
                )}
                {input.attentionTo && (
                  <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                    {`Attn: ${input.attentionTo}`}
                  </Text>
                )}
                {input.clientAddress1 && (
                  <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                    {input.clientAddress1}
                  </Text>
                )}
                {input.clientAddress2 && (
                  <Text style={{ fontSize: 9, color: textColor }}>{input.clientAddress2}</Text>
                )}
                {(input.clientCity || input.clientState || input.clientPostalCode) && (
                  <Text style={{ fontSize: 9, color: textColor }}>
                    {[input.clientCity, input.clientState, input.clientPostalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                )}
                {input.clientCountry && (
                  <Text style={{ fontSize: 9, color: textColor }}>{input.clientCountry}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Table lives outside the sidebar row: a Table forced to paginate
            inside a flex row pushes the whole row (and this table) onto the
            next page, leaving the first page blank. Indenting to align under
            the sidebar keeps the visual continuity without that bug. */}
        <View style={{ paddingLeft: 200, paddingRight: 50, paddingTop: 20 }}>
          <Table style={{ marginBottom: 20 }}>
              <Row header style={{ backgroundColor: secondaryColor }}>
                <Cell
                  style={{
                    width: "48%",
                    padding: 6,
                    fontSize: 9,
                    fontWeight: "bold",
                    color: textColor,
                  }}
                >
                  Description
                </Cell>
                <Cell
                  style={{ width: "14%", padding: 6, fontSize: 9, fontWeight: "bold", color: textColor }}
                >
                  Qty
                </Cell>
                <Cell
                  style={{ width: "19%", padding: 6, fontSize: 9, fontWeight: "bold", color: textColor }}
                >
                  Rate
                </Cell>
                <Cell
                  style={{
                    width: "19%",
                    padding: 6,
                    fontSize: 9,
                    fontWeight: "bold",
                    color: textColor,
                    textAlign: "right",
                  }}
                >
                  Amount
                </Cell>
              </Row>
              {lineItems.map((item, i) => (
                <Row key={`item-${i}`} style={{ borderBottomWidth: 0.5, borderColor }}>
                  <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                    {item.description}
                  </Cell>
                  <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                    {item.quantity}
                  </Cell>
                  <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                    {fmt.format(item.unitPrice)}
                  </Cell>
                  <Cell
                    style={{ padding: 6, fontSize: 9, color: textColor, textAlign: "right" }}
                  >
                    {fmt.format(item.cost ?? item.quantity * item.unitPrice)}
                  </Cell>
                </Row>
              ))}
              {totals.overtimeEntries.map((entry, i) => {
                const multiplier = entry.rateType === "1.5x" ? 1.5 : 2;
                const hourlyRate = totals.regularRate * multiplier;
                const cost = entry.hours * hourlyRate;
                return (
                  <Row key={`ot-${i}`} style={{ borderBottomWidth: 0.5, borderColor }}>
                    <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                      {`Overtime ${entry.rateType} - ${formatDateGBShort(entry.date)}`}
                    </Cell>
                    <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                      {`${entry.hours}h`}
                    </Cell>
                    <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                      {fmt.format(hourlyRate)}
                    </Cell>
                    <Cell
                      style={{ padding: 6, fontSize: 9, color: textColor, textAlign: "right" }}
                    >
                      {fmt.format(cost)}
                    </Cell>
                  </Row>
                );
              })}
              {totals.customExpenseEntries.map((entry, i) => (
                <Row key={`exp-${i}`} style={{ borderBottomWidth: 0.5, borderColor }}>
                  <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                    {entry.description}
                  </Cell>
                  <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                    {entry.quantity}
                  </Cell>
                  <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                    {fmt.format(entry.unitPrice)}
                  </Cell>
                  <Cell
                    style={{ padding: 6, fontSize: 9, color: textColor, textAlign: "right" }}
                  >
                    {fmt.format(entry.cost)}
                  </Cell>
                </Row>
              ))}
            </Table>

            <View style={{ alignItems: "flex-end", marginBottom: 24 }}>
              <View style={{ width: 220 }}>
                {totals.itemsTotal > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 9, color: mutedTextColor }}>
                      Items Subtotal
                    </Text>
                    <Text style={{ fontSize: 9, color: textColor }}>
                      {fmt.format(totals.itemsTotal)}
                    </Text>
                  </View>
                )}
                {totals.overtimeTotal > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 9, color: mutedTextColor }}>
                      Overtime Subtotal
                    </Text>
                    <Text style={{ fontSize: 9, color: textColor }}>
                      {fmt.format(totals.overtimeTotal)}
                    </Text>
                  </View>
                )}
                {totals.customExpensesTotal > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 9, color: mutedTextColor }}>
                      Expenses Subtotal
                    </Text>
                    <Text style={{ fontSize: 9, color: textColor }}>
                      {fmt.format(totals.customExpensesTotal)}
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    backgroundColor: accentColor,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "bold", color: "#ffffff" }}>
                    TOTAL
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: "#ffffff" }}>
                    {fmt.format(totals.totalAmount)}
                  </Text>
                </View>
              </View>
            </View>

          {input.notes && (
            <View>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: accentColor }}>
                Notes
              </Text>
              <Text style={{ fontSize: 9, color: textColor, marginTop: 6 }}>
                {input.notes}
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );

  return renderDocument(doc);
};

// Minimal template — clean lines and separators, no color blocks.
const generateMinimalInvoicePdf = async (
  input: InvoicePdfInput,
  totals: ReturnType<typeof calculateInvoiceTotals>,
): Promise<Uint8Array> => {
  const textColor = "#1A1A1A"; // rgb(0.1, 0.1, 0.1)
  const mutedTextColor = "#666666"; // rgb(0.4, 0.4, 0.4)
  const lineColor = "#BFBFBF"; // rgb(0.75, 0.75, 0.75)
  const subtleLineColor = "#E6E6E6"; // rgb(0.9, 0.9, 0.9)

  const fmt = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: totals.currency,
  });

  const lineItems = totals.items.filter((item) => item.quantity > 0);

  const doc = (
    <Document title={`Invoice ${input.invoiceNumber}`} author={input.fullName}>
      <Page size="A4" margin={0}>
        <Fixed position="footer">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 60,
              paddingTop: 8,
              paddingBottom: 20,
            }}
          >
            <Text style={{ fontSize: 8, color: mutedTextColor }}>
              {input.fullName}
            </Text>
            <Text style={{ fontSize: 8, color: mutedTextColor }}>
              Page {"{{pageNumber}}"} of {"{{totalPages}}"}
            </Text>
          </View>
        </Fixed>

        <View style={{ paddingHorizontal: 60, paddingTop: 60 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingBottom: 16,
              borderBottomWidth: 0.5,
              borderColor: lineColor,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: "bold", color: textColor }}>
              INVOICE
            </Text>
            <Text style={{ fontSize: 12, color: mutedTextColor }}>
              {`#${input.invoiceNumber}`}
            </Text>
          </View>

          <View style={{ marginTop: 24 }}>
            {input.showName && (
              <Text
                style={{ fontSize: 16, fontWeight: "bold", color: textColor, marginBottom: 24 }}
              >
                {input.showName}
              </Text>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ width: "45%" }}>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: mutedTextColor }}>
                  From
                </Text>
                <Text
                  style={{ fontSize: 10, fontWeight: "bold", color: textColor, marginTop: 6 }}
                >
                  {input.fullName}
                </Text>
                <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                  {input.email}
                </Text>
                <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                  {input.addressLine1}
                </Text>
                {input.addressLine2 && (
                  <Text style={{ fontSize: 9, color: textColor }}>{input.addressLine2}</Text>
                )}
                <Text style={{ fontSize: 9, color: textColor }}>
                  {input.city}
                  {input.state ? `, ${input.state}` : ""} {input.postalCode}
                </Text>
                <Text style={{ fontSize: 9, color: textColor }}>{input.country}</Text>
                {input.dateOfBirth && (
                  <Text style={{ fontSize: 8, color: mutedTextColor, marginTop: 4 }}>
                    {`DOB: ${formatDateGBShort(input.dateOfBirth)}`}
                  </Text>
                )}
              </View>
              <View style={{ width: "45%" }}>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: mutedTextColor }}>
                  To
                </Text>
                {input.clientName && (
                  <Text
                    style={{ fontSize: 10, fontWeight: "bold", color: textColor, marginTop: 6 }}
                  >
                    {input.clientName}
                  </Text>
                )}
                {input.attentionTo && (
                  <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                    {`Attn: ${input.attentionTo}`}
                  </Text>
                )}
                {input.clientAddress1 && (
                  <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                    {input.clientAddress1}
                  </Text>
                )}
                {input.clientAddress2 && (
                  <Text style={{ fontSize: 9, color: textColor }}>{input.clientAddress2}</Text>
                )}
                {(input.clientCity || input.clientState || input.clientPostalCode) && (
                  <Text style={{ fontSize: 9, color: textColor }}>
                    {[input.clientCity, input.clientState, input.clientPostalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                )}
                {input.clientCountry && (
                  <Text style={{ fontSize: 9, color: textColor }}>{input.clientCountry}</Text>
                )}
              </View>
            </View>

            <View
              style={{
                marginTop: 24,
                paddingTop: 16,
                borderTopWidth: 0.5,
                borderColor: subtleLineColor,
              }}
            >
              <Text style={{ fontSize: 9, color: mutedTextColor }}>
                {`Date: ${formatDateGB(input.invoiceDate)}`}
              </Text>
            </View>

            <Table style={{ marginTop: 16 }}>
              <Row header style={{ borderBottomWidth: 0.5, borderColor: lineColor }}>
                <Cell
                  style={{ width: "48%", paddingVertical: 6, fontSize: 9, fontWeight: "bold", color: textColor }}
                >
                  Description
                </Cell>
                <Cell
                  style={{ width: "14%", paddingVertical: 6, fontSize: 9, fontWeight: "bold", color: textColor }}
                >
                  Qty
                </Cell>
                <Cell
                  style={{ width: "19%", paddingVertical: 6, fontSize: 9, fontWeight: "bold", color: textColor }}
                >
                  Rate
                </Cell>
                <Cell
                  style={{
                    width: "19%",
                    paddingVertical: 6,
                    fontSize: 9,
                    fontWeight: "bold",
                    color: textColor,
                    textAlign: "right",
                  }}
                >
                  Amount
                </Cell>
              </Row>
              {lineItems.map((item, i) => (
                <Row key={`item-${i}`} style={{ borderBottomWidth: 0.3, borderColor: subtleLineColor }}>
                  <Cell style={{ paddingVertical: 6, fontSize: 9, color: textColor }}>
                    {item.description}
                  </Cell>
                  <Cell style={{ paddingVertical: 6, fontSize: 9, color: textColor }}>
                    {item.quantity}
                  </Cell>
                  <Cell style={{ paddingVertical: 6, fontSize: 9, color: textColor }}>
                    {fmt.format(item.unitPrice)}
                  </Cell>
                  <Cell
                    style={{ paddingVertical: 6, fontSize: 9, color: textColor, textAlign: "right" }}
                  >
                    {fmt.format(item.cost ?? item.quantity * item.unitPrice)}
                  </Cell>
                </Row>
              ))}
              {totals.overtimeEntries.map((entry, i) => {
                const multiplier = entry.rateType === "1.5x" ? 1.5 : 2;
                const hourlyRate = totals.regularRate * multiplier;
                const cost = entry.hours * hourlyRate;
                return (
                  <Row key={`ot-${i}`} style={{ borderBottomWidth: 0.3, borderColor: subtleLineColor }}>
                    <Cell style={{ paddingVertical: 6, fontSize: 9, color: textColor }}>
                      {`Overtime ${entry.rateType} - ${formatDateGBShort(entry.date)}`}
                    </Cell>
                    <Cell style={{ paddingVertical: 6, fontSize: 9, color: textColor }}>
                      {`${entry.hours}h`}
                    </Cell>
                    <Cell style={{ paddingVertical: 6, fontSize: 9, color: textColor }}>
                      {fmt.format(hourlyRate)}
                    </Cell>
                    <Cell
                      style={{ paddingVertical: 6, fontSize: 9, color: textColor, textAlign: "right" }}
                    >
                      {fmt.format(cost)}
                    </Cell>
                  </Row>
                );
              })}
              {totals.customExpenseEntries.map((entry, i) => (
                <Row key={`exp-${i}`} style={{ borderBottomWidth: 0.3, borderColor: subtleLineColor }}>
                  <Cell style={{ paddingVertical: 6, fontSize: 9, color: textColor }}>
                    {entry.description}
                  </Cell>
                  <Cell style={{ paddingVertical: 6, fontSize: 9, color: textColor }}>
                    {entry.quantity}
                  </Cell>
                  <Cell style={{ paddingVertical: 6, fontSize: 9, color: textColor }}>
                    {fmt.format(entry.unitPrice)}
                  </Cell>
                  <Cell
                    style={{ paddingVertical: 6, fontSize: 9, color: textColor, textAlign: "right" }}
                  >
                    {fmt.format(entry.cost)}
                  </Cell>
                </Row>
              ))}
            </Table>

            <View style={{ alignItems: "flex-end", marginTop: 16 }}>
              <View style={{ width: 220 }}>
                {totals.itemsTotal > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 9, color: mutedTextColor }}>
                      Items Subtotal
                    </Text>
                    <Text style={{ fontSize: 9, color: textColor }}>
                      {fmt.format(totals.itemsTotal)}
                    </Text>
                  </View>
                )}
                {totals.overtimeTotal > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 9, color: mutedTextColor }}>
                      Overtime Subtotal
                    </Text>
                    <Text style={{ fontSize: 9, color: textColor }}>
                      {fmt.format(totals.overtimeTotal)}
                    </Text>
                  </View>
                )}
                {totals.customExpensesTotal > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 9, color: mutedTextColor }}>
                      Expenses Subtotal
                    </Text>
                    <Text style={{ fontSize: 9, color: textColor }}>
                      {fmt.format(totals.customExpensesTotal)}
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingTop: 10,
                    marginTop: 6,
                    borderTopWidth: 0.5,
                    borderColor: lineColor,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: textColor }}>
                    Total
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: textColor }}>
                    {fmt.format(totals.totalAmount)}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                marginTop: 32,
                paddingTop: 16,
                borderTopWidth: 0.5,
                borderColor: subtleLineColor,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "bold", color: textColor }}>
                Payment Details
              </Text>
              <Text style={{ fontSize: 8, color: textColor, marginTop: 8 }}>
                {`IBAN: ${input.iban}`}
              </Text>
              <Text style={{ fontSize: 8, color: textColor, marginTop: 4 }}>
                {`SWIFT/BIC: ${input.swiftBic}`}
              </Text>
              {input.accountNumber && (
                <Text style={{ fontSize: 8, color: textColor, marginTop: 4 }}>
                  {`Account Number: ${input.accountNumber}`}
                </Text>
              )}
              {input.sortCode && (
                <Text style={{ fontSize: 8, color: textColor, marginTop: 4 }}>
                  {`Sort Code: ${input.sortCode}`}
                </Text>
              )}
              {input.bankAddress && (
                <Text style={{ fontSize: 8, color: textColor, marginTop: 4 }}>
                  {`Bank Address: ${input.bankAddress}`}
                </Text>
              )}
            </View>

            {input.notes && (
              <View
                style={{
                  marginTop: 20,
                  paddingTop: 16,
                  borderTopWidth: 0.5,
                  borderColor: subtleLineColor,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: "bold", color: textColor }}>
                  Notes
                </Text>
                <Text style={{ fontSize: 9, color: textColor, marginTop: 8 }}>
                  {input.notes}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );

  return renderDocument(doc);
};

export const generateInvoicePdf = async (
  input: InvoicePdfInput,
  template: PdfTemplate = "classic",
): Promise<Uint8Array> => {
  const totals = calculateInvoiceTotals(input);

  // Route to appropriate template
  if (template === "modern") {
    return generateModernInvoicePdf(input, totals);
  }

  if (template === "minimal") {
    return generateMinimalInvoicePdf(input, totals);
  }


  return generateClassicInvoicePdf(input, totals);
};

// Classic template.
const generateClassicInvoicePdf = async (
  input: InvoicePdfInput,
  totals: ReturnType<typeof calculateInvoiceTotals>,
): Promise<Uint8Array> => {
  const primaryColor = "#334D80"; // rgb(0.2, 0.3, 0.5)
  const accentColor = "#6680B3"; // rgb(0.4, 0.5, 0.7)
  const textColor = "#333333"; // rgb(0.2, 0.2, 0.2)
  const lightGray = "#F2F2F2"; // rgb(0.95, 0.95, 0.95)
  const borderColor = "#D9D9D9"; // rgb(0.85, 0.85, 0.85)
  const mutedTextColor = "#808080";

  const fmt = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: totals.currency,
  });

  const lineItems = totals.items.filter((item) => item.quantity > 0);

  const doc = (
    <Document title={`Invoice ${input.invoiceNumber}`} author={input.fullName}>
      <Page size="A4" margin={0}>
        <Fixed position="footer">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 50,
              paddingTop: 8,
              paddingBottom: 20,
            }}
          >
            <Text style={{ fontSize: 8, color: mutedTextColor }}>
              {input.fullName}
            </Text>
            <Text style={{ fontSize: 8, color: mutedTextColor }}>
              Page {"{{pageNumber}}"} of {"{{totalPages}}"}
            </Text>
          </View>
        </Fixed>

        <View
          style={{
            backgroundColor: primaryColor,
            paddingHorizontal: 50,
            paddingVertical: 32,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Text style={{ fontSize: 32, fontWeight: "bold", color: "#ffffff" }}>
            INVOICE
          </Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#ffffff" }}>
              #{input.invoiceNumber}
            </Text>
            <Text style={{ fontSize: 10, color: "#e5e7eb", marginTop: 4 }}>
              Date: {formatDateGB(input.invoiceDate)}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 50, paddingTop: 24 }}>
          {input.showName && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: accentColor }}>
                PROJECT
              </Text>
              <Text style={{ fontSize: 11, color: textColor, marginTop: 2 }}>
                {input.showName}
              </Text>
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 30,
            }}
          >
            <View style={{ width: "45%" }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: accentColor }}>
                BILL FROM
              </Text>
              <Text
                style={{ fontSize: 11, fontWeight: "bold", color: textColor, marginTop: 6 }}
              >
                {input.fullName}
              </Text>
              <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                {input.email}
              </Text>
              <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                {input.addressLine1}
              </Text>
              {input.addressLine2 && (
                <Text style={{ fontSize: 9, color: textColor }}>
                  {input.addressLine2}
                </Text>
              )}
              <Text style={{ fontSize: 9, color: textColor }}>
                {input.city}
                {input.state ? `, ${input.state}` : ""} {input.postalCode}
              </Text>
              <Text style={{ fontSize: 9, color: textColor }}>{input.country}</Text>
              {input.dateOfBirth && (
                <Text style={{ fontSize: 8, color: mutedTextColor, marginTop: 6 }}>
                  DOB: {formatDateGBShort(input.dateOfBirth)}
                </Text>
              )}
            </View>
            <View style={{ width: "45%" }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: accentColor }}>
                BILL TO
              </Text>
              {input.clientName && (
                <Text
                  style={{ fontSize: 11, fontWeight: "bold", color: textColor, marginTop: 6 }}
                >
                  {input.clientName}
                </Text>
              )}
              {input.attentionTo && (
                <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                  Attn: {input.attentionTo}
                </Text>
              )}
              {input.clientAddress1 && (
                <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                  {input.clientAddress1}
                </Text>
              )}
              {input.clientAddress2 && (
                <Text style={{ fontSize: 9, color: textColor }}>
                  {input.clientAddress2}
                </Text>
              )}
              {(input.clientCity || input.clientState || input.clientPostalCode) && (
                <Text style={{ fontSize: 9, color: textColor }}>
                  {[input.clientCity, input.clientState, input.clientPostalCode]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              )}
              {input.clientCountry && (
                <Text style={{ fontSize: 9, color: textColor }}>
                  {input.clientCountry}
                </Text>
              )}
            </View>
          </View>

          {/* Items, overtime, and custom expenses share one table — table
              headers repeat automatically if this overflows onto a new page. */}
          <Table style={{ marginBottom: 20 }}>
            <Row header style={{ backgroundColor: lightGray }}>
              <Cell
                style={{
                  width: "48%",
                  padding: 6,
                  fontSize: 9,
                  fontWeight: "bold",
                  color: textColor,
                }}
              >
                DESCRIPTION
              </Cell>
              <Cell
                style={{ width: "14%", padding: 6, fontSize: 9, fontWeight: "bold", color: textColor }}
              >
                QTY
              </Cell>
              <Cell
                style={{ width: "19%", padding: 6, fontSize: 9, fontWeight: "bold", color: textColor }}
              >
                RATE
              </Cell>
              <Cell
                style={{
                  width: "19%",
                  padding: 6,
                  fontSize: 9,
                  fontWeight: "bold",
                  color: textColor,
                  textAlign: "right",
                }}
              >
                AMOUNT
              </Cell>
            </Row>
            {lineItems.map((item, i) => (
              <Row key={`item-${i}`} style={{ borderBottomWidth: 0.5, borderColor }}>
                <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                  {item.description}
                </Cell>
                <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                  {item.quantity}
                </Cell>
                <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                  {fmt.format(item.unitPrice)}
                </Cell>
                <Cell
                  style={{ padding: 6, fontSize: 9, color: textColor, textAlign: "right" }}
                >
                  {fmt.format(item.cost ?? item.quantity * item.unitPrice)}
                </Cell>
              </Row>
            ))}
            {totals.overtimeEntries.map((entry, i) => {
              const multiplier = entry.rateType === "1.5x" ? 1.5 : 2;
              const hourlyRate = totals.regularRate * multiplier;
              const cost = entry.hours * hourlyRate;
              return (
                <Row key={`ot-${i}`} style={{ borderBottomWidth: 0.5, borderColor }}>
                  <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                    {`Overtime ${entry.rateType} - ${formatDateGBShort(entry.date)}`}
                  </Cell>
                  <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                    {`${entry.hours}h`}
                  </Cell>
                  <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                    {fmt.format(hourlyRate)}
                  </Cell>
                  <Cell
                    style={{ padding: 6, fontSize: 9, color: textColor, textAlign: "right" }}
                  >
                    {fmt.format(cost)}
                  </Cell>
                </Row>
              );
            })}
            {totals.customExpenseEntries.map((entry, i) => (
              <Row key={`exp-${i}`} style={{ borderBottomWidth: 0.5, borderColor }}>
                <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                  {entry.description}
                </Cell>
                <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                  {entry.quantity}
                </Cell>
                <Cell style={{ padding: 6, fontSize: 9, color: textColor }}>
                  {fmt.format(entry.unitPrice)}
                </Cell>
                <Cell
                  style={{ padding: 6, fontSize: 9, color: textColor, textAlign: "right" }}
                >
                  {fmt.format(entry.cost)}
                </Cell>
              </Row>
            ))}
          </Table>

          <View style={{ alignItems: "flex-end", marginBottom: 24 }}>
            <View style={{ width: 220 }}>
              {totals.itemsTotal > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 9, color: mutedTextColor }}>
                    Items Subtotal:
                  </Text>
                  <Text style={{ fontSize: 9, color: textColor }}>
                    {fmt.format(totals.itemsTotal)}
                  </Text>
                </View>
              )}
              {totals.overtimeTotal > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 9, color: mutedTextColor }}>
                    Overtime Subtotal:
                  </Text>
                  <Text style={{ fontSize: 9, color: textColor }}>
                    {fmt.format(totals.overtimeTotal)}
                  </Text>
                </View>
              )}
              {totals.customExpensesTotal > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 9, color: mutedTextColor }}>
                    Expenses Subtotal:
                  </Text>
                  <Text style={{ fontSize: 9, color: textColor }}>
                    {fmt.format(totals.customExpensesTotal)}
                  </Text>
                </View>
              )}
              <View
                style={{
                  backgroundColor: primaryColor,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#ffffff" }}>
                  TOTAL
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#ffffff" }}>
                  {fmt.format(totals.totalAmount)}
                </Text>
              </View>
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: accentColor }}>
              PAYMENT DETAILS
            </Text>
            <Text style={{ fontSize: 9, color: textColor, marginTop: 6 }}>
              IBAN: {input.iban}
            </Text>
            <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
              SWIFT/BIC: {input.swiftBic}
            </Text>
            {input.accountNumber && (
              <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                Account Number: {input.accountNumber}
              </Text>
            )}
            {input.sortCode && (
              <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                Sort Code: {input.sortCode}
              </Text>
            )}
            {input.bankAddress && (
              <Text style={{ fontSize: 9, color: textColor, marginTop: 2 }}>
                Bank Address: {input.bankAddress}
              </Text>
            )}
          </View>

          {input.notes && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: accentColor }}>
                NOTES
              </Text>
              <Text style={{ fontSize: 9, color: textColor, marginTop: 6 }}>
                {input.notes}
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );

  return renderDocument(doc);
};
