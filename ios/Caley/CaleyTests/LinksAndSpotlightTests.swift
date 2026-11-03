import XCTest
@testable import Caley

/// caley.app links open the matching screen (the paths match `APP_LINK_COMPONENTS` on the web), and
/// Spotlight results say what an invoice is without its amount when the Face ID lock is on.
final class LinksAndSpotlightTests: XCTestCase {
    private func route(_ string: String) -> String? {
        AppLink.route(from: URL(string: string)!)?.absoluteString
    }

    func testWebPagesMapToAppScreens() {
        XCTAssertEqual(route("https://caley.app/dashboard"), "caley://dashboard")
        XCTAssertEqual(route("https://caley.app/invoices"), "caley://invoices")
        XCTAssertEqual(route("https://caley.app/invoices/new"), "caley://new")
        XCTAssertEqual(route("https://caley.app/invoices/abc123"), "caley://invoice/abc123")
        // A draft's edit link opens the invoice, where its Edit button is
        XCTAssertEqual(route("https://caley.app/invoices/abc123/edit"), "caley://invoice/abc123")
        XCTAssertEqual(route("https://caley.app/clients"), "caley://clients")
        XCTAssertEqual(route("https://caley.app/chat"), "caley://assistant")
        XCTAssertEqual(route("https://www.caley.app/dashboard"), "caley://dashboard")
    }

    func testEverythingElseIsLeftAlone() {
        XCTAssertNil(route("https://caley.app/invoices/new?corrects=abc"))
        XCTAssertNil(route("https://caley.app/profile"))
        XCTAssertNil(route("https://caley.app/clients/abc/edit"))
        XCTAssertNil(route("https://caley.app/"))
        XCTAssertNil(route("https://example.com/invoices/abc"))
        XCTAssertNil(route("http://caley.app/invoices/abc"))
    }

    @MainActor
    func testNavigationOpensTheInvoiceFromAWebLink() {
        let navigation = AppNavigation()
        navigation.handle(URL(string: "https://caley.app/invoices/abc123")!)
        XCTAssertEqual(navigation.tab, .invoices)
        XCTAssertEqual(navigation.pendingInvoiceID, "abc123")
    }

    @MainActor
    func testClientsLinkOpensClientsInsideAccount() {
        let navigation = AppNavigation()
        navigation.handle(URL(string: "caley://clients")!)
        XCTAssertEqual(navigation.tab, .account)
        XCTAssertEqual(navigation.accountPath, [.clients])
    }

    private func invoice() throws -> InvoiceListItem {
        let json = """
        {"id":"abc123","invoiceNumber":"INV-2605","invoiceDate":"2026-08-09T00:00:00.000Z","showName":"WWE SummerSlam 2026",
         "clientName":"WWE","totalAmount":"3748.13","currency":"GBP","status":"paid"}
        """
        return try JSONDecoder().decode(InvoiceListItem.self, from: Data(json.utf8))
    }

    func testSpotlightFindsAnInvoiceByNumberJobAndClient() throws {
        let entry = try XCTUnwrap(SpotlightPlanner.invoices([invoice()], hideAmounts: false).first)
        XCTAssertEqual(entry.title, "INV-2605 · WWE SummerSlam 2026")
        XCTAssertTrue(entry.detail.contains("£3,748.13"))
        XCTAssertEqual(Set(entry.keywords), ["INV-2605", "WWE SummerSlam 2026", "WWE"])
        XCTAssertEqual(SpotlightPlanner.link(forIdentifier: entry.id)?.absoluteString, "caley://invoice/abc123")
    }

    func testSpotlightHoldsAmountsBackUnderTheLock() throws {
        let entry = try XCTUnwrap(SpotlightPlanner.invoices([invoice()], hideAmounts: true).first)
        XCTAssertFalse(entry.detail.contains("£"))
        XCTAssertTrue(entry.detail.contains("Paid"))
    }

    func testOnlyOurOwnResultsOpenAnything() {
        XCTAssertNil(SpotlightPlanner.link(forIdentifier: "something-else"))
        XCTAssertEqual(SpotlightPlanner.link(forIdentifier: "client:xyz")?.absoluteString, "caley://clients")
    }
}
