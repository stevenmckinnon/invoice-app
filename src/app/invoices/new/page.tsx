import NewInvoicePage from "./page-client";

import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "New Invoice",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ corrects?: string | string[]; hold?: string | string[] }>;
}) {
  const { corrects, hold } = await searchParams;
  return (
    <NewInvoicePage
      corrects={typeof corrects === "string" ? corrects : undefined}
      hold={typeof hold === "string" ? hold : undefined}
    />
  );
}
