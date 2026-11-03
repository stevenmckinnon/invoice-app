/**
 * What iOS reads from `/.well-known/apple-app-site-association` to link caley.app to the iOS app.
 * `webcredentials` is what lets the password manager (and iCloud Keychain) offer the saved caley.app
 * login on the app's sign-in screen. `applinks` makes the pages the app has open in it instead of
 * Safari (an invoice from the Claude connector's link, say). The identifier is
 * `<Team ID>.<bundle ID>`: if either changes in the Xcode project, change it here as well.
 */
export const APPLE_TEAM_ID = "X6J2X5D8W6";
export const IOS_BUNDLE_ID = "com.stevemckinnon.caley";

const APP_ID = `${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`;

/**
 * The paths the app opens, read top to bottom with the first match winning, which is why the
 * exclusions come first. Everything else stays in Safari: sign-in, the profile, the PDF and other
 * API routes, and starting a corrected invoice (the app corrects from the invoice itself).
 * `AppLink.route(from:)` in `AppNavigation.swift` is the app's half; keep the two in step.
 */
export const APP_LINK_COMPONENTS = [
  { "/": "/invoices/new", "?": { corrects: "?*" }, exclude: true },
  { "/": "/dashboard" },
  { "/": "/invoices" },
  { "/": "/invoices/*" },
  { "/": "/clients" },
  { "/": "/chat" },
];

export const appSiteAssociation = {
  applinks: {
    details: [{ appIDs: [APP_ID], components: APP_LINK_COMPONENTS }],
  },
  webcredentials: {
    apps: [APP_ID],
  },
};
