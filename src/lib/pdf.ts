import { PDFDocument, StandardFonts, rgb, RGB } from "pdf-lib";

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
  const regularRate = 52.5; // £52.50 per hour base rate

  const normalized = input.items.map((it) => ({
    ...it,
    cost: typeof it.cost === "number" ? it.cost : it.quantity * it.unitPrice,
  }));

  const overtimeTotal = input.overtimeEntries.reduce((sum, entry) => {
    const multiplier = entry.rateType === "1.5x" ? 1.5 : 2;
    const hourlyRate = regularRate * multiplier;
    return sum + entry.hours * hourlyRate;
  }, 0);

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

// Alternative modern template with elegant design
const generateModernInvoicePdf = async (
  input: InvoicePdfInput,
  totals: ReturnType<typeof calculateInvoiceTotals>,
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Modern color scheme - warmer, elegant palette
  const primaryColor: RGB = rgb(0.15, 0.15, 0.2); // Deep charcoal
  const accentColor: RGB = rgb(0.7, 0.4, 0.2); // Warm terracotta
  const secondaryColor: RGB = rgb(0.95, 0.95, 0.97); // Very light gray
  const textColor: RGB = rgb(0.15, 0.15, 0.15);
  const lightTextColor: RGB = rgb(0.5, 0.5, 0.5);
  const borderColor: RGB = rgb(0.9, 0.9, 0.9);

  const fmt = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: totals.currency,
  });

  const totalLineItems =
    totals.items.filter((item) => item.quantity > 0).length +
    totals.overtimeEntries.length +
    totals.customExpenseEntries.length;

  const isCompact = totalLineItems > 15;
  const isVeryCompact = totalLineItems > 25;

  // Modern spacing - improved for better visual balance
  const leftMargin = 25;
  const rightMargin = width - 50;
  const contentWidth = rightMargin - leftMargin;
  const sidebarWidth = 170;
  const mainContentX = leftMargin + sidebarWidth + 30;

  let y = height - 50;

  // Elegant sidebar with accent color
  page.drawRectangle({
    x: 0,
    y: 0,
    width: sidebarWidth,
    height: height,
    color: secondaryColor,
  });

  // Accent stripe - increased height for better presence
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width: sidebarWidth,
    height: 120,
    color: accentColor,
  });

  // Invoice number in sidebar - improved spacing
  page.drawText("INVOICE", {
    x: leftMargin,
    y: height - 45,
    size: 28,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`#${input.invoiceNumber}`, {
    x: leftMargin,
    y: height - 72,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Date in sidebar
  page.drawText(formatDateGB(input.invoiceDate), {
    x: leftMargin,
    y: height - 95,
    size: 10,
    font: fontRegular,
    color: rgb(0.95, 0.95, 0.95),
  });

  // Main content area - better top margin
  y = height - 70;

  // Project name (if exists) - elegant styling with better spacing
  if (input.showName) {
    page.drawText(input.showName.toUpperCase(), {
      x: mainContentX,
      y,
      size: 20,
      font: fontBold,
      color: accentColor,
    });
    y -= 35;
  } else {
    y -= 10;
  }

  // Two-column layout for addresses - improved spacing
  const addressColumnWidth = (contentWidth - sidebarWidth - 30 - 40) / 2;
  const billFromX = mainContentX;
  let billFromY = y;

  // Helper function to wrap text based on available width
  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = fontRegular.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }

      // Handle very long words that exceed width even alone
      const wordWidth = fontRegular.widthOfTextAtSize(word, fontSize);
      if (wordWidth > maxWidth) {
        // Force break long words character by character
        if (currentLine && currentLine !== word) {
          lines.push(currentLine.slice(0, -word.length - 1).trim());
        }
        let remaining = word;
        while (remaining.length > 0) {
          let chunk = "";
          for (let i = 0; i < remaining.length; i++) {
            const testChunk = chunk + remaining[i];
            if (fontRegular.widthOfTextAtSize(testChunk, fontSize) > maxWidth) {
              break;
            }
            chunk = testChunk;
          }
          if (chunk.length === 0) chunk = remaining[0] || "";
          lines.push(chunk);
          remaining = remaining.slice(chunk.length);
        }
        currentLine = "";
      }
    }

    if (currentLine.trim().length > 0) {
      lines.push(currentLine.trim());
    }

    return lines.length > 0 ? lines : [text];
  };

  // Bill From section
  page.drawText("FROM", {
    x: billFromX,
    y: billFromY,
    size: 9,
    font: fontBold,
    color: lightTextColor,
  });
  billFromY -= 18;

  page.drawText(input.fullName, {
    x: billFromX,
    y: billFromY,
    size: 11,
    font: fontBold,
    color: textColor,
  });
  billFromY -= 16;

  page.drawText(input.email, {
    x: billFromX,
    y: billFromY,
    size: 9,
    font: fontRegular,
    color: textColor,
  });
  billFromY -= 14;

  const addressLines = [
    input.addressLine1,
    input.addressLine2,
    `${input.city}${input.state ? ", " + input.state : ""} ${input.postalCode}`,
    input.country,
  ].filter((line): line is string => Boolean(line));

  const addressFontSize = 9;
  addressLines.forEach((line) => {
    const wrappedLines = wrapText(line, addressColumnWidth, addressFontSize);
    wrappedLines.forEach((wrappedLine) => {
      page.drawText(wrappedLine, {
        x: billFromX,
        y: billFromY,
        size: addressFontSize,
        font: fontRegular,
        color: textColor,
      });
      billFromY -= 13;
    });
  });

  if (input.dateOfBirth) {
    billFromY -= 6;
    page.drawText(`DOB: ${formatDateGBShort(input.dateOfBirth)}`, {
      x: billFromX,
      y: billFromY,
      size: 8,
      font: fontRegular,
      color: lightTextColor,
    });
  }

  // Bill To section
  const billToX = mainContentX + addressColumnWidth + 40;
  let billToY = y;

  page.drawText("TO", {
    x: billToX,
    y: billToY,
    size: 9,
    font: fontBold,
    color: lightTextColor,
  });
  billToY -= 18;

  if (input.clientName) {
    const clientNameFontSize = 11;
    const wrappedClientName = wrapText(input.clientName, addressColumnWidth, clientNameFontSize);
    wrappedClientName.forEach((line) => {
      page.drawText(line, {
        x: billToX,
        y: billToY,
        size: clientNameFontSize,
        font: fontBold,
        color: textColor,
      });
      billToY -= 16;
    });
  }

  if (input.attentionTo) {
    const attnText = `Attn: ${input.attentionTo}`;
    const attnFontSize = 9;
    const wrappedAttn = wrapText(attnText, addressColumnWidth, attnFontSize);
    wrappedAttn.forEach((line) => {
      page.drawText(line, {
        x: billToX,
        y: billToY,
        size: attnFontSize,
        font: fontRegular,
        color: textColor,
      });
      billToY -= 14;
    });
  }

  const clientAddressLines = [
    input.clientAddress1,
    input.clientAddress2,
    [input.clientCity, input.clientState, input.clientPostalCode]
      .filter((part): part is string => Boolean(part))
      .join(", "),
    input.clientCountry,
  ].filter((line): line is string => Boolean(line));

  const clientAddressFontSize = 9;
  clientAddressLines.forEach((line) => {
    const wrappedLines = wrapText(line, addressColumnWidth, clientAddressFontSize);
    wrappedLines.forEach((wrappedLine) => {
      page.drawText(wrappedLine, {
        x: billToX,
        y: billToY,
        size: clientAddressFontSize,
        font: fontRegular,
        color: textColor,
      });
      billToY -= 13;
    });
  });

  // Items section - improved spacing before table
  y = Math.min(billFromY, billToY) - 50;

  // Elegant divider line
  page.drawLine({
    start: { x: mainContentX, y },
    end: { x: rightMargin, y },
    thickness: 0.5,
    color: borderColor,
  });
  y -= 30;

  // Table headers with subtle background - improved padding
  const headerY = y;
  page.drawRectangle({
    x: mainContentX,
    y: headerY - 10,
    width: rightMargin - mainContentX,
    height: 24,
    color: secondaryColor,
  });

  page.drawText("Description", {
    x: mainContentX + 8,
    y: headerY + 2,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  page.drawText("Qty", {
    x: rightMargin - 180,
    y: headerY + 2,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  page.drawText("Rate", {
    x: rightMargin - 120,
    y: headerY + 2,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  page.drawText("Amount", {
    x: rightMargin - 60,
    y: headerY + 2,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  y -= 28;

  // Draw line items - improved spacing
  const itemFontSize = isVeryCompact ? 8 : isCompact ? 9 : 10;
  const itemLineHeight = isVeryCompact ? 16 : isCompact ? 18 : 20;

  const drawLineItem = (
    desc: string,
    qty: string,
    rate: string,
    amount: string,
  ) => {
    const maxDescLength = isVeryCompact ? 50 : isCompact ? 60 : 70;
    const truncatedDesc =
      desc.length > maxDescLength
        ? desc.substring(0, maxDescLength - 3) + "..."
        : desc;

    page.drawText(truncatedDesc, {
      x: mainContentX + 8,
      y,
      size: itemFontSize,
      font: fontRegular,
      color: textColor,
    });

    page.drawText(qty, {
      x: rightMargin - 180,
      y,
      size: itemFontSize,
      font: fontRegular,
      color: textColor,
    });

    page.drawText(rate, {
      x: rightMargin - 120,
      y,
      size: itemFontSize,
      font: fontRegular,
      color: textColor,
    });

    page.drawText(amount, {
      x: rightMargin - 60,
      y,
      size: itemFontSize,
      font: fontBold,
      color: textColor,
    });

    y -= itemLineHeight;
  };

  totals.items
    .filter((item) => item.quantity > 0)
    .forEach((item) => {
      const cost = item.cost ?? item.quantity * item.unitPrice;
      drawLineItem(
        item.description,
        item.quantity.toString(),
        fmt.format(item.unitPrice),
        fmt.format(cost),
      );
    });

  totals.overtimeEntries.forEach((entry) => {
    const multiplier = entry.rateType === "1.5x" ? 1.5 : 2;
    const hourlyRate = 52.5 * multiplier;
    const cost = entry.hours * hourlyRate;
    const dateStr = formatDateGBShort(entry.date);

    drawLineItem(
      `Overtime ${entry.rateType} - ${dateStr}`,
      `${entry.hours}h`,
      fmt.format(hourlyRate),
      fmt.format(cost),
    );
  });

  totals.customExpenseEntries.forEach((entry) => {
    drawLineItem(
      entry.description,
      entry.quantity.toString(),
      fmt.format(entry.unitPrice),
      fmt.format(entry.cost),
    );
  });

  y -= 20;

  // Divider
  page.drawLine({
    start: { x: mainContentX, y },
    end: { x: rightMargin, y },
    thickness: 0.5,
    color: borderColor,
  });
  y -= 25;

  // Totals section - improved spacing
  const summaryX = rightMargin - 180;
  const summaryFontSize = isVeryCompact ? 9 : 10;
  const summaryLineHeight = isVeryCompact ? 16 : 18;

  if (totals.itemsTotal > 0) {
    page.drawText("Items Subtotal", {
      x: summaryX,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: lightTextColor,
    });
    page.drawText(fmt.format(totals.itemsTotal), {
      x: rightMargin - 60,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= summaryLineHeight;
  }

  if (totals.overtimeTotal > 0) {
    page.drawText("Overtime Subtotal", {
      x: summaryX,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: lightTextColor,
    });
    page.drawText(fmt.format(totals.overtimeTotal), {
      x: rightMargin - 60,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= summaryLineHeight;
  }

  if (totals.customExpensesTotal > 0) {
    page.drawText("Expenses Subtotal", {
      x: summaryX,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: lightTextColor,
    });
    page.drawText(fmt.format(totals.customExpensesTotal), {
      x: rightMargin - 60,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= summaryLineHeight;
  }

  y -= 12;

  // Total with accent color background - improved spacing
  const totalBoxHeight = 32;
  page.drawRectangle({
    x: summaryX - 12,
    y: y - 10,
    width: rightMargin - summaryX + 12,
    height: totalBoxHeight,
    color: accentColor,
  });

  page.drawText("TOTAL", {
    x: summaryX,
    y: y + 4,
    size: 12,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(fmt.format(totals.totalAmount), {
    x: rightMargin - 60,
    y: y + 4,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  y -= 60;

  // Payment details in sidebar - improved spacing and positioning
  let sidebarY = height - 150;
  page.drawText("PAYMENT", {
    x: leftMargin,
    y: sidebarY,
    size: 10,
    font: fontBold,
    color: textColor,
  });
  sidebarY -= 18;

  page.drawText("DETAILS", {
    x: leftMargin,
    y: sidebarY,
    size: 10,
    font: fontBold,
    color: textColor,
  });
  sidebarY -= 25;

  page.drawText(`IBAN:`, {
    x: leftMargin,
    y: sidebarY,
    size: 7,
    font: fontBold,
    color: lightTextColor,
  });
  sidebarY -= 12;

  // Wrap IBAN if too long
  const ibanLines = input.iban.match(/.{1,25}/g) || [input.iban];
  ibanLines.forEach((line) => {
    page.drawText(line, {
      x: leftMargin,
      y: sidebarY,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
    sidebarY -= 12;
  });

  sidebarY -= 8;
  page.drawText(`SWIFT/BIC:`, {
    x: leftMargin,
    y: sidebarY,
    size: 7,
    font: fontBold,
    color: lightTextColor,
  });
  sidebarY -= 12;

  page.drawText(input.swiftBic, {
    x: leftMargin,
    y: sidebarY,
    size: 8,
    font: fontRegular,
    color: textColor,
  });
  sidebarY -= 18;

  if (input.accountNumber) {
    page.drawText(`Account:`, {
      x: leftMargin,
      y: sidebarY,
      size: 7,
      font: fontBold,
      color: lightTextColor,
    });
    sidebarY -= 12;
    page.drawText(input.accountNumber, {
      x: leftMargin,
      y: sidebarY,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
    sidebarY -= 18;
  }

  if (input.sortCode) {
    page.drawText(`Sort Code:`, {
      x: leftMargin,
      y: sidebarY,
      size: 7,
      font: fontBold,
      color: lightTextColor,
    });
    sidebarY -= 12;
    page.drawText(input.sortCode, {
      x: leftMargin,
      y: sidebarY,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
    sidebarY -= 18;
  }

  // Notes section - improved spacing
  if (input.notes) {
    y -= 25;
    page.drawText("Notes", {
      x: mainContentX,
      y,
      size: 10,
      font: fontBold,
      color: accentColor,
    });
    y -= 18;

    const maxNotesLength = isVeryCompact ? 100 : isCompact ? 120 : 150;
    const truncatedNotes =
      input.notes.length > maxNotesLength
        ? input.notes.substring(0, maxNotesLength - 3) + "..."
        : input.notes;

    // Wrap notes text
    const notesLines = truncatedNotes.match(/.{1,80}/g) || [truncatedNotes];
    notesLines.forEach((line) => {
      page.drawText(line, {
        x: mainContentX,
        y,
        size: 9,
        font: fontRegular,
        color: textColor,
      });
      y -= 14;
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

// Minimal template with clean lines and separators
const generateMinimalInvoicePdf = async (
  input: InvoicePdfInput,
  totals: ReturnType<typeof calculateInvoiceTotals>,
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Minimal color scheme - very subtle
  const textColor: RGB = rgb(0.1, 0.1, 0.1);
  const lightTextColor: RGB = rgb(0.4, 0.4, 0.4);
  const lineColor: RGB = rgb(0.75, 0.75, 0.75);
  const subtleLineColor: RGB = rgb(0.9, 0.9, 0.9);

  const fmt = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: totals.currency,
  });

  const totalLineItems =
    totals.items.filter((item) => item.quantity > 0).length +
    totals.overtimeEntries.length +
    totals.customExpenseEntries.length;

  const isCompact = totalLineItems > 15;
  const isVeryCompact = totalLineItems > 25;

  // Minimal spacing
  const leftMargin = 60;
  const rightMargin = width - 60;
  const contentWidth = rightMargin - leftMargin;

  let y = height - 60;

  // Header - minimal with line separator
  page.drawText("INVOICE", {
    x: leftMargin,
    y,
    size: 32,
    font: fontBold,
    color: textColor,
  });

  page.drawText(`#${input.invoiceNumber}`, {
    x: rightMargin - 100,
    y,
    size: 12,
    font: fontRegular,
    color: lightTextColor,
  });

  y -= 40;

  // Top separator line
  page.drawLine({
    start: { x: leftMargin, y },
    end: { x: rightMargin, y },
    thickness: 0.5,
    color: lineColor,
  });

  y -= 30;

  // Project name (if exists)
  if (input.showName) {
    page.drawText(input.showName, {
      x: leftMargin,
      y,
      size: 16,
      font: fontBold,
      color: textColor,
    });
    y -= 25;
  }

  // Two-column layout for addresses
  const addressColumnWidth = (contentWidth - 40) / 2;
  const billFromX = leftMargin;
  let billFromY = y;

  // Helper function to wrap text
  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = fontRegular.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }

      const wordWidth = fontRegular.widthOfTextAtSize(word, fontSize);
      if (wordWidth > maxWidth) {
        if (currentLine && currentLine !== word) {
          lines.push(currentLine.slice(0, -word.length - 1).trim());
        }
        let remaining = word;
        while (remaining.length > 0) {
          let chunk = "";
          for (let i = 0; i < remaining.length; i++) {
            const testChunk = chunk + remaining[i];
            if (fontRegular.widthOfTextAtSize(testChunk, fontSize) > maxWidth) {
              break;
            }
            chunk = testChunk;
          }
          if (chunk.length === 0) chunk = remaining[0] || "";
          lines.push(chunk);
          remaining = remaining.slice(chunk.length);
        }
        currentLine = "";
      }
    }

    if (currentLine.trim().length > 0) {
      lines.push(currentLine.trim());
    }

    return lines.length > 0 ? lines : [text];
  };

  // Bill From section
  page.drawText("From", {
    x: billFromX,
    y: billFromY,
    size: 8,
    font: fontBold,
    color: lightTextColor,
  });
  billFromY -= 15;

  page.drawText(input.fullName, {
    x: billFromX,
    y: billFromY,
    size: 10,
    font: fontBold,
    color: textColor,
  });
  billFromY -= 14;

  page.drawText(input.email, {
    x: billFromX,
    y: billFromY,
    size: 9,
    font: fontRegular,
    color: textColor,
  });
  billFromY -= 13;

  const addressLines = [
    input.addressLine1,
    input.addressLine2,
    `${input.city}${input.state ? ", " + input.state : ""} ${input.postalCode}`,
    input.country,
  ].filter((line): line is string => Boolean(line));

  addressLines.forEach((line) => {
    const wrappedLines = wrapText(line, addressColumnWidth, 9);
    wrappedLines.forEach((wrappedLine) => {
      page.drawText(wrappedLine, {
        x: billFromX,
        y: billFromY,
        size: 9,
        font: fontRegular,
        color: textColor,
      });
      billFromY -= 12;
    });
  });

  if (input.dateOfBirth) {
    billFromY -= 4;
    page.drawText(`DOB: ${formatDateGBShort(input.dateOfBirth)}`, {
      x: billFromX,
      y: billFromY,
      size: 8,
      font: fontRegular,
      color: lightTextColor,
    });
  }

  // Bill To section
  const billToX = leftMargin + addressColumnWidth + 40;
  let billToY = y;

  page.drawText("To", {
    x: billToX,
    y: billToY,
    size: 8,
    font: fontBold,
    color: lightTextColor,
  });
  billToY -= 15;

  if (input.clientName) {
    const wrappedClientName = wrapText(input.clientName, addressColumnWidth, 10);
    wrappedClientName.forEach((line) => {
      page.drawText(line, {
        x: billToX,
        y: billToY,
        size: 10,
        font: fontBold,
        color: textColor,
      });
      billToY -= 14;
    });
  }

  if (input.attentionTo) {
    const attnText = `Attn: ${input.attentionTo}`;
    const wrappedAttn = wrapText(attnText, addressColumnWidth, 9);
    wrappedAttn.forEach((line) => {
      page.drawText(line, {
        x: billToX,
        y: billToY,
        size: 9,
        font: fontRegular,
        color: textColor,
      });
      billToY -= 13;
    });
  }

  const clientAddressLines = [
    input.clientAddress1,
    input.clientAddress2,
    [input.clientCity, input.clientState, input.clientPostalCode]
      .filter((part): part is string => Boolean(part))
      .join(", "),
    input.clientCountry,
  ].filter((line): line is string => Boolean(line));

  clientAddressLines.forEach((line) => {
    const wrappedLines = wrapText(line, addressColumnWidth, 9);
    wrappedLines.forEach((wrappedLine) => {
      page.drawText(wrappedLine, {
        x: billToX,
        y: billToY,
        size: 9,
        font: fontRegular,
        color: textColor,
      });
      billToY -= 12;
    });
  });

  // Items section with separator
  y = Math.min(billFromY, billToY) - 35;

  // Subtle separator line
  page.drawLine({
    start: { x: leftMargin, y },
    end: { x: rightMargin, y },
    thickness: 0.5,
    color: subtleLineColor,
  });
  y -= 25;

  // Date
  page.drawText(`Date: ${formatDateGB(input.invoiceDate)}`, {
    x: leftMargin,
    y,
    size: 9,
    font: fontRegular,
    color: lightTextColor,
  });
  y -= 20;

  // Table headers with subtle underline
  const headerY = y;
  page.drawText("Description", {
    x: leftMargin,
    y: headerY,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  page.drawText("Qty", {
    x: rightMargin - 180,
    y: headerY,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  page.drawText("Rate", {
    x: rightMargin - 120,
    y: headerY,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  page.drawText("Amount", {
    x: rightMargin - 60,
    y: headerY,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  // Header underline
  y -= 8;
  page.drawLine({
    start: { x: leftMargin, y },
    end: { x: rightMargin, y },
    thickness: 0.5,
    color: lineColor,
  });
  y -= 15;

  // Draw line items
  const itemFontSize = isVeryCompact ? 8 : isCompact ? 9 : 10;
  const itemLineHeight = isVeryCompact ? 16 : isCompact ? 18 : 20;

  const drawLineItem = (
    desc: string,
    qty: string,
    rate: string,
    amount: string,
  ) => {
    const maxDescLength = isVeryCompact ? 50 : isCompact ? 60 : 70;
    const truncatedDesc =
      desc.length > maxDescLength
        ? desc.substring(0, maxDescLength - 3) + "..."
        : desc;

    page.drawText(truncatedDesc, {
      x: leftMargin,
      y,
      size: itemFontSize,
      font: fontRegular,
      color: textColor,
    });

    page.drawText(qty, {
      x: rightMargin - 180,
      y,
      size: itemFontSize,
      font: fontRegular,
      color: textColor,
    });

    page.drawText(rate, {
      x: rightMargin - 120,
      y,
      size: itemFontSize,
      font: fontRegular,
      color: textColor,
    });

    page.drawText(amount, {
      x: rightMargin - 60,
      y,
      size: itemFontSize,
      font: fontRegular,
      color: textColor,
    });

    y -= itemLineHeight;

    // Subtle separator line between items
    const separatorY = y + itemLineHeight * 0.5;
    page.drawLine({
      start: { x: leftMargin, y: separatorY },
      end: { x: rightMargin, y: separatorY },
      thickness: 0.3,
      color: subtleLineColor,
    });
  };

  totals.items
    .filter((item) => item.quantity > 0)
    .forEach((item) => {
      const cost = item.cost ?? item.quantity * item.unitPrice;
      drawLineItem(
        item.description,
        item.quantity.toString(),
        fmt.format(item.unitPrice),
        fmt.format(cost),
      );
    });

  totals.overtimeEntries.forEach((entry) => {
    const multiplier = entry.rateType === "1.5x" ? 1.5 : 2;
    const hourlyRate = 52.5 * multiplier;
    const cost = entry.hours * hourlyRate;
    const dateStr = formatDateGBShort(entry.date);

    drawLineItem(
      `Overtime ${entry.rateType} - ${dateStr}`,
      `${entry.hours}h`,
      fmt.format(hourlyRate),
      fmt.format(cost),
    );
  });

  totals.customExpenseEntries.forEach((entry) => {
    drawLineItem(
      entry.description,
      entry.quantity.toString(),
      fmt.format(entry.unitPrice),
      fmt.format(entry.cost),
    );
  });

  y -= 10;

  // Separator before totals
  page.drawLine({
    start: { x: leftMargin, y },
    end: { x: rightMargin, y },
    thickness: 0.5,
    color: lineColor,
  });
  y -= 20;

  // Totals section
  const summaryX = rightMargin - 180;
  const summaryFontSize = isVeryCompact ? 9 : 10;
  const summaryLineHeight = isVeryCompact ? 16 : 18;

  if (totals.itemsTotal > 0) {
    page.drawText("Items Subtotal", {
      x: summaryX,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: lightTextColor,
    });
    page.drawText(fmt.format(totals.itemsTotal), {
      x: rightMargin - 60,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= summaryLineHeight;
  }

  if (totals.overtimeTotal > 0) {
    page.drawText("Overtime Subtotal", {
      x: summaryX,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: lightTextColor,
    });
    page.drawText(fmt.format(totals.overtimeTotal), {
      x: rightMargin - 60,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= summaryLineHeight;
  }

  if (totals.customExpensesTotal > 0) {
    page.drawText("Expenses Subtotal", {
      x: summaryX,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: lightTextColor,
    });
    page.drawText(fmt.format(totals.customExpensesTotal), {
      x: rightMargin - 60,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= summaryLineHeight;
  }

  y -= 8;

  // Total with separator line above
  page.drawLine({
    start: { x: summaryX - 10, y },
    end: { x: rightMargin, y },
    thickness: 0.5,
    color: lineColor,
  });
  y -= 12;

  page.drawText("Total", {
    x: summaryX,
    y,
    size: 11,
    font: fontBold,
    color: textColor,
  });

  page.drawText(fmt.format(totals.totalAmount), {
    x: rightMargin - 60,
    y,
    size: 11,
    font: fontBold,
    color: textColor,
  });

  y -= 40;

  // Payment details section with separator
  page.drawLine({
    start: { x: leftMargin, y },
    end: { x: rightMargin, y },
    thickness: 0.5,
    color: subtleLineColor,
  });
  y -= 20;

  page.drawText("Payment Details", {
    x: leftMargin,
    y,
    size: 9,
    font: fontBold,
    color: textColor,
  });
  y -= 15;

  page.drawText(`IBAN: ${input.iban}`, {
    x: leftMargin,
    y,
    size: 8,
    font: fontRegular,
    color: textColor,
  });
  y -= 12;

  page.drawText(`SWIFT/BIC: ${input.swiftBic}`, {
    x: leftMargin,
    y,
    size: 8,
    font: fontRegular,
    color: textColor,
  });
  y -= 12;

  if (input.accountNumber) {
    page.drawText(`Account Number: ${input.accountNumber}`, {
      x: leftMargin,
      y,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
    y -= 12;
  }

  if (input.sortCode) {
    page.drawText(`Sort Code: ${input.sortCode}`, {
      x: leftMargin,
      y,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
    y -= 12;
  }

  if (input.bankAddress) {
    page.drawText(`Bank Address: ${input.bankAddress}`, {
      x: leftMargin,
      y,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
    y -= 12;
  }

  // Notes section
  if (input.notes) {
    y -= 15;
    page.drawLine({
      start: { x: leftMargin, y },
      end: { x: rightMargin, y },
      thickness: 0.5,
      color: subtleLineColor,
    });
    y -= 20;

    page.drawText("Notes", {
      x: leftMargin,
      y,
      size: 9,
      font: fontBold,
      color: textColor,
    });
    y -= 15;

    const maxNotesLength = isVeryCompact ? 100 : isCompact ? 120 : 150;
    const truncatedNotes =
      input.notes.length > maxNotesLength
        ? input.notes.substring(0, maxNotesLength - 3) + "..."
        : input.notes;

    const notesLines = truncatedNotes.match(/.{1,80}/g) || [truncatedNotes];
    notesLines.forEach((line) => {
      page.drawText(line, {
        x: leftMargin,
        y,
        size: 9,
        font: fontRegular,
        color: textColor,
      });
      y -= 13;
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
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

  // Classic template (original)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Color scheme
  const primaryColor: RGB = rgb(0.2, 0.3, 0.5); // Dark blue
  const accentColor: RGB = rgb(0.4, 0.5, 0.7); // Medium blue
  const textColor: RGB = rgb(0.2, 0.2, 0.2); // Dark gray
  const lightGray: RGB = rgb(0.95, 0.95, 0.95);
  const borderColor: RGB = rgb(0.85, 0.85, 0.85);

  const fmt = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: totals.currency,
  });

  // Calculate total number of line items
  const totalLineItems =
    totals.items.filter((item) => item.quantity > 0).length +
    totals.overtimeEntries.length +
    totals.customExpenseEntries.length;

  // Dynamic spacing based on number of items
  // Adjust spacing to fit more items on one page
  const isCompact = totalLineItems > 15;
  const isVeryCompact = totalLineItems > 25;

  // Spacing configuration
  const headerHeight = isVeryCompact ? 80 : isCompact ? 90 : 120;
  const headerFontSize = isVeryCompact ? 24 : isCompact ? 28 : 32;
  const sectionSpacing = isVeryCompact ? 12 : isCompact ? 18 : 30;
  const addressLineHeight = isVeryCompact ? 10 : isCompact ? 11 : 12;
  const addressFontSize = isVeryCompact ? 7.5 : isCompact ? 8 : 9;
  const itemLineHeight = isVeryCompact ? 12 : isCompact ? 14 : 18;
  const itemFontSize = isVeryCompact ? 7 : isCompact ? 8 : 9;
  const tablePadding = isVeryCompact ? 14 : isCompact ? 16 : 20;

  let y = height - 60;
  const leftMargin = 50;
  const rightMargin = width - 50;
  const contentWidth = rightMargin - leftMargin;

  // Header with colored background
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width: width,
    height: headerHeight,
    color: primaryColor,
  });

  // INVOICE title
  page.drawText("INVOICE", {
    x: leftMargin,
    y: height - headerHeight * 0.6,
    size: headerFontSize,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Invoice number and date (white text on colored background)
  page.drawText(`#${input.invoiceNumber}`, {
    x: rightMargin - 150,
    y: height - headerHeight * 0.5,
    size: isVeryCompact ? 11 : isCompact ? 12 : 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Date: ${formatDateGB(input.invoiceDate)}`, {
    x: rightMargin - 150,
    y: height - headerHeight * 0.7,
    size: isVeryCompact ? 8 : isCompact ? 9 : 10,
    font: fontRegular,
    color: rgb(0.9, 0.9, 0.9),
  });

  y = height - headerHeight - sectionSpacing;

  // Project name (if exists)
  if (input.showName) {
    page.drawText("PROJECT", {
      x: leftMargin,
      y,
      size: addressFontSize,
      font: fontBold,
      color: accentColor,
    });
    y -= addressLineHeight + 2;
    page.drawText(input.showName, {
      x: leftMargin,
      y,
      size: addressFontSize + 2,
      font: fontRegular,
      color: textColor,
    });
    y -= sectionSpacing;
  } else {
    y -= sectionSpacing * 0.5;
  }

  // Two-column layout for Bill From and Bill To
  const columnWidth = (contentWidth - 20) / 2;

  // Bill From (Left column)
  const billFromX = leftMargin;
  let billFromY = y;

  page.drawText("BILL FROM", {
    x: billFromX,
    y: billFromY,
    size: addressFontSize,
    font: fontBold,
    color: accentColor,
  });
  billFromY -= addressLineHeight + 4;

  page.drawText(input.fullName, {
    x: billFromX,
    y: billFromY,
    size: addressFontSize + 2,
    font: fontBold,
    color: textColor,
  });
  billFromY -= addressLineHeight + 2;

  page.drawText(input.email, {
    x: billFromX,
    y: billFromY,
    size: addressFontSize,
    font: fontRegular,
    color: textColor,
  });
  billFromY -= addressLineHeight + 2;

  page.drawText(input.addressLine1, {
    x: billFromX,
    y: billFromY,
    size: addressFontSize,
    font: fontRegular,
    color: textColor,
  });
  billFromY -= addressLineHeight;

  if (input.addressLine2) {
    page.drawText(input.addressLine2, {
      x: billFromX,
      y: billFromY,
      size: addressFontSize,
      font: fontRegular,
      color: textColor,
    });
    billFromY -= addressLineHeight;
  }

  page.drawText(
    `${input.city}${input.state ? ", " + input.state : ""} ${input.postalCode}`,
    {
      x: billFromX,
      y: billFromY,
      size: addressFontSize,
      font: fontRegular,
      color: textColor,
    },
  );
  billFromY -= addressLineHeight;

  page.drawText(input.country, {
    x: billFromX,
    y: billFromY,
    size: addressFontSize,
    font: fontRegular,
    color: textColor,
  });
  billFromY -= addressLineHeight;

  if (input.dateOfBirth) {
    page.drawText(`DOB: ${formatDateGBShort(input.dateOfBirth)}`, {
      x: billFromX,
      y: billFromY,
      size: addressFontSize,
      font: fontRegular,
      color: textColor,
    });
  }

  // Bill To (Right column)
  const billToX = leftMargin + columnWidth + 20;
  let billToY = y;

  page.drawText("BILL TO", {
    x: billToX,
    y: billToY,
    size: addressFontSize,
    font: fontBold,
    color: accentColor,
  });
  billToY -= addressLineHeight + 4;

  if (input.clientName) {
    page.drawText(input.clientName, {
      x: billToX,
      y: billToY,
      size: addressFontSize + 2,
      font: fontBold,
      color: textColor,
    });
    billToY -= addressLineHeight + 2;
  }

  if (input.attentionTo) {
    page.drawText(`Attn: ${input.attentionTo}`, {
      x: billToX,
      y: billToY,
      size: addressFontSize,
      font: fontRegular,
      color: textColor,
    });
    billToY -= addressLineHeight + 2;
  }

  if (input.clientAddress1) {
    page.drawText(input.clientAddress1, {
      x: billToX,
      y: billToY,
      size: addressFontSize,
      font: fontRegular,
      color: textColor,
    });
    billToY -= addressLineHeight;
  }

  if (input.clientAddress2) {
    page.drawText(input.clientAddress2, {
      x: billToX,
      y: billToY,
      size: addressFontSize,
      font: fontRegular,
      color: textColor,
    });
    billToY -= addressLineHeight;
  }

  if (input.clientCity || input.clientPostalCode || input.clientState) {
    const parts = [
      input.clientCity,
      input.clientState,
      input.clientPostalCode,
    ].filter(Boolean);
    page.drawText(parts.join(", "), {
      x: billToX,
      y: billToY,
      size: addressFontSize,
      font: fontRegular,
      color: textColor,
    });
    billToY -= addressLineHeight;
  }

  if (input.clientCountry) {
    page.drawText(input.clientCountry, {
      x: billToX,
      y: billToY,
      size: addressFontSize,
      font: fontRegular,
      color: textColor,
    });
  }

  // Move to items section with extra spacing
  y = Math.min(billFromY, billToY) - sectionSpacing * 1.5;

  // Items table header with background
  const tableHeaderY = y;
  page.drawRectangle({
    x: leftMargin,
    y: tableHeaderY - 2,
    width: contentWidth,
    height: tablePadding,
    color: lightGray,
  });

  // Table headers
  page.drawText("DESCRIPTION", {
    x: leftMargin + 5,
    y: tableHeaderY + tablePadding * 0.25,
    size: itemFontSize,
    font: fontBold,
    color: textColor,
  });

  page.drawText("QTY", {
    x: rightMargin - 200,
    y: tableHeaderY + tablePadding * 0.25,
    size: itemFontSize,
    font: fontBold,
    color: textColor,
  });

  page.drawText("RATE", {
    x: rightMargin - 140,
    y: tableHeaderY + tablePadding * 0.25,
    size: itemFontSize,
    font: fontBold,
    color: textColor,
  });

  page.drawText("AMOUNT", {
    x: rightMargin - 75,
    y: tableHeaderY + tablePadding * 0.25,
    size: itemFontSize,
    font: fontBold,
    color: textColor,
  });

  y -= tablePadding + 5;

  // Helper to draw a line item
  const drawLineItem = (
    desc: string,
    qty: string,
    rate: string,
    amount: string,
  ) => {
    // Truncate description if too long to prevent overflow
    const maxDescLength = isVeryCompact ? 45 : isCompact ? 55 : 65;
    const truncatedDesc =
      desc.length > maxDescLength
        ? desc.substring(0, maxDescLength - 3) + "..."
        : desc;

    page.drawText(truncatedDesc, {
      x: leftMargin + 5,
      y,
      size: itemFontSize,
      font: fontRegular,
      color: textColor,
    });

    page.drawText(qty, {
      x: rightMargin - 200,
      y,
      size: itemFontSize,
      font: fontRegular,
      color: textColor,
    });

    page.drawText(rate, {
      x: rightMargin - 140,
      y,
      size: itemFontSize,
      font: fontRegular,
      color: textColor,
    });

    page.drawText(amount, {
      x: rightMargin - 75,
      y,
      size: itemFontSize,
      font: fontRegular,
      color: textColor,
    });

    y -= itemLineHeight;
  };

  // Draw all items (excluding zero-quantity items)
  totals.items
    .filter((item) => item.quantity > 0)
    .forEach((item) => {
      const cost = item.cost ?? item.quantity * item.unitPrice;
      drawLineItem(
        item.description,
        item.quantity.toString(),
        fmt.format(item.unitPrice),
        fmt.format(cost),
      );
    });

  // Draw overtime entries
  totals.overtimeEntries.forEach((entry) => {
    const multiplier = entry.rateType === "1.5x" ? 1.5 : 2;
    const hourlyRate = 52.5 * multiplier;
    const cost = entry.hours * hourlyRate;
    const dateStr = formatDateGBShort(entry.date);

    drawLineItem(
      `Overtime ${entry.rateType} - ${dateStr}`,
      `${entry.hours}h`,
      fmt.format(hourlyRate),
      fmt.format(cost),
    );
  });

  // Draw custom expenses
  totals.customExpenseEntries.forEach((entry) => {
    drawLineItem(
      entry.description,
      entry.quantity.toString(),
      fmt.format(entry.unitPrice),
      fmt.format(entry.cost),
    );
  });

  y -= sectionSpacing * 0.5;

  // Separator line
  page.drawLine({
    start: { x: leftMargin, y },
    end: { x: rightMargin, y },
    thickness: 1,
    color: borderColor,
  });

  y -= sectionSpacing * 0.8;

  // Subtotals and Total
  const summaryX = rightMargin - 200;
  const summaryFontSize = isVeryCompact ? 8 : isCompact ? 9 : 10;
  const summaryLineHeight = isVeryCompact ? 12 : isCompact ? 14 : 16;

  if (totals.itemsTotal > 0) {
    page.drawText("Items Subtotal:", {
      x: summaryX,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    page.drawText(fmt.format(totals.itemsTotal), {
      x: rightMargin - 75,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= summaryLineHeight;
  }

  if (totals.overtimeTotal > 0) {
    page.drawText("Overtime Subtotal:", {
      x: summaryX,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    page.drawText(fmt.format(totals.overtimeTotal), {
      x: rightMargin - 75,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= summaryLineHeight;
  }

  if (totals.customExpensesTotal > 0) {
    page.drawText("Expenses Subtotal:", {
      x: summaryX,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    page.drawText(fmt.format(totals.customExpensesTotal), {
      x: rightMargin - 75,
      y,
      size: summaryFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= summaryLineHeight;
  }

  y -= sectionSpacing * 0.4;

  // Total with colored background
  const totalBoxHeight = isVeryCompact ? 18 : isCompact ? 20 : 25;
  const totalFontSize = isVeryCompact ? 10 : isCompact ? 11 : 12;

  page.drawRectangle({
    x: summaryX - 10,
    y: y - 5,
    width: rightMargin - summaryX + 10,
    height: totalBoxHeight,
    color: primaryColor,
  });

  page.drawText("TOTAL", {
    x: summaryX,
    y: y + totalBoxHeight * 0.1,
    size: totalFontSize,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(fmt.format(totals.totalAmount), {
    x: rightMargin - 75,
    y: y + totalBoxHeight * 0.15,
    size: totalFontSize,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  y -= sectionSpacing * 1.2;

  // Banking details section
  const paymentFontSize = isVeryCompact ? 7.5 : isCompact ? 8 : 9;
  const paymentTitleSize = isVeryCompact ? 8 : isCompact ? 9 : 10;
  const paymentLineHeight = isVeryCompact ? 10 : isCompact ? 12 : 14;

  page.drawText("PAYMENT DETAILS", {
    x: leftMargin,
    y,
    size: paymentTitleSize,
    font: fontBold,
    color: accentColor,
  });
  y -= paymentLineHeight + 2;

  page.drawText(`IBAN: ${input.iban}`, {
    x: leftMargin,
    y,
    size: paymentFontSize,
    font: fontRegular,
    color: textColor,
  });
  y -= paymentLineHeight;

  page.drawText(`SWIFT/BIC: ${input.swiftBic}`, {
    x: leftMargin,
    y,
    size: paymentFontSize,
    font: fontRegular,
    color: textColor,
  });
  y -= paymentLineHeight;

  if (input.accountNumber) {
    page.drawText(`Account Number: ${input.accountNumber}`, {
      x: leftMargin,
      y,
      size: paymentFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= paymentLineHeight;
  }

  if (input.sortCode) {
    page.drawText(`Sort Code: ${input.sortCode}`, {
      x: leftMargin,
      y,
      size: paymentFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= paymentLineHeight;
  }

  if (input.bankAddress) {
    page.drawText(`Bank Address: ${input.bankAddress}`, {
      x: leftMargin,
      y,
      size: paymentFontSize,
      font: fontRegular,
      color: textColor,
    });
    y -= paymentLineHeight;
  }

  // Notes
  if (input.notes) {
    y -= sectionSpacing * 0.5;
    page.drawText("NOTES", {
      x: leftMargin,
      y,
      size: paymentTitleSize,
      font: fontBold,
      color: accentColor,
    });
    y -= paymentLineHeight + 2;

    // Truncate notes if too long in compact mode
    const maxNotesLength = isVeryCompact ? 120 : isCompact ? 150 : 200;
    const truncatedNotes =
      input.notes.length > maxNotesLength
        ? input.notes.substring(0, maxNotesLength - 3) + "..."
        : input.notes;

    page.drawText(truncatedNotes, {
      x: leftMargin,
      y,
      size: paymentFontSize,
      font: fontRegular,
      color: textColor,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};
