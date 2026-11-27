import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getVerifyEmailHtml } from "@/lib/email-templates";
import { clientIp, isDisposableEmail } from "@/lib/signup-guard";

describe("isDisposableEmail", () => {
  it("refuses the addresses the 27 Nov probe used", () => {
    assert.ok(isDisposableEmail("caley.probe.1795762763@mailinator.com"));
    assert.ok(isDisposableEmail("probe1795766927@example.com"));
  });

  it("ignores case, a trailing dot and subdomains", () => {
    assert.ok(isDisposableEmail("Someone@MAILINATOR.COM"));
    assert.ok(isDisposableEmail("someone@mailinator.com."));
    assert.ok(isDisposableEmail("someone@inbox.mailinator.com"));
  });

  it("lets real and local addresses through", () => {
    assert.ok(!isDisposableEmail("someone@gmail.com"));
    assert.ok(!isDisposableEmail("someone@icloud.com"));
    // A domain that merely ends with a listed one's letters isn't it
    assert.ok(!isDisposableEmail("someone@notmailinator.com"));
    // The seed and the App Store demo script sign up .test accounts
    assert.ok(!isDisposableEmail("dev@caley.test"));
    assert.ok(!isDisposableEmail("not-an-email"));
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry, then x-real-ip", () => {
    assert.equal(
      clientIp(new Headers({ "x-forwarded-for": "191.124.248.9, 10.0.0.1" })),
      "191.124.248.9",
    );
    assert.equal(clientIp(new Headers({ "x-real-ip": "203.0.113.7" })), "203.0.113.7");
  });

  it("is null without a request, as when the seed signs up", () => {
    assert.equal(clientIp(undefined), null);
    assert.equal(clientIp(new Headers()), null);
  });
});

describe("sign-up hook", () => {
  it("refuses a disposable address before an account is made", async () => {
    // The hook throws before the handler runs, so no database is needed
    const { auth } = await import("@/lib/auth");
    await assert.rejects(
      auth.api.signUpEmail({
        body: {
          email: "caley.a2.1795764984@mailinator.com",
          password: "probepassword123",
          name: "Probe",
        },
      }),
      (error: { status?: string; body?: { code?: string } }) => {
        assert.equal(error.status, "BAD_REQUEST");
        assert.equal(error.body?.code, "DISPOSABLE_EMAIL");
        return true;
      },
    );
  });
});

describe("verification email", () => {
  it("escapes the address, which is user input", () => {
    const html = getVerifyEmailHtml({
      verifyUrl: "https://caley.app/api/auth/verify-email?token=t",
      userEmail: '"><img src=x>@gmail.com',
    });
    assert.ok(!html.includes("<img src=x>"));
    assert.ok(html.includes("&quot;&gt;&lt;img src=x&gt;@gmail.com"));
    assert.ok(html.includes("https://caley.app/api/auth/verify-email?token=t"));
  });
});
