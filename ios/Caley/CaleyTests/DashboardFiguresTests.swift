import XCTest
@testable import Caley

/// The dashboard's month figures: "paid in November" counts by the paid date, the pill by the
/// invoice date, and the bars put each invoice in its tax-year month. The web's
/// `dashboard-figures.test.ts` holds the same rules.
final class DashboardFiguresTests: XCTestCase {
    /// 3 November 2026, midday UTC
    private let now = ISO8601DateFormatter().date(from: "2026-11-03T12:00:00Z")!

    private func item(_ date: String, _ amount: String, _ status: String, paidAt: String? = nil) throws -> InvoiceListItem {
        let paid = paidAt.map { "\"\($0)\"" } ?? "null"
        let json = """
        {"id":"\(UUID().uuidString)","invoiceNumber":"INV","invoiceDate":"\(date)T00:00:00.000Z","showName":"Job",
         "clientName":null,"totalAmount":"\(amount)","currency":"GBP","status":"\(status)","paidAt":\(paid)}
        """
        return try JSONDecoder().decode(InvoiceListItem.self, from: Data(json.utf8))
    }

    func testPaidThisMonthGoesByThePaidDate() throws {
        let invoices = [
            // Invoiced in May, paid this month: counts
            try item("2026-05-18", "1000", "paid", paidAt: "2026-11-02T09:30:00.000Z"),
            // Paid last month: doesn't
            try item("2026-09-01", "500", "paid", paidAt: "2026-10-20T09:30:00.000Z"),
            // Paid before paid dates were recorded: doesn't
            try item("2026-06-01", "700", "paid"),
            // Voided after being paid: out with the rest of the dashboard
            try item("2026-07-01", "300", "void", paidAt: "2026-11-01T09:30:00.000Z"),
        ]
        let paid = DashboardSummary(invoices: invoices, now: now).paidThisMonth
        XCTAssertEqual(paid.amount, 1000)
        XCTAssertEqual(paid.count, 1)
    }

    func testAPaidDateWithoutFractionalSecondsStillReads() throws {
        let invoice = try item("2026-05-18", "1", "paid", paidAt: "2026-11-02T09:30:00Z")
        XCTAssertNotNil(invoice.paidDate)
    }

    func testOlderResponsesWithoutAPaidDateDecode() throws {
        let json = """
        {"id":"a","invoiceNumber":"INV","invoiceDate":"2026-05-18T00:00:00.000Z","showName":"Job",
         "clientName":null,"totalAmount":"1","currency":"GBP","status":"paid"}
        """
        let invoice = try JSONDecoder().decode(InvoiceListItem.self, from: Data(json.utf8))
        XCTAssertNil(invoice.paidAt)
    }

    func testInvoicedThisMonthGoesByTheInvoiceDate() throws {
        let invoices = [
            try item("2026-11-01", "200", "draft"),
            try item("2026-10-31", "999", "sent"),
        ]
        XCTAssertEqual(DashboardSummary(invoices: invoices, now: now).invoicedThisMonth, 200)
    }

    func testBarsRunAprilToMarchWithMonthsToComeEmpty() throws {
        let invoices = [
            try item("2026-05-18", "1000", "paid"),
            // 1–5 April belongs to the year that's ending: last year's March
            try item("2026-04-03", "300", "paid"),
            try item("2025-05-10", "400", "paid"),
        ]
        let bars = DashboardSummary(invoices: invoices, now: now).monthBars
        XCTAssertEqual(bars.count, 12)
        XCTAssertEqual(bars[0].label, "Apr")
        XCTAssertEqual(bars[1].value, 1000)
        XCTAssertEqual(bars[1].previous, 400)
        XCTAssertEqual(bars[11].previous, 300)
        // November has happened (it's in progress); December hasn't
        XCTAssertEqual(bars[7].value, 0)
        XCTAssertNil(bars[8].value)
    }

    func testNoPreviousYearMeansNoMarks() throws {
        let bars = DashboardSummary(invoices: [try item("2026-05-18", "1000", "paid")], now: now).monthBars
        XCTAssertTrue(bars.allSatisfy { $0.previous == nil })
    }
}
