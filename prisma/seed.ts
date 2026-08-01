/**
 * Seeds the local development database with a signed-in-able user, a few
 * clients and a spread of invoices — enough for the dashboard, the invoice
 * list, the PDF and the AI assistant to all have something real to work with.
 *
 *   pnpm db:seed
 *
 * Re-running is safe: the seeded user is deleted first and everything else
 * cascades from it.
 */
// Env comes from the `--env-file-if-exists` flags in the db:seed script rather
// than dotenv in here: static imports are hoisted, so db.ts would read
// DATABASE_URL before any in-file config() call could set it.
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/db";
import { calculateInvoiceTotals } from "../src/lib/pdf";

const SEED_EMAIL = "dev@caley.test";
const SEED_PASSWORD = "devpassword123";

/**
 * The entire point of this script is to keep local work off the live database,
 * so refuse to run anywhere that isn't obviously local. Set SEED_ALLOW_REMOTE=1
 * if you ever genuinely mean it.
 */
const assertLocalDatabase = () => {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("DATABASE_URL is not set.");
  if (process.env.SEED_ALLOW_REMOTE === "1") return;

  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();

  const isLocal = ["localhost", "127.0.0.1", "::1", "postgres", "db"].includes(
    host,
  );
  if (!isLocal) {
    throw new Error(
      `Refusing to seed a non-local database (host: ${host || "unparseable"}).\n` +
        `This script deletes and recreates data. Start the local database with ` +
        `\`pnpm db:local:up\` and make sure .env.local points at it.`,
    );
  }
};

const profile = {
  fullName: "Steve McKinnon",
  firstName: "Steve",
  lastName: "McKinnon",
  addressLine1: "42 Rigging Lane",
  city: "Glasgow",
  state: "",
  postalCode: "G1 2AB",
  country: "United Kingdom",
  iban: "GB29NWBK60161331926819",
  swiftBic: "NWBKGB2L",
  accountNumber: "31926819",
  sortCode: "60-16-13",
  bankAddress: "National Westminster Bank, 1 Princes Street, London",
  currency: "GBP",
};

type SeedItem = { description: string; quantity: number; unitPrice: number };
type SeedOvertime = { date: string; hours: number; rateType: "1.5x" | "2x" };
type SeedExpense = { description: string; quantity: number; unitPrice: number };

/**
 * Totals come from the same helper the PDF and detail page use, so seeded
 * invoices can't be born with a stored total the app would render differently.
 */
const buildInvoice = (input: {
  userId: string;
  clientId: string | null;
  // Nullable rather than optional: these come straight off a Prisma Client row
  client: {
    name: string;
    addressLine1?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    attentionTo?: string | null;
  } | null;
  invoiceNumber: string;
  invoiceDate: string;
  showName: string;
  status: string;
  items: SeedItem[];
  overtime?: SeedOvertime[];
  expenses?: SeedExpense[];
  notes?: string;
}) => {
  const items = input.items.map((i) => ({
    ...i,
    cost: i.quantity * i.unitPrice,
  }));
  const overtimeEntries = input.overtime ?? [];
  const customExpenseEntries = (input.expenses ?? []).map((e) => ({
    ...e,
    cost: e.quantity * e.unitPrice,
  }));

  const totals = calculateInvoiceTotals({
    currency: "GBP",
    items,
    overtimeEntries,
    customExpenseEntries,
  } as never);

  return {
    userId: input.userId,
    clientId: input.clientId,
    invoiceNumber: input.invoiceNumber,
    invoiceDate: new Date(input.invoiceDate),
    showName: input.showName,
    fullName: profile.fullName,
    email: SEED_EMAIL,
    addressLine1: profile.addressLine1,
    city: profile.city,
    postalCode: profile.postalCode,
    country: profile.country,
    clientName: input.client?.name,
    clientAddress1: input.client?.addressLine1,
    clientCity: input.client?.city,
    clientPostalCode: input.client?.postalCode,
    clientCountry: input.client?.country,
    attentionTo: input.client?.attentionTo,
    iban: profile.iban,
    swiftBic: profile.swiftBic,
    accountNumber: profile.accountNumber,
    sortCode: profile.sortCode,
    bankAddress: profile.bankAddress,
    currency: "GBP",
    regularHours: 0,
    overtimeHours: 0,
    regularRate: 0,
    overtimeRate: 0,
    perDiemDays: 0,
    perDiemRate: 0,
    travelDays: 0,
    travelDayRate: 0,
    subtotalLabor: totals.totalAmount,
    subtotalPerDiem: 0,
    subtotalTravel: 0,
    totalAmount: totals.totalAmount,
    status: input.status,
    notes: input.notes,
    items: { createMany: { data: items } },
    overtimeEntries: {
      createMany: {
        data: overtimeEntries.map((e) => ({ ...e, date: new Date(e.date) })),
      },
    },
    customExpenseEntries: { createMany: { data: customExpenseEntries } },
  };
};

const main = async () => {
  assertLocalDatabase();

  // Idempotent: everything below cascades from the user
  await prisma.user.deleteMany({ where: { email: SEED_EMAIL } });

  // Created through better-auth so the password hash is one it can verify —
  // hand-writing a User row would produce an account that can't sign in
  await auth.api.signUpEmail({
    body: {
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      name: profile.fullName,
    },
  });

  const user = await prisma.user.update({
    where: { email: SEED_EMAIL },
    data: { ...profile, emailVerified: true },
  });

  const wwe = await prisma.client.create({
    data: {
      userId: user.id,
      name: "World Wrestling Entertainment, Inc.",
      // No "Attn:" prefix — the invoice view adds one
      attentionTo: "Production Ops",
      addressLine1: "120 Hamilton Avenue",
      city: "Stamford",
      state: "CT",
      postalCode: "06902",
      country: "United States",
      dayRate: 525,
      perDiemWork: 50,
      perDiemTravel: 70,
      // The tiered client: first 2 hours a day at 1.5x, then 2x
      overtimeTierHours: 2,
      overtimeFirstRate: "1.5x",
      overtimeAfterRate: "2x",
    },
  });

  const mallard = await prisma.client.create({
    data: {
      userId: user.id,
      name: "Mallard Productions",
      addressLine1: "8 Cargo Way",
      city: "Hillington",
      postalCode: "G52 4RU",
      country: "United Kingdom",
      dayRate: 150,
      perDiemWork: 35,
      perDiemTravel: 35,
      // Deliberately no tiering, so both code paths are represented
    },
  });

  // No rates at all — exercises the "ask the user for a day rate" paths
  await prisma.client.create({
    data: {
      userId: user.id,
      name: "Capsize Technology Ltd",
      addressLine1: "3 Clyde Place",
      city: "Glasgow",
      postalCode: "G5 8AQ",
      country: "United Kingdom",
    },
  });

  const invoices = [
    buildInvoice({
      userId: user.id,
      clientId: wwe.id,
      client: wwe,
      invoiceNumber: "INV-2601",
      invoiceDate: "2026-05-18",
      showName: "WWE Backlash 2026",
      status: "paid",
      items: [
        { description: "Travel Days", quantity: 2, unitPrice: 525 },
        { description: "Work Days", quantity: 5, unitPrice: 525 },
        { description: "Per Diems Travel Days", quantity: 2, unitPrice: 70 },
        { description: "Per Diems Work Days", quantity: 5, unitPrice: 50 },
      ],
      // A tiered day: the first 2 hours at 1.5x, the rest at 2x
      overtime: [
        { date: "2026-05-16", hours: 2, rateType: "1.5x" },
        { date: "2026-05-16", hours: 3, rateType: "2x" },
      ],
    }),
    buildInvoice({
      userId: user.id,
      clientId: wwe.id,
      client: wwe,
      invoiceNumber: "INV-2602",
      invoiceDate: "2026-06-29",
      showName: "WWE Money in the Bank 2026",
      status: "paid",
      items: [
        { description: "Travel Days", quantity: 2, unitPrice: 525 },
        { description: "Work Days", quantity: 4, unitPrice: 525 },
        { description: "Dark days", quantity: 1, unitPrice: 525 },
        { description: "Per Diems Work Days", quantity: 4, unitPrice: 50 },
      ],
      expenses: [{ description: "Kit rental", quantity: 3, unitPrice: 120 }],
    }),
    buildInvoice({
      userId: user.id,
      clientId: mallard.id,
      client: mallard,
      invoiceNumber: "INV-2603",
      invoiceDate: "2026-07-10",
      showName: "Riverside Sessions",
      status: "sent",
      items: [
        { description: "Work Days", quantity: 6, unitPrice: 150 },
        { description: "Per Diems Work Days", quantity: 6, unitPrice: 35 },
      ],
      overtime: [{ date: "2026-07-08", hours: 3, rateType: "1.5x" }],
    }),
    buildInvoice({
      userId: user.id,
      clientId: mallard.id,
      client: mallard,
      invoiceNumber: "INV-2604",
      invoiceDate: "2026-06-02",
      showName: "Harbour Lights Pilot",
      status: "overdue",
      items: [{ description: "Work Days", quantity: 3, unitPrice: 150 }],
      notes: "Chased 12 July.",
    }),
    buildInvoice({
      userId: user.id,
      clientId: wwe.id,
      client: wwe,
      invoiceNumber: "INV-2605",
      invoiceDate: "2026-08-01",
      showName: "WWE SummerSlam 2026",
      status: "draft",
      items: [
        { description: "Travel Days", quantity: 2, unitPrice: 525 },
        { description: "Work Days", quantity: 4, unitPrice: 525 },
      ],
      overtime: [
        { date: "2026-07-29", hours: 2, rateType: "1.5x" },
        { date: "2026-07-29", hours: 3, rateType: "2x" },
      ],
    }),
  ];

  for (const data of invoices) {
    await prisma.invoice.create({ data: data as never });
  }

  const total = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
  console.log(`Seeded ${SEED_EMAIL} / ${SEED_PASSWORD}`);
  console.log(
    `  3 clients (1 with tiered overtime), ${invoices.length} invoices, £${total.toFixed(2)} billed`,
  );
};

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
