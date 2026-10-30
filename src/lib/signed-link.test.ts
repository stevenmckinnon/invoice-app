import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PDF_LINK_TTL_SECONDS, signPdfLink, verifyPdfLink } from "./signed-link";

const now = Date.UTC(2026, 9, 30, 12, 0, 0);

describe("signed PDF links", () => {
  it("opens the invoice it was made for, as the user it was made for", () => {
    const link = signPdfLink("inv-1", "user-1", now);
    assert.equal(verifyPdfLink("inv-1", link, now), "user-1");
  });

  it("is good for ten minutes and not a second longer", () => {
    const link = signPdfLink("inv-1", "user-1", now);
    const ttl = PDF_LINK_TTL_SECONDS * 1000;
    assert.equal(verifyPdfLink("inv-1", link, now + ttl), "user-1");
    assert.equal(verifyPdfLink("inv-1", link, now + ttl + 1000), null);
  });

  it("is refused for a different invoice", () => {
    const link = signPdfLink("inv-1", "user-1", now);
    assert.equal(verifyPdfLink("inv-2", link, now), null);
  });

  it("is refused when the user is swapped", () => {
    const link = signPdfLink("inv-1", "user-1", now);
    assert.equal(verifyPdfLink("inv-1", { ...link, u: "user-2" }, now), null);
  });

  it("is refused when the expiry is pushed out", () => {
    const link = signPdfLink("inv-1", "user-1", now);
    const later = String(Number(link.exp) + 86_400);
    assert.equal(verifyPdfLink("inv-1", { ...link, exp: later }, now), null);
  });

  it("is refused when the signature is cut, wrong or missing", () => {
    const link = signPdfLink("inv-1", "user-1", now);
    assert.equal(
      verifyPdfLink("inv-1", { ...link, sig: link.sig.slice(0, -2) }, now),
      null,
    );
    assert.equal(verifyPdfLink("inv-1", { ...link, sig: "x".repeat(43) }, now), null);
    assert.equal(verifyPdfLink("inv-1", { ...link, sig: "" }, now), null);
    assert.equal(verifyPdfLink("inv-1", { u: null, exp: null, sig: null }, now), null);
  });
});
