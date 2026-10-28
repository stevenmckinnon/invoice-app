import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  APPLE_TEAM_ID,
  IOS_BUNDLE_ID,
  appSiteAssociation,
} from "@/lib/app-association";
import { config } from "@/proxy";

/** Whether the auth proxy runs for a path, per its `matcher` */
const proxyRunsOn = (pathname: string) =>
  config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(pathname));

describe("apple-app-site-association", () => {
  it("links the password manager to the iOS app by team and bundle ID", () => {
    assert.deepEqual(appSiteAssociation, {
      webcredentials: { apps: [`${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`] },
    });
    assert.match(APPLE_TEAM_ID, /^[A-Z0-9]{10}$/);
  });

  it("is not behind the sign-in redirect: Apple fetches it with no login", () => {
    assert.equal(proxyRunsOn("/.well-known/apple-app-site-association"), false);
  });

  it("leaves the proxy on for the pages that need a login", () => {
    for (const path of ["/dashboard", "/invoices", "/profile", "/chat"]) {
      assert.equal(proxyRunsOn(path), true, path);
    }
  });
});
