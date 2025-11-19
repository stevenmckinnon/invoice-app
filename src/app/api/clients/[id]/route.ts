import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const clientInputSchema = z.object({
  name: z.string().min(1),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  attentionTo: z.string().optional(),
  dayRate: z.string().optional(),
  perDiemWork: z.string().optional(),
  perDiemTravel: z.string().optional(),
});

export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the client belongs to the user
    const existingClient = await prisma.client.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const json = await req.json();
    const parsed = clientInputSchema.parse(json);

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: parsed.name,
        addressLine1: parsed.addressLine1,
        addressLine2: parsed.addressLine2,
        city: parsed.city,
        state: parsed.state,
        postalCode: parsed.postalCode,
        country: parsed.country,
        attentionTo: parsed.attentionTo,
        dayRate: parsed.dayRate ? Number(parsed.dayRate) : null,
        perDiemWork: parsed.perDiemWork ? Number(parsed.perDiemWork) : null,
        perDiemTravel: parsed.perDiemTravel
          ? Number(parsed.perDiemTravel)
          : null,
      },
      select: {
        id: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        attentionTo: true,
        dayRate: true,
        perDiemWork: true,
        perDiemTravel: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Unexpected error" },
      { status: 400 },
    );
  }
};

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the client belongs to the user
    const existingClient = await prisma.client.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Unexpected error" },
      { status: 400 },
    );
  }
};

