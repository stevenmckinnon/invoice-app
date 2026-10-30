import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type ExportInvoice,
  buildInvoiceCsv,
  csvCell,
  exportFilename,
  fyBounds,
} from "./invoice-export";

const invoice = (over: Partial<ExportInvoice> = {}): ExportInvoice => ({
  invoiceNumber: "INV-2601",
  invoiceDate: new Date("2026-06-02T00:00:00Z"),
  clientName: "Mallard Productions",
  showName: "Harbour Lights",
  status: "paid",
  currency: "GBP",
  labour: 1050,
  perDiems: 140,
  expenses: 25,
  totalAmount: 1215,
  ...over,
});

describe("tax year bounds", () => {
  it("runs 6 April to the next 6 April, exclusive", () => {
    const { from, to } = fyBounds(2026);
    assert.equal(from.toISOString(), "2026-04-06T00:00:00.000Z");
    assert.equal(to.toISOString(), "2027-04-06T00:00:00.000Z");
  });

  it("puts 5 April in the year that's ending and 6 April in the new one", () => {
    const { to } = fyBounds(2025);
    assert.ok(new Date("2026-04-05T00:00:00Z") < to);
    assert.ok(!(new Date("2026-04-06T00:00:00Z") < to));
  });

  it("names the file after the year", () => {
    assert.equal(exportFilename(2026), "caley-invoices-2026-27.csv");
    assert.equal(exportFilename(1999), "caley-invoices-1999-00.csv");
  });
});

describe("csvCell", () => {
  it("quotes commas, quotes and newlines", () => {
    assert.equal(csvCell("a,b"), '"a,b"');
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
    assert.equal(csvCell("one\ntwo"), '"one\ntwo"');
  });

  it("defuses text a spreadsheet would run as a formula", () => {
    assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
    assert.equal(csvCell("+44 20"), "'+44 20");
    assert.equal(csvCell("@cmd"), "'@cmd");
    assert.equal(csvCell("-1+1"), "'-1+1");
  });

  it("leaves numbers, including negatives, alone", () => {
    assert.equal(csvCell(-12.5), "-12.5");
  });
});

describe("buildInvoiceCsv", () => {
  it("writes a header and one row per invoice, oldest first", () => {
    const csv = buildInvoiceCsv([
      invoice({ invoiceNumber: "INV-2602", invoiceDate: new Date("2026-07-01T00:00:00Z") }),
      invoice(),
    ]);
    const lines = csv.replace("﻿", "").trim().split("\r\n");
    assert.equal(
      lines[0],
      "Invoice number,Invoice date,Client,Job,Status,Currency,Labour,Per diems,Expenses,Total",
    );
    assert.equal(
      lines[1],
      "INV-2601,2026-06-02,Mallard Productions,Harbour Lights,paid,GBP,1050.00,140.00,25.00,1215.00",
    );
    assert.match(lines[2]!, /^INV-2602,2026-07-01,/);
    assert.equal(lines.length, 3);
  });

  it("starts with a byte order mark and uses CRLF line ends", () => {
    const csv = buildInvoiceCsv([invoice()]);
    assert.ok(csv.startsWith("﻿"));
    assert.ok(csv.endsWith("\r\n"));
  });

  it("leaves a missing client blank and guards a hostile job name", () => {
    const csv = buildInvoiceCsv([
      invoice({ clientName: null, showName: '=HYPERLINK("http://x")' }),
    ]);
    const row = csv.trim().split("\r\n")[1]!;
    assert.match(row, /^INV-2601,2026-06-02,,"'=HYPERLINK\(""http:\/\/x""\)",paid/);
  });

  it("is just the header for a year with no invoices", () => {
    const csv = buildInvoiceCsv([]);
    assert.equal(csv.replace("﻿", "").trim().split("\r\n").length, 1);
  });
});
