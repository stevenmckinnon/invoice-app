import XCTest
@testable import Caley

/// The Diary's rules, held to the same cases as the web's `holds.test.ts`
final class HoldRulesTests: XCTestCase {
    private func hold(_ id: String, _ dates: [String], rank: Int = 1, invoiceId: String? = nil) throws -> Hold {
        let invoice = invoiceId.map { #"{"id":"\#($0)","invoiceNumber":"INV-1","status":"draft"}"# } ?? "null"
        let json = """
        {"id":"\(id)","showName":"\(id)","dates":\(dates),"rank":\(rank),
         "invoiceId":\(invoiceId.map { "\"\($0)\"" } ?? "null"),
         "client":{"id":"c","name":"WWE"},"invoice":\(invoice)}
        """
        return try JSONDecoder().decode(Hold.self, from: Data(json.utf8))
    }

    func testPencilsSharingADateClash() throws {
        let tm = try hold("tm", ["2026-12-10", "2026-12-11", "2026-12-12"])
        let rg = try hold("rg", ["2026-12-12", "2026-12-13"], rank: 2)
        let rs = try hold("rs", ["2026-12-02"])
        let clashes = HoldRules.clashes([tm, rg, rs])
        XCTAssertEqual(clashes["tm"]?.map(\.id), ["rg"])
        XCTAssertEqual(clashes["rg"]?.map(\.id), ["tm"])
        XCTAssertNil(clashes["rs"])
    }

    func testAConfirmedJobFlagsThePencilBesideItNotItself() throws {
        let job = try hold("job", ["2026-12-12"], invoiceId: "inv1")
        let pencil = try hold("p", ["2026-12-12"], rank: 2)
        let clashes = HoldRules.clashes([job, pencil])
        XCTAssertNil(clashes["job"])
        XCTAssertEqual(clashes["p"]?.map(\.id), ["job"])
    }

    func testReleasingA1stMovesThe2ndsOnItsDatesUp() throws {
        let first = try hold("first", ["2026-12-10", "2026-12-11"])
        let second = try hold("second", ["2026-12-11"], rank: 2)
        let elsewhere = try hold("elsewhere", ["2026-12-20"], rank: 2)
        let all = [first, second, elsewhere]
        XCTAssertEqual(HoldRules.promoted(byReleasing: first, in: all).map(\.id), ["second"])
        XCTAssertEqual(HoldRules.promoted(byReleasing: second, in: all).map(\.id), [])
        let confirmed = try hold("c", ["2026-12-11"], invoiceId: "inv1")
        XCTAssertEqual(HoldRules.promoted(byReleasing: confirmed, in: [confirmed, second]).map(\.id), [])
    }

    func testRangesReadLikeTheWeb() {
        XCTAssertEqual(HoldRules.rangeLabel(["2026-12-10", "2026-12-11", "2026-12-12", "2026-12-13"], currentYear: 2026), "10–13 Dec")
        XCTAssertEqual(HoldRules.rangeLabel(["2026-12-02", "2026-12-03", "2026-12-04", "2026-12-09"], currentYear: 2026), "2–4, 9 Dec")
        XCTAssertEqual(HoldRules.rangeLabel(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"], currentYear: 2026), "29 Nov–2 Dec")
        XCTAssertEqual(HoldRules.rangeLabel(["2026-11-29", "2026-12-04"], currentYear: 2026), "29 Nov, 4 Dec")
        XCTAssertEqual(HoldRules.rangeLabel(["2027-01-04", "2027-01-05"], currentYear: 2026), "4–5 Jan 2027")
        XCTAssertEqual(HoldRules.rangeLabel(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"], currentYear: 2026),
                       "30 Dec 2026–2 Jan 2027")
    }

    @MainActor
    func testDiaryLinksOpenTheDiary() {
        XCTAssertEqual(AppLink.route(from: URL(string: "https://caley.app/invoices/diary")!)?.absoluteString, "caley://diary")
        let navigation = AppNavigation()
        navigation.handle(URL(string: "caley://diary")!)
        XCTAssertEqual(navigation.tab, .invoices)
        XCTAssertTrue(navigation.pendingDiary)
    }

    @MainActor
    func testConfirmingAPencilStartsTheEditorFromIt() throws {
        let pencil = try hold("raw", ["2026-12-11", "2026-12-12"])
        let model = InvoiceEditorModel(editing: nil, fromHold: pencil)
        XCTAssertEqual(model.clientId, "c")
        XCTAssertEqual(model.showName, "raw")
        XCTAssertEqual(model.painted.keys.sorted(), ["2026-12-11", "2026-12-12"])
        XCTAssertTrue(model.painted.values.allSatisfy { $0.kind == .work })
    }
}
