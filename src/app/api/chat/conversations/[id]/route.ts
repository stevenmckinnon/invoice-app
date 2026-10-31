import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  MAX_CONVERSATIONS,
  MAX_CONVERSATION_BYTES,
  conversationTitle,
  isValidConversationId,
  saveConversationInput,
} from "@/lib/chat-conversations";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

const noStore = { "Cache-Control": "private, no-store" };

const signedInUser = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
};

/** One saved chat, with its messages */
export const GET = async (_req: NextRequest, { params }: RouteContext) => {
  const userId = await signedInUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!isValidConversationId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const conversation = await prisma.chatConversation.findFirst({
    where: { id, userId },
    select: { id: true, title: true, messages: true, updatedAt: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(conversation, { headers: noStore });
};

/**
 * Save a chat under an id the client chose, creating it the first time. The
 * title is the first thing you asked. An id that already belongs to someone
 * else answers as if it didn't exist, so it can't be probed.
 */
export const PUT = async (req: NextRequest, { params }: RouteContext) => {
  const userId = await signedInUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!isValidConversationId(id)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_CONVERSATION_BYTES) {
    return NextResponse.json(
      { error: "This conversation is too long to save. Start a new chat." },
      { status: 413 },
    );
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = saveConversationInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
  }
  const { messages } = parsed.data;

  const existing = await prisma.chatConversation.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (existing && existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = {
    title: conversationTitle(
      messages as Array<{ role: string; parts: Array<{ type?: string; text?: unknown }> }>,
    ),
    messages: messages as never,
  };
  const saved = await prisma.chatConversation.upsert({
    where: { id },
    create: { id, userId, ...data },
    update: data,
    select: { id: true, title: true, updatedAt: true },
  });

  // A new chat can push the oldest out, so history never grows without limit
  if (!existing) {
    const stale = await prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      skip: MAX_CONVERSATIONS,
      select: { id: true },
    });
    if (stale.length > 0) {
      await prisma.chatConversation.deleteMany({
        where: { userId, id: { in: stale.map((c) => c.id) } },
      });
    }
  }

  return NextResponse.json(saved, { headers: noStore });
};

export const DELETE = async (_req: NextRequest, { params }: RouteContext) => {
  const userId = await signedInUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!isValidConversationId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Scoped to the user, so someone else's id deletes nothing
  await prisma.chatConversation.deleteMany({ where: { id, userId } });
  return new Response(null, { status: 204 });
};
