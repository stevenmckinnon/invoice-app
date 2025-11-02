import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { parseDate } from "@/lib/utils";

const prisma = new PrismaClient();

export const GET = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        fullName: true,
        image: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        dateOfBirth: true,
        iban: true,
        swiftBic: true,
        accountNumber: true,
        sortCode: true,
        bankAddress: true,
        currency: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
      name,
      fullName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      dateOfBirth,
      iban,
      swiftBic,
      accountNumber,
      sortCode,
      bankAddress,
      currency,
    } = body;

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        firstName,
        lastName,
        name: name || fullName || `${firstName} ${lastName}`.trim(),
        fullName: fullName || `${firstName} ${lastName}`.trim(),
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        dateOfBirth: dateOfBirth ? parseDate(dateOfBirth) : null,
        iban,
        swiftBic,
        accountNumber,
        sortCode,
        bankAddress,
        currency,
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        fullName: true,
        image: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        dateOfBirth: true,
        iban: true,
        swiftBic: true,
        accountNumber: true,
        sortCode: true,
        bankAddress: true,
        currency: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
