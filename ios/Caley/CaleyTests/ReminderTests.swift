import XCTest
@testable import Caley

final class ReminderTests: XCTestCase {
    private var calendar: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "Europe/London")!
        return c
    }

    private func at(_ iso: String, _ hour: Int = 12) -> Date {
        let p = iso.split(separator: "-").map { Int($0)! }
        return calendar.date(from: DateComponents(year: p[0], month: p[1], day: p[2], hour: hour))!
    }

    private func invoice(_ id: String, date: String, status: String, amount: String = "1851.00") throws -> InvoiceListItem {
        let json = """
        {"id":"\(id)","invoiceNumber":"INV-\(id)","invoiceDate":"\(date)T00:00:00.000Z","showName":"Show","clientName":"Brightwater Live",
         "totalAmount":"\(amount)","currency":"GBP","status":"\(status)"}
        """
        return try JSONDecoder().decode(InvoiceListItem.self, from: Data(json.utf8))
    }

    private func plan(_ items: [InvoiceListItem], now: Date, hide: Bool = false) -> [PlannedReminder] {
        ReminderPlanner.plan(items, now: now, hideAmounts: hide, calendar: calendar)
    }

    func testSentInvoiceGetsFirstReminderThirtyDaysOnThenWeekly() throws {
        let result = plan([try invoice("1", date: "2026-10-01", status: "sent")], now: at("2026-10-05"))
        XCTAssertEqual(result.count, 4)
        XCTAssertEqual(result[0].fireAt, at("2026-10-31", 9))
        XCTAssertEqual(result[1].fireAt, at("2026-11-07", 9))
        XCTAssertTrue(result[0].body.contains("30 days"))
        XCTAssertTrue(result[0].body.contains("£1,851.00"))
        XCTAssertEqual(result[0].title, "INV-1 · Brightwater Live")
    }

    func testDraftAndPaidGetNothing() throws {
        let items = [try invoice("1", date: "2026-10-01", status: "draft"), try invoice("2", date: "2026-10-01", status: "paid")]
        XCTAssertTrue(plan(items, now: at("2026-10-05")).isEmpty)
    }

    func testOverdueGetsMondayNudgesNotAFirstThirtyDayOne() throws {
        // 28 Oct 2026 is a Wednesday, so the next Monday is 2 Nov
        let result = plan([try invoice("1", date: "2026-10-20", status: "overdue")], now: at("2026-10-28"))
        XCTAssertEqual(result.map(\.fireAt), [at("2026-11-02", 9), at("2026-11-09", 9), at("2026-11-16", 9)])
    }

    func testSentInvoiceAlreadyOlderThanThirtyDaysNudgesOnMondays() throws {
        let result = plan([try invoice("1", date: "2026-08-01", status: "sent")], now: at("2026-10-28"))
        XCTAssertEqual(result.first?.fireAt, at("2026-11-02", 9))
        XCTAssertTrue(result.first?.body.contains("93 days") == true)
    }

    func testHiddenAmountsNeverAppearInTheText() throws {
        let result = plan([try invoice("1", date: "2026-10-01", status: "sent")], now: at("2026-10-05"), hide: true)
        XCTAssertFalse(result.contains { $0.body.contains("£") })
        XCTAssertTrue(result[0].body.contains("30 days"))
    }

    func testNothingInThePastAndCappedAtTheSystemLimit() throws {
        let items = try (0..<40).map { try invoice("\($0)", date: "2026-10-01", status: "sent") }
        let result = plan(items, now: at("2026-10-05"))
        XCTAssertEqual(result.count, ReminderPlanner.limit)
        XCTAssertTrue(result.allSatisfy { $0.fireAt > at("2026-10-05") })
    }

    func testEachReminderKnowsItsInvoice() throws {
        let result = plan([try invoice("abc", date: "2026-10-01", status: "sent")], now: at("2026-10-05"))
        XCTAssertTrue(result.allSatisfy { $0.invoiceID == "abc" && $0.id.hasPrefix("chase-abc-") })
    }
}
