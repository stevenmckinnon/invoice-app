import Foundation
import Network

/// The last good answer to each read the app makes, kept on the device so a dead-signal moment
/// shows what was last loaded instead of an error. It stores the server's raw response, so the
/// models need no second way of being encoded. Invoices carry bank details, so the files are
/// encrypted at rest, kept out of backups, and wiped on sign-out.
enum DiskCache {
    private static let directory = URL.applicationSupportDirectory.appending(path: "cache", directoryHint: .isDirectory)

    /// Only reads whose staleness is harmless. The next invoice number is not one of them: a saved
    /// answer would hand out a number that is already taken. PDFs and the tax-year export are fetched
    /// on demand.
    static func isCacheable(_ path: String) -> Bool {
        if path == "api/invoices" || path == "api/clients" || path == "api/profile" { return true }
        guard path.hasPrefix("api/invoices/") else { return false }
        let rest = path.dropFirst("api/invoices/".count)
        return !rest.isEmpty && !rest.contains("/") && rest != "next-number" && !rest.hasPrefix("export")
    }

    private static func file(for path: String) -> URL {
        let name = path.map { $0.isLetter || $0.isNumber || $0 == "-" ? String($0) : "_" }.joined()
        return directory.appending(path: "\(name).json")
    }

    static func write(_ data: Data, for path: String) {
        do {
            if !FileManager.default.fileExists(atPath: directory.path) {
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                var values = URLResourceValues()
                values.isExcludedFromBackup = true
                var excluded = directory
                try excluded.setResourceValues(values)
            }
            try data.write(to: file(for: path), options: [.atomic, .completeFileProtection])
        } catch {
            #if DEBUG
            print("Cache: saving \(path) failed — \(error)")
            #endif
        }
    }

    static func read(_ path: String) -> (data: Data, savedAt: Date)? {
        let url = file(for: path)
        guard let data = try? Data(contentsOf: url) else { return nil }
        let savedAt = (try? url.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? .now
        return (data, savedAt)
    }

    static func clear() {
        try? FileManager.default.removeItem(at: directory)
    }
}

extension URLError {
    /// The failures that mean "no usable connection", as opposed to a server that answered badly
    var isOffline: Bool {
        switch code {
        case .notConnectedToInternet, .networkConnectionLost, .timedOut, .cannotConnectToHost,
             .cannotFindHost, .dataNotAllowed, .internationalRoamingOff, .dnsLookupFailed:
            true
        default:
            false
        }
    }
}

/// Whether the screens are showing saved copies, and whether the network has come back
@MainActor
@Observable
final class Connectivity {
    static let shared = Connectivity()

    /// When the oldest saved copy on screen was saved; nil while everything is live
    private(set) var servedFromCacheAt: Date?
    private(set) var pathOnline = true

    private let monitor = NWPathMonitor()

    private init() {
        // @Sendable: the system calls this on the monitor's own queue. Without it the closure inherits
        // this class's main-actor isolation and the runtime flags the off-main call
        // ("unsafeForcedSync called from Swift Concurrent context")
        monitor.pathUpdateHandler = { @Sendable [weak self] path in
            let online = path.status == .satisfied
            Task { @MainActor in self?.pathOnline = online }
        }
        monitor.start(queue: DispatchQueue(label: "caley.connectivity", qos: .utility))
    }

    var showingSavedCopy: Bool { servedFromCacheAt != nil }

    func servedFromCache(savedAt: Date) {
        servedFromCacheAt = min(servedFromCacheAt ?? savedAt, savedAt)
    }

    /// Any answer from the server means the connection works
    func reachedServer() {
        if servedFromCacheAt != nil { servedFromCacheAt = nil }
    }
}
