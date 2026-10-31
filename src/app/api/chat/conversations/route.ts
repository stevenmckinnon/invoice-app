import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { MAX_CONVERSATIONS } from "@/lib/chat-conversations";
import { prisma } from "@/lib/db";

/** Your saved assistant chats, newest first: enough to draw a history list */
export const GET = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.chatConversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: MAX_CONVERSATIONS,
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json(conversations, {
    headers: { "Cache-Control": "private, no-store" },
  });
};
