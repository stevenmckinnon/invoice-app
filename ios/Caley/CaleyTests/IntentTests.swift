import XCTest
@testable import Caley

@MainActor
final class IntentTests: XCTestCase {
    private func snapshot(outstanding: Decimal, count: Int, overdue: Int, currency: String = "GBP") -> WidgetSnapshot {
        WidgetSnapshot(savedAt: .now, fyLabel: "2026/27", currency: currency, invoiced: 0, paid: 0,
                       outstanding: outstanding, outstandingCount: count, overdueCount: overdue, recent: [])
    }

    // MARK: What Siri says

    func testSaysTheAmountTheCountAndWhatIsOverdue() {
        XCTAssertEqual(snapshot(outstanding: 7524.25, count: 3, overdue: 1).owedSentence(hideAmounts: false),
                       "You're owed £7,524.25 across 3 invoices. 1 is overdue.")
        XCTAssertEqual(snapshot(outstanding: 100, count: 2, overdue: 2).owedSentence(hideAmounts: false),
                       "You're owed £100.00 across 2 invoices. 2 are overdue.")
    }

    func testSingularAndNothingOverdue() {
        XCTAssertEqual(snapshot(outstanding: 50, count: 1, overdue: 0).owedSentence(hideAmounts: false),
                       "You're owed £50.00 across 1 invoice.")
    }

    func testNothingOutstandingSaysSo() {
        XCTAssertEqual(snapshot(outstanding: 0, count: 0, overdue: 0).owedSentence(hideAmounts: false),
                       "Nothing is outstanding for 2026/27.")
        // Even with the lock on there's nothing to hide, and it must not invent an amount
        XCTAssertEqual(snapshot(outstanding: 0, count: 0, overdue: 0).owedSentence(hideAmounts: true),
                       "Nothing is outstanding for 2026/27.")
    }

    func testTheAppLockMeansCountsNeverAmounts() {
        let spoken = snapshot(outstanding: 7524.25, count: 3, overdue: 1).owedSentence(hideAmounts: true)
        XCTAssertEqual(spoken, "You have 3 invoices outstanding. 1 is overdue.")
        XCTAssertFalse(spoken.contains("£"))
        XCTAssertFalse(spoken.contains("7"))
    }

    func testOtherCurrenciesAreSpokenInTheirOwnCurrency() {
        XCTAssertTrue(snapshot(outstanding: 1200, count: 1, overdue: 0, currency: "USD")
            .owedSentence(hideAmounts: false).contains("US$"))
    }

    // MARK: Handing a link to the app

    func testALinkThatArrivesBeforeTheScreensExistWaitsForThem() {
        let bridge = LinkBridge()
        let url = URL(string: "caley://new")!
        bridge.deliver(url)                       // a cold launch from the Action button
        var received: [URL] = []
        bridge.attach { received.append($0) }
        XCTAssertEqual(received, [url])
    }

    func testALinkAfterTheScreensExistGoesStraightThrough() {
        let bridge = LinkBridge()
        var received: [URL] = []
        bridge.attach { received.append($0) }
        XCTAssertTrue(received.isEmpty)
        bridge.deliver(URL(string: "caley://invoices?filter=overdue")!)
        XCTAssertEqual(received.count, 1)
    }

    func testAWaitingLinkIsDeliveredOnlyOnce() {
        let bridge = LinkBridge()
        bridge.deliver(URL(string: "caley://new")!)
        var count = 0
        bridge.attach { _ in count += 1 }
        bridge.attach { _ in count += 1 }         // attaching again must not replay it
        XCTAssertEqual(count, 1)
    }
}
