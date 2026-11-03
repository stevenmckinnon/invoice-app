/**
 * What an invoice needs from your profile: your name, an address, and the
 * bank details it asks the client to pay into. The invoice routes refuse
 * without them, so the editor and the assistant check the same list up front
 * instead of at the last click.
 */
export interface ProfileFields {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  iban?: string | null;
  swiftBic?: string | null;
  accountNumber?: string | null;
  sortCode?: string | null;
}

export type ProfileGap = "name" | "address" | "bank";

/** The name an invoice is made out in */
export const profileName = (profile: ProfileFields | null | undefined) =>
  (
    profile?.fullName ||
    profile?.name ||
    `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`
  ).trim();

const blank = (value: string | null | undefined) => !value?.trim();

/**
 * Bank details a client can pay into: an IBAN with its SWIFT/BIC for an
 * international payment, or a sort code with its account number for a UK
 * one. Either whole pair will do; half of one won't.
 */
export const hasBankDetails = (profile: ProfileFields | null | undefined) =>
  (!blank(profile?.iban) && !blank(profile?.swiftBic)) ||
  (!blank(profile?.sortCode) && !blank(profile?.accountNumber));

export const BANK_DETAILS_MESSAGE =
  "Add bank details to invoice from: a sort code and account number, or an IBAN and SWIFT/BIC.";

/** Which of the three groups still has something missing */
export const profileGaps = (
  profile: ProfileFields | null | undefined,
): ProfileGap[] => {
  const gaps: ProfileGap[] = [];
  if (!profileName(profile)) gaps.push("name");
  if (
    [
      profile?.addressLine1,
      profile?.city,
      profile?.postalCode,
      profile?.country,
    ].some(blank)
  ) {
    gaps.push("address");
  }
  if (!hasBankDetails(profile)) gaps.push("bank");
  return gaps;
};

const LABELS: Record<ProfileGap, string> = {
  name: "your name",
  address: "your address",
  bank: "your bank details (a sort code and account number, or an IBAN and SWIFT)",
};

/** "your address and your bank details (…)" */
export const describeGaps = (gaps: ProfileGap[]): string => {
  const parts = gaps.map((gap) => LABELS[gap]);
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
};
