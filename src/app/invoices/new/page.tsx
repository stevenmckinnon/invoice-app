import NewInvoicePage from "./page-client";

import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "New Invoice",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ corrects?: string | string[] }>;
}) {
  const { corrects } = await searchParams;
  return (
    <NewInvoicePage
      corrects={typeof corrects === "string" ? corrects : undefined}
    />
  );
}
