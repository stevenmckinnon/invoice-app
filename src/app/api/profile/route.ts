import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma";
import { parseDate } from "@/lib/utils";

const prisma = new PrismaClient();


export const GET = async () => {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        fullName: true,
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
        dayRate: true,
        perDiemWork: true,
        perDiemTravel: true,
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
      { status: 500 }
    );
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
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
      dayRate,
      perDiemWork,
      perDiemTravel,
    } = body;

    // Combine firstName and lastName to create fullName
    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || null;

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        firstName,
        lastName,
        fullName,
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
        dayRate: dayRate ? Number(dayRate) : null,
        perDiemWork: perDiemWork ? Number(perDiemWork) : null,
        perDiemTravel: perDiemTravel ? Number(perDiemTravel) : null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        fullName: true,
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
        dayRate: true,
        perDiemWork: true,
        perDiemTravel: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
