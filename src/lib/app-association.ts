/**
 * What iOS reads from `/.well-known/apple-app-site-association` to link caley.app to the iOS app.
 * `webcredentials` is what lets the password manager (and iCloud Keychain) offer the saved caley.app
 * login on the app's sign-in screen. The identifier is `<Team ID>.<bundle ID>`: if either changes in
 * the Xcode project, change it here as well.
 */
export const APPLE_TEAM_ID = "X6J2X5D8W6";
export const IOS_BUNDLE_ID = "com.stevemckinnon.caley";

export const appSiteAssociation = {
  webcredentials: {
    apps: [`${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`],
  },
};
