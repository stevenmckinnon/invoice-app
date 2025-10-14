/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { generateNextInvoiceNumber } from "@/lib/invoice-number";

export const GET = async () => {
  try {
    const nextNumber = await generateNextInvoiceNumber();
    return NextResponse.json({ invoiceNumber: nextNumber });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to generate invoice number" },
      { status: 500 }
    );
  }
};

