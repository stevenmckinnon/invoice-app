import XCTest
@testable import Caley

final class TaxYearExportTests: XCTestCase {
    private func invoice(_ date: String) -> InvoiceListItem {
        let json = """
        {"id":"x\(date)","invoiceNumber":"INV","invoiceDate":"\(date)","showName":"Show","clientName":null,
         "totalAmount":"100","currency":"GBP","status":"sent"}
        """
        return try! JSONDecoder().decode(InvoiceListItem.self, from: Data(json.utf8))
    }

    private func date(_ iso: String) -> Date { DateOnly.parse(iso)! }

    func testOffersTheYearsWithInvoicesNewestFirst() {
        let years = TaxYearExport.years(
            for: [invoice("2025-05-01"), invoice("2026-09-14"), invoice("2025-11-02")],
            now: date("2026-10-30"))
        XCTAssertEqual(years, [2026, 2025])
    }

    func testAlwaysOffersTheCurrentYear() {
        XCTAssertEqual(TaxYearExport.years(for: [], now: date("2026-10-30")), [2026])
    }

    func testFiveAprilBelongsToTheYearThatIsEnding() {
        let years = TaxYearExport.years(for: [invoice("2026-04-05"), invoice("2026-04-06")], now: date("2026-04-10"))
        XCTAssertEqual(years, [2026, 2025])
    }

    func testFilenameMatchesTheServers() {
        XCTAssertEqual(TaxYearExport.filename(year: 2026), "caley-invoices-2026-27.csv")
        XCTAssertEqual(TaxYearExport.filename(year: 2099), "caley-invoices-2099-00.csv")
    }
}
