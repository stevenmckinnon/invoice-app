import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/**
 * Avatars are stored as bytes in UserPhoto and served from here, with
 * `User.image` holding this route's URL.
 *
 * They used to be base64 data URIs in `User.image` itself, which better-auth
 * copies verbatim into the session cookie — one 4.6KB avatar pushed the cookie
 * past its 4093-byte limit, silently disabling the session cookie cache and
 * costing a database round-trip on every authenticated request. It also meant
 * every query that selected a user dragged the image along with it.
 */
const OUTPUT_CONTENT_TYPE = "image/jpeg";

/** Only the signed-in user's own avatar is ever displayed, so there's no id in
 * the URL and nothing to authorise beyond having a session. */
export const GET = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const photo = await prisma.userPhoto.findUnique({
    where: { userId: session.user.id },
  });

  if (!photo) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.contentType,
      // The URL carries a ?v= stamp that changes on every upload, so the bytes
      // at a given URL never change and can be cached hard — but only by the
      // one browser that's signed in
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
};

export const POST = async (req: NextRequest) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
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
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    // Read the file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 256px at quality 80 — the old 128px/q70 existed to keep the base64 small
    // enough for the session cookie, which no longer applies
    const optimizedBuffer = await sharp(buffer)
      .resize(256, 256, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Prisma's Bytes maps to Uint8Array<ArrayBuffer>; Node's Buffer is typed
    // over the wider ArrayBufferLike, so copy into a plain view
    const photoBytes = Uint8Array.from(optimizedBuffer);

    // The ?v= stamp busts the browser cache, which the immutable Cache-Control
    // on GET otherwise makes very sticky
    const imageUrl = `/api/profile/photo?v=${Date.now()}`;

    const [, updatedUser] = await prisma.$transaction([
      prisma.userPhoto.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          data: photoBytes,
          contentType: OUTPUT_CONTENT_TYPE,
        },
        update: {
          data: photoBytes,
          contentType: OUTPUT_CONTENT_TYPE,
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
        select: { id: true, image: true },
      }),
    ]);

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

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [, updatedUser] = await prisma.$transaction([
      prisma.userPhoto.deleteMany({ where: { userId: session.user.id } }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { image: null },
        select: { id: true, image: true },
      }),
    ]);

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
