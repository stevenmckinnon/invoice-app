import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();
const MAX_FILE_SIZE = 512 * 1024; // 512KB for base64 storage (smaller to stay under DB limits)
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const POST = async (req: NextRequest) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload JPEG, PNG, or WebP." },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 512KB." },
        { status: 400 },
      );
    }

    // Read the file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Resize and optimize the image using sharp - compress aggressively for DB storage
    const optimizedBuffer = await sharp(buffer)
      .resize(128, 128, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 70 })
      .toBuffer();

    // Convert to base64 data URL
    const base64Image = `data:image/jpeg;base64,${optimizedBuffer.toString("base64")}`;

    // Update user with base64 image
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        image: base64Image,
      },
      select: {
        id: true,
        image: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

export const DELETE = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        image: null,
      },
      select: {
        id: true,
        image: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

