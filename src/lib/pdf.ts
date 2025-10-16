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
    0
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

export const generateInvoicePdf = async (
  input: InvoicePdfInput
): Promise<Uint8Array> => {
  const totals = calculateInvoiceTotals(input);
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
    y: height - (headerHeight * 0.6),
    size: headerFontSize,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Invoice number and date (white text on colored background)
  page.drawText(`#${input.invoiceNumber}`, {
    x: rightMargin - 150,
    y: height - (headerHeight * 0.5),
    size: isVeryCompact ? 11 : isCompact ? 12 : 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(
    `Date: ${formatDateGB(input.invoiceDate)}`,
    {
      x: rightMargin - 150,
      y: height - (headerHeight * 0.7),
      size: isVeryCompact ? 8 : isCompact ? 9 : 10,
      font: fontRegular,
      color: rgb(0.9, 0.9, 0.9),
    }
  );

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
    }
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
  y = Math.min(billFromY, billToY) - (sectionSpacing * 1.5);

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
    y: tableHeaderY + (tablePadding * 0.25),
    size: itemFontSize,
    font: fontBold,
    color: textColor,
  });

  page.drawText("QTY", {
    x: rightMargin - 200,
    y: tableHeaderY + (tablePadding * 0.25),
    size: itemFontSize,
    font: fontBold,
    color: textColor,
  });

  page.drawText("RATE", {
    x: rightMargin - 140,
    y: tableHeaderY + (tablePadding * 0.25),
    size: itemFontSize,
    font: fontBold,
    color: textColor,
  });

  page.drawText("AMOUNT", {
    x: rightMargin - 75,
    y: tableHeaderY + (tablePadding * 0.25),
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
    amount: string
  ) => {
    // Truncate description if too long to prevent overflow
    const maxDescLength = isVeryCompact ? 45 : isCompact ? 55 : 65;
    const truncatedDesc = desc.length > maxDescLength 
      ? desc.substring(0, maxDescLength - 3) + '...' 
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
        fmt.format(cost)
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
      fmt.format(cost)
    );
  });

  // Draw custom expenses
  totals.customExpenseEntries.forEach((entry) => {
    drawLineItem(
      entry.description,
      entry.quantity.toString(),
      fmt.format(entry.unitPrice),
      fmt.format(entry.cost)
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
    y: y + (totalBoxHeight * 0.1),
    size: totalFontSize,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(fmt.format(totals.totalAmount), {
    x: rightMargin - 75,
    y: y + (totalBoxHeight * 0.15),
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
    const truncatedNotes = input.notes.length > maxNotesLength
      ? input.notes.substring(0, maxNotesLength - 3) + '...'
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
