import XCTest
@testable import Caley

/// The numbers the dashboard and the widgets share, the snapshot the widgets fall back on, and the
/// links a widget tap opens.
@MainActor
final class WidgetTests: XCTestCase {
    private func item(_ id: String, _ date: String, _ amount: String, _ status: String, currency: String = "GBP") throws -> InvoiceListItem {
        let json = """
        {"id":"\(id)","invoiceNumber":"INV-\(id)","invoiceDate":"\(date)T00:00:00.000Z","showName":"Show \(id)",
         "totalAmount":"\(amount)","currency":"\(currency)","status":"\(status)"}
        """
        return try JSONDecoder().decode(InvoiceListItem.self, from: Data(json.utf8))
    }

    private let now = DateOnly.parse("2026-10-28")!

    // MARK: Summary

    func testOutstandingIsSentPlusOverdueAndNeverDraftsOrPaid() throws {
        let invoices = [
            try item("1", "2026-09-01", "100", "draft"), try item("2", "2026-09-02", "200", "sent"),
            try item("3", "2026-09-03", "400", "overdue"), try item("4", "2026-09-04", "800", "paid"),
        ]
        let summary = DashboardSummary(invoices: invoices, now: now)
        XCTAssertEqual(summary.invoiced, 1500)
        XCTAssertEqual(summary.paid, 800)
        XCTAssertEqual(summary.outstanding, 600)
        XCTAssertEqual(summary.overdueCount, 1)
        XCTAssertEqual(summary.outstandingInvoices.count, 2)
    }

    func testTaxYearTurnsOverOnSixApril() throws {
        // 1-5 April still belongs to the year that is ending
        let invoices = [try item("1", "2026-04-05", "100", "paid"), try item("2", "2026-04-06", "200", "paid")]
        XCTAssertEqual(DashboardSummary(invoices: invoices, fy: 2025, now: now).invoiced, 100)
        XCTAssertEqual(DashboardSummary(invoices: invoices, fy: 2026, now: now).invoiced, 200)
        XCTAssertEqual(DashboardSummary(invoices: invoices, now: now).fy, 2026)
    }

    func testOneCurrencyAtATime() throws {
        let invoices = [
            try item("1", "2026-09-01", "100", "sent"), try item("2", "2026-09-02", "100", "sent"),
            try item("3", "2026-09-03", "999", "sent", currency: "USD"),
        ]
        let gbp = DashboardSummary(invoices: invoices, now: now)
        XCTAssertEqual(gbp.currency, "GBP")                     // the commonest
        XCTAssertEqual(gbp.outstanding, 200)                     // dollars are never added in
        XCTAssertEqual(DashboardSummary(invoices: invoices, currency: "USD", now: now).outstanding, 999)
        XCTAssertEqual(gbp.currencies, ["GBP", "USD"])
        // A currency that isn't there falls back rather than showing an empty year
        XCTAssertEqual(DashboardSummary(invoices: invoices, currency: "EUR", now: now).currency, "GBP")
    }

    func testACurrencyTieIsBrokenTheSameWayEveryTime() throws {
        let invoices = [try item("1", "2026-09-01", "1", "sent", currency: "USD"), try item("2", "2026-09-02", "1", "sent", currency: "GBP")]
        for _ in 0..<20 { XCTAssertEqual(DashboardSummary(invoices: invoices, now: now).currency, "GBP") }
    }

    func testTheCurrentYearIsListedEvenWithNoInvoices() {
        let summary = DashboardSummary(invoices: [], now: now)
        XCTAssertEqual(summary.years, [2026])
        XCTAssertEqual(summary.currency, "GBP")
        XCTAssertEqual(summary.invoiced, 0)
    }

    // MARK: Snapshot

    func testSnapshotKeepsTheThreeLatestInvoicesOfTheShownCurrency() throws {
        let invoices = [
            try item("1", "2026-05-01", "10", "paid"), try item("2", "2026-09-01", "20", "sent"),
            try item("3", "2026-10-01", "30", "draft"), try item("4", "2026-10-20", "40", "sent"),
            try item("5", "2026-10-25", "50", "sent", currency: "USD"),
        ]
        let snapshot = WidgetSnapshot(invoices: invoices, now: now)
        XCTAssertEqual(snapshot.recent.map(\.id), ["4", "3", "2"])
        XCTAssertEqual(snapshot.currency, "GBP")
        XCTAssertEqual(snapshot.fyLabel, "2026/27")
        XCTAssertEqual(snapshot.outstandingCount, 2)
    }

    func testAmountsAreHiddenWhenTheAppLockIsOn() throws {
        let snapshot = WidgetSnapshot(invoices: [try item("1", "2026-09-01", "1234.5", "sent")], now: now)
        XCTAssertEqual(snapshot.amount(1234.5, hidden: false), "£1,234.50")
        XCTAssertEqual(snapshot.amount(1234.5, hidden: true), "•••••")
        XCTAssertFalse(snapshot.amount(1234.5, hidden: true).contains("1"))
    }

    func testPaidShareIsPaidOverPaidPlusOutstandingAndIgnoresDrafts() throws {
        let invoices = [
            try item("1", "2026-09-01", "300", "paid"), try item("2", "2026-09-02", "100", "sent"),
            try item("3", "2026-09-03", "100", "overdue"), try item("4", "2026-09-04", "5000", "draft"),
        ]
        XCTAssertEqual(WidgetSnapshot(invoices: invoices, now: now).paidShare, 0.6, accuracy: 0.0001)
    }

    func testPaidShareIsZeroNotAnErrorWhenNothingHasBeenSent() throws {
        XCTAssertEqual(WidgetSnapshot(invoices: [], now: now).paidShare, 0)
        XCTAssertEqual(WidgetSnapshot(invoices: [try item("1", "2026-09-01", "100", "draft")], now: now).paidShare, 0)
        // Everything paid is a full bar
        XCTAssertEqual(WidgetSnapshot(invoices: [try item("1", "2026-09-01", "100", "paid")], now: now).paidShare, 1)
    }

    func testSnapshotSurvivesBeingSavedAndLoaded() throws {
        let snapshot = WidgetSnapshot(invoices: [try item("1", "2026-09-01", "100.25", "overdue")], now: now)
        let decoded = try JSONDecoder().decode(WidgetSnapshot.self, from: JSONEncoder().encode(snapshot))
        XCTAssertEqual(decoded, snapshot)
    }

    // MARK: Links

    func testInvoicesLinkOpensTheListWithAnOptionalFilter() {
        let nav = AppNavigation()
        nav.handle(URL(string: "caley://invoices?filter=overdue")!)
        XCTAssertEqual(nav.tab, .invoices)
        XCTAssertEqual(nav.invoiceFilter, .overdue)
        nav.handle(URL(string: "caley://invoices")!)
        XCTAssertNil(nav.invoiceFilter)                       // a plain link clears an old filter
        nav.handle(URL(string: "caley://invoices?filter=nonsense")!)
        XCTAssertNil(nav.invoiceFilter)
    }

    func testInvoiceLinkSelectsThatInvoice() {
        let nav = AppNavigation()
        nav.handle(URL(string: "caley://invoice/abc123")!)
        XCTAssertEqual(nav.tab, .invoices)
        XCTAssertEqual(nav.pendingInvoiceID, "abc123")
    }

    func testDashboardLinkOpensTheDashboard() {
        let nav = AppNavigation()
        nav.tab = .account
        nav.handle(URL(string: "caley://dashboard")!)
        XCTAssertEqual(nav.tab, .dashboard)
        XCTAssertFalse(nav.pendingNewInvoice)                 // it only looks, it doesn't start an invoice
    }

    func testNewLinkOpensTheEditorFromTheDashboard() {
        let nav = AppNavigation()
        nav.tab = .account
        nav.handle(URL(string: "caley://new")!)
        XCTAssertEqual(nav.tab, .dashboard)
        XCTAssertTrue(nav.pendingNewInvoice)
    }

    func testOtherLinksAreIgnored() {
        let nav = AppNavigation()
        for text in ["https://caley.app/invoices", "caley://invoice/", "caley://invoice", "caley://nowhere", "other://new"] {
            nav.handle(URL(string: text)!)
        }
        XCTAssertEqual(nav.tab, .dashboard)
        XCTAssertNil(nav.pendingInvoiceID)
        XCTAssertFalse(nav.pendingNewInvoice)
    }
}
