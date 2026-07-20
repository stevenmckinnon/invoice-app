import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateNextInvoiceNumber } from "@/lib/invoice-number";

export const GET = async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nextNumber = await generateNextInvoiceNumber(session.user.id);
    return NextResponse.json({ invoiceNumber: nextNumber });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message ?? "Failed to generate invoice number" },
      { status: 500 },
    );
  }
};
