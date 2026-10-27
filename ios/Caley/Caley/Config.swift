import Foundation

enum Config {
    /// Where the debug build looks for `pnpm dev` by default: the simulator reaches the Mac at
    /// localhost, a real phone needs the Mac's Bonjour name (stable across DHCP changes).
    static let defaultDebugURL: URL = {
        #if targetEnvironment(simulator)
        URL(string: "http://localhost:3000")!
        #else
        URL(string: "http://Steves-MacBook-Pro.local:3000")!
        #endif
    }()

    #if DEBUG
    static let debugServerKey = "debugServerURL"

    /// Debug builds let you point at another address from the sign-in screen, so a phone on a
    /// network where the `.local` name doesn't resolve can use the Mac's IP without a rebuild.
    static var debugOverride: URL? {
        guard let text = UserDefaults.standard.string(forKey: debugServerKey) else { return nil }
        return normalised(text)
    }

    /// What iOS allows over plain HTTP here (NSAllowsLocalNetworking): a real IP address, a `.local`
    /// name or a bare hostname. Anything else is treated as a public site and refused.
    static func isLocalHost(_ host: String) -> Bool {
        let parts = host.split(separator: ".", omittingEmptySubsequences: false)
        let looksNumeric = parts.allSatisfy { !$0.isEmpty && $0.allSatisfy(\.isNumber) }
        if looksNumeric {
            // A real IPv4 address: exactly four parts, each 0 to 255
            return parts.count == 4 && parts.allSatisfy { Int($0).map { $0 <= 255 } ?? false }
        }
        return !host.contains(".") || host.hasSuffix(".local") || host.contains(":")
    }

    /// Accepts "192.168.1.97:3000" as well as a full URL; nil if it isn't usable
    static func normalised(_ text: String) -> URL? {
        var s = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !s.isEmpty else { return nil }
        if !s.contains("://") { s = "http://" + s }
        guard let url = URL(string: s), url.host() != nil else { return nil }
        return url
    }
    #endif

    /// Release builds talk to production.
    static var baseURL: URL {
        #if DEBUG
        debugOverride ?? defaultDebugURL
        #else
        URL(string: "https://caley.app")!
        #endif
    }
}
