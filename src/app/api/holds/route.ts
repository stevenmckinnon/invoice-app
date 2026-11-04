import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { holdInputSchema, holdSelect } from "@/lib/holds";

/** Every pencil you hold, confirmed ones too, by their first date */
export const GET = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const holds = await prisma.hold.findMany({
    where: { userId: session.user.id },
    select: holdSelect,
  });
  holds.sort((a, b) => (a.dates[0] ?? "").localeCompare(b.dates[0] ?? ""));
  return NextResponse.json(holds);
};

export const POST = async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = holdInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid pencil" },
      { status: 400 },
    );
  }
  // A clientId from another user would put your pencil on their client
  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, userId: session.user.id },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 400 });
  }
  const hold = await prisma.hold.create({
    data: { ...parsed.data, userId: session.user.id },
    select: holdSelect,
  });
  return NextResponse.json(hold, { status: 201 });
};
