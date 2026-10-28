import WidgetKit

struct CaleyEntry: TimelineEntry {
    enum State: Equatable {
        /// No login to use: the app hasn't signed in, or the session has ended
        case signedOut
        /// Numbers, and whether they're a saved copy because the server couldn't be reached
        case data(WidgetSnapshot, stale: Bool)
        /// Never loaded anything and can't reach the server
        case unavailable
    }

    let date: Date
    let state: State
    /// The app's Face ID lock is on: show counts, not amounts
    let hideAmounts: Bool
}

struct CaleyProvider: TimelineProvider {
    /// How often the system is asked to wake the widget. It treats this as a hint, not a promise.
    private static let refresh: TimeInterval = 30 * 60

    func placeholder(in context: Context) -> CaleyEntry { .sample }

    func getSnapshot(in context: Context, completion: @escaping (CaleyEntry) -> Void) {
        // The gallery preview should look like a good day, not like an empty account
        if context.isPreview { completion(.sample); return }
        Task { completion(await WidgetLoader.entry()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CaleyEntry>) -> Void) {
        Task {
            let entry = await WidgetLoader.entry()
            completion(Timeline(entries: [entry], policy: .after(entry.date.addingTimeInterval(Self.refresh))))
        }
    }
}

/// The quick-action widget shows no data, so it has one entry and never needs refreshing
struct QuickActionProvider: TimelineProvider {
    private var entry: CaleyEntry { CaleyEntry(date: .now, state: .signedOut, hideAmounts: false) }
    func placeholder(in context: Context) -> CaleyEntry { entry }
    func getSnapshot(in context: Context, completion: @escaping (CaleyEntry) -> Void) { completion(entry) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<CaleyEntry>) -> Void) {
        completion(Timeline(entries: [entry], policy: .never))
    }
}

enum WidgetLoader {
    /// Fetches the invoices with the app's saved login, or falls back to the last snapshot
    static func entry(now: Date = .now) async -> CaleyEntry {
        let hide = SharedStore.hideAmounts
        guard let token = Keychain.read(migrate: false) else {
            return CaleyEntry(date: now, state: .signedOut, hideAmounts: hide)
        }
        switch await InvoiceFetcher.fetch(token: token) {
        case .success(let invoices):
            let snapshot = WidgetSnapshot(invoices: invoices, now: now)
            SharedStore.snapshot = snapshot
            return CaleyEntry(date: now, state: .data(snapshot, stale: false), hideAmounts: hide)
        case .signedOut:
            return CaleyEntry(date: now, state: .signedOut, hideAmounts: hide)
        case .failed:
            if let saved = SharedStore.snapshot {
                return CaleyEntry(date: now, state: .data(saved, stale: true), hideAmounts: hide)
            }
            return CaleyEntry(date: now, state: .unavailable, hideAmounts: hide)
        }
    }
}

extension CaleyEntry {
    /// What the gallery and the placeholder show
    static var sample: CaleyEntry {
        let snapshot = WidgetSnapshot(
            savedAt: .now, fyLabel: "2026/27", currency: "GBP", invoiced: 23_026, paid: 13_312.75,
            outstanding: 7_524.25, outstandingCount: 3, overdueCount: 1,
            recent: [
                .init(id: "a", number: "INV-2609", showName: "Paper Moon, Pilot", clientName: "Harbour Street Productions", total: 2_189, status: .draft),
                .init(id: "b", number: "INV-2608", showName: "The Salt Road, Series 2", clientName: "Northlight Pictures", total: 2_061.25, status: .sent),
                .init(id: "c", number: "INV-2607", showName: "Brightwater Awards Night", clientName: "Brightwater Live", total: 2_501, status: .sent),
            ])
        return CaleyEntry(date: .now, state: .data(snapshot, stale: false), hideAmounts: false)
    }
}
