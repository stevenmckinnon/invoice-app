import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export const POST = async (req: NextRequest) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { password, confirmation } = body;

    // Verify confirmation text
    if (confirmation !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        { error: "Invalid confirmation text" },
        { status: 400 },
      );
    }

    // Verify password before deletion
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: "credential",
      },
    });

    if (!account?.password) {
      return NextResponse.json(
        { error: "Unable to verify account" },
        { status: 400 },
      );
    }

    // Verify password using better-auth
    const bcrypt = require("bcryptjs");
    const isValid = await bcrypt.compare(password, account.password);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Delete user and all related data (cascading delete configured in Prisma schema)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
};
