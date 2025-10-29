import { NextResponse } from "next/server";

import { generateNextInvoiceNumber } from "@/lib/invoice-number";

export const GET = async () => {
  try {
    const nextNumber = await generateNextInvoiceNumber();
    return NextResponse.json({ invoiceNumber: nextNumber });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message ?? "Failed to generate invoice number" },
      { status: 500 },
    );
  }
};
