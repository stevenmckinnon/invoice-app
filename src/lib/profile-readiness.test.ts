import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  describeGaps,
  profileGaps,
  profileName,
} from "@/lib/profile-readiness";

const complete = {
  fullName: "Steve McKinnon",
  addressLine1: "1 Test Street",
  city: "Glasgow",
  postalCode: "G1 1AA",
  country: "United Kingdom",
  iban: "GB00TEST00000000000000",
  swiftBic: "TESTGB2L",
};

describe("profileGaps", () => {
  it("has nothing to say about a complete profile", () => {
    assert.deepEqual(profileGaps(complete), []);
  });

  it("names every group when there's no profile yet", () => {
    assert.deepEqual(profileGaps(null), ["name", "address", "bank"]);
    assert.deepEqual(profileGaps({}), ["name", "address", "bank"]);
  });

  it("counts an address as missing if any part of it is", () => {
    for (const field of ["addressLine1", "city", "postalCode", "country"] as const) {
      assert.deepEqual(profileGaps({ ...complete, [field]: "" }), ["address"], field);
    }
  });

  it("needs both IBAN and SWIFT for the bank details", () => {
    assert.deepEqual(profileGaps({ ...complete, iban: null }), ["bank"]);
    assert.deepEqual(profileGaps({ ...complete, swiftBic: "  " }), ["bank"]);
  });

  it("takes a name from the full name, the account name or first and last", () => {
    assert.equal(profileName({ fullName: "A B" }), "A B");
    assert.equal(profileName({ name: "Account Name" }), "Account Name");
    assert.equal(profileName({ firstName: "Steve", lastName: "McKinnon" }), "Steve McKinnon");
    assert.equal(profileName({ firstName: "Steve" }), "Steve");
    assert.deepEqual(profileGaps({ ...complete, fullName: "", firstName: "Steve", lastName: "M" }), []);
    assert.deepEqual(profileGaps({ ...complete, fullName: " " }), ["name"]);
  });
});

describe("describeGaps", () => {
  it("reads as a short list", () => {
    assert.equal(describeGaps(["address"]), "your address");
    assert.equal(
      describeGaps(["address", "bank"]),
      "your address and your bank details (IBAN and SWIFT)",
    );
    assert.equal(
      describeGaps(["name", "address", "bank"]),
      "your name, your address and your bank details (IBAN and SWIFT)",
    );
    assert.equal(describeGaps([]), "");
  });
});
