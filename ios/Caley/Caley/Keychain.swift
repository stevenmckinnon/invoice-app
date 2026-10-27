import Foundation
import Security

/// Stores the bearer token. Kept out of UserDefaults because it grants access to
/// invoices that carry banking details.
enum Keychain {
    private static let service = "com.stevemckinnon.caley"
    private static let account = "auth-token"

    private static var query: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    static func read() -> String? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func write(_ token: String) {
        delete()
        var q = query
        q[kSecValueData as String] = Data(token.utf8)
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(q as CFDictionary, nil)
        #if DEBUG
        // -34018 means the build has no keychain entitlement (an unsigned build): the login then
        // lasts only until the app quits
        if status != errSecSuccess { print("Keychain: saving the token failed with status \(status)") }
        #endif
    }

    static func delete() {
        SecItemDelete(query as CFDictionary)
    }
}
