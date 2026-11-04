import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  holdSelect,
  holdUpdateSchema,
  isPencilled,
  promotedByRelease,
} from "@/lib/holds";

type RouteContext = { params: Promise<{ id: string }> };

/** Change a pencil's job, dates or rank. A confirmed one is its invoice's now. */
export const PATCH = async (req: NextRequest, { params }: RouteContext) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = holdUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid pencil" },
      { status: 400 },
    );
  }
  const hold = await prisma.hold.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, invoiceId: true },
  });
  if (!hold) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (hold.invoiceId) {
    return NextResponse.json(
      { error: "This job is confirmed: change its days on the invoice." },
      { status: 409 },
    );
  }
  if (parsed.data.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, userId: session.user.id },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 400 });
    }
  }
  const updated = await prisma.hold.update({
    where: { id },
    data: parsed.data,
    select: holdSelect,
  });
  return NextResponse.json(updated);
};

/**
 * Release a pencil (or take a confirmed job off the Diary; its invoice stays).
 * Releasing a 1st moves the 2nd pencils on its dates up, in the same step.
 */
export const DELETE = async (_req: NextRequest, { params }: RouteContext) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const holds = await prisma.hold.findMany({
    where: { userId: session.user.id },
    select: { id: true, dates: true, rank: true, invoiceId: true },
  });
  const released = holds.find((hold) => hold.id === id);
  if (!released) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const promoted = isPencilled(released) ? promotedByRelease(holds, released) : [];
  await prisma.$transaction([
    prisma.hold.delete({ where: { id } }),
    prisma.hold.updateMany({
      where: { id: { in: promoted }, userId: session.user.id },
      data: { rank: 1 },
    }),
  ]);
  return NextResponse.json({ promoted });
};
