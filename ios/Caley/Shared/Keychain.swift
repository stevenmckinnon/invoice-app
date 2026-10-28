import Foundation
import Security

/// Stores the bearer token. Kept out of UserDefaults because it grants access to
/// invoices that carry banking details.
///
/// The token lives in a keychain access group shared with the widget extension, so the widgets can
/// fetch their own numbers. The group name carries the team prefix, which the build fills into
/// `CaleyKeychainGroup` in both Info.plists (and into the entitlements of both targets).
enum Keychain {
    private static let service = "com.stevemckinnon.caley"
    private static let account = "auth-token"

    private static var sharedGroup: String? {
        Bundle.main.object(forInfoDictionaryKey: "CaleyKeychainGroup") as? String
    }

    private static var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    private static func fetch(_ query: [String: Any]) -> String? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// `migrate` moves a token saved before the shared group existed into it. Only the app does that:
    /// the widget just reads what the app has put there.
    static func read(migrate: Bool = true) -> String? {
        if let group = sharedGroup {
            var q = baseQuery
            q[kSecAttrAccessGroup as String] = group
            if let token = fetch(q) { return token }
        }
        guard migrate, let legacy = fetch(baseQuery) else { return nil }
        // Found outside the shared group (or no group is configured): rewrite it into the group
        write(legacy)
        return legacy
    }

    static func write(_ token: String) {
        delete()
        var q = baseQuery
        if let group = sharedGroup { q[kSecAttrAccessGroup as String] = group }
        q[kSecValueData as String] = Data(token.utf8)
        // After first unlock, so a widget can refresh in the background while the phone is locked
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(q as CFDictionary, nil)
        #if DEBUG
        // -34018 means the build has no keychain entitlement (an unsigned build): the login then
        // lasts only until the app quits
        if status != errSecSuccess { print("Keychain: saving the token failed with status \(status)") }
        #endif
    }

    /// Without a group in the query this reaches every group the process can see, so it clears the
    /// old item and the shared one alike.
    static func delete() {
        SecItemDelete(baseQuery as CFDictionary)
    }
}
