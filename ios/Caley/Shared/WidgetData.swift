import Foundation

/// What the widgets show, saved where both the app and the widget extension can read it: an app
/// group. The app saves one whenever it loads; the widget saves one whenever it fetches, and falls
/// back to the last one when it can't reach the server.
struct WidgetSnapshot: Codable, Equatable {
    struct Recent: Codable, Equatable, Identifiable {
        let id: String
        let number: String
        let showName: String
        let clientName: String?
        let total: Decimal
        let status: InvoiceStatus
    }

    var savedAt: Date
    var fyLabel: String
    var currency: String
    var invoiced: Decimal
    var paid: Decimal
    var outstanding: Decimal
    var outstandingCount: Int
    var overdueCount: Int
    var recent: [Recent]

    init(savedAt: Date, fyLabel: String, currency: String, invoiced: Decimal, paid: Decimal, outstanding: Decimal,
         outstandingCount: Int, overdueCount: Int, recent: [Recent]) {
        self.savedAt = savedAt; self.fyLabel = fyLabel; self.currency = currency; self.invoiced = invoiced
        self.paid = paid; self.outstanding = outstanding; self.outstandingCount = outstandingCount
        self.overdueCount = overdueCount; self.recent = recent
    }

    /// The same numbers the dashboard shows by default: this tax year, in the commonest currency
    init(invoices: [InvoiceListItem], now: Date = .now) {
        let summary = DashboardSummary(invoices: invoices, now: now)
        let code = summary.currency
        let latest = invoices
            .filter { $0.currencyCode == code }
            .sorted { ($0.date ?? .distantPast) > ($1.date ?? .distantPast) }
            .prefix(3)
            .map { Recent(id: $0.id, number: $0.invoiceNumber, showName: $0.showName, clientName: $0.clientName,
                          total: $0.totalAmount.value, status: $0.status) }
        self.init(savedAt: now, fyLabel: DateOnly.fyLabel(summary.fy), currency: code, invoiced: summary.invoiced,
                  paid: summary.paid, outstanding: summary.outstanding,
                  outstandingCount: summary.outstandingInvoices.count, overdueCount: summary.overdueCount,
                  recent: Array(latest))
    }

    /// An amount for display, or dots when the app lock is on: a widget sits on a home or lock screen
    /// where anyone can read it, and it can't ask for Face ID itself.
    func amount(_ value: Decimal, hidden: Bool) -> String {
        hidden ? "•••••" : value.money(currency)
    }
}

/// The app group shared by the app and the widget extension
enum SharedStore {
    static let groupID = "group.com.stevemckinnon.caley"
    private static let defaults = UserDefaults(suiteName: groupID) ?? .standard

    private enum Key {
        static let snapshot = "widgetSnapshot"
        static let hideAmounts = "widgetHideAmounts"
        static let serverURL = "widgetServerURL"
    }

    /// Mirrors the app's Face ID lock setting, so the widgets know to hide amounts
    static var hideAmounts: Bool {
        get { defaults.bool(forKey: Key.hideAmounts) }
        set { defaults.set(newValue, forKey: Key.hideAmounts) }
    }

    /// The server the app is using (a Debug build can point at a Mac), so the widget asks the same one
    static var serverURL: URL? {
        get { defaults.string(forKey: Key.serverURL).flatMap(URL.init(string:)) }
        set { defaults.set(newValue?.absoluteString, forKey: Key.serverURL) }
    }

    static var snapshot: WidgetSnapshot? {
        get { defaults.data(forKey: Key.snapshot).flatMap { try? JSONDecoder().decode(WidgetSnapshot.self, from: $0) } }
        set { defaults.set(newValue.flatMap { try? JSONEncoder().encode($0) }, forKey: Key.snapshot) }
    }

    /// Signing out: nothing of this account stays on the home screen
    static func clear() {
        defaults.removeObject(forKey: Key.snapshot)
    }
}
