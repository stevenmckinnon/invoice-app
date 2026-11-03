import XCTest
@testable import Caley

final class EditorReadinessTests: XCTestCase {
    private func profile(_ overrides: [String: Any?] = [:]) -> Profile {
        var json: [String: Any?] = [
            "firstName": "Steve", "lastName": "McKinnon", "fullName": nil, "email": "s@example.test",
            "addressLine1": "1 Test Street", "addressLine2": nil, "city": "Glasgow", "state": nil,
            "postalCode": "G1 1AA", "country": "United Kingdom", "dateOfBirth": nil,
            "iban": "GB00TEST00000000000000", "swiftBic": "TESTGB2L",
            "accountNumber": nil, "sortCode": nil, "bankAddress": nil, "currency": "GBP",
        ]
        for (key, value) in overrides { json[key] = value }
        let clean = json.mapValues { $0 ?? NSNull() }
        let data = try! JSONSerialization.data(withJSONObject: clean)
        return try! JSONDecoder().decode(Profile.self, from: data)
    }

    func testACompleteProfileHasNothingMissing() {
        XCTAssertEqual(profile().gaps, [])
    }

    func testEveryGroupIsNamedWhenEmpty() {
        let empty = profile(["firstName": nil, "lastName": nil, "addressLine1": nil, "city": nil, "postalCode": nil,
                             "country": nil, "iban": nil, "swiftBic": nil])
        XCTAssertEqual(empty.gaps, [.name, .address, .bank])
    }

    func testAnAddressIsMissingIfAnyPartOfItIs() {
        // The server needs the whole address: a missing city used to fail only after the tap
        for field in ["addressLine1", "city", "postalCode", "country"] {
            XCTAssertEqual(profile([field: ""]).gaps, [.address], field)
            XCTAssertEqual(profile([field: "  "]).gaps, [.address], field)
        }
    }

    func testUKSortCodeAndAccountNumberWillDo() {
        let uk = profile(["iban": nil, "swiftBic": nil, "sortCode": "12-34-56", "accountNumber": "12345678"])
        XCTAssertEqual(uk.gaps, [])
        // Half a pair is no use to a client paying it
        XCTAssertEqual(profile(["iban": nil, "swiftBic": nil, "sortCode": "12-34-56"]).gaps, [.bank])
    }

    func testBankDetailsNeedBothIBANAndSWIFT() {
        XCTAssertEqual(profile(["iban": nil]).gaps, [.bank])
        XCTAssertEqual(profile(["swiftBic": ""]).gaps, [.bank])
    }

    func testANameComesFromTheFullNameOrFirstAndLast() {
        XCTAssertEqual(profile(["firstName": nil, "lastName": nil, "fullName": "Steve McKinnon"]).gaps, [])
        XCTAssertEqual(profile(["firstName": nil, "lastName": nil]).gaps, [.name])
    }

    func testTheGapsReadAsAShortList() {
        XCTAssertEqual(ProfileGap.describe([.address]), "your address")
        XCTAssertEqual(ProfileGap.describe([.address, .bank]), "your address and your bank details (a sort code and account number, or an IBAN and SWIFT)")
        XCTAssertEqual(ProfileGap.describe([.name, .address, .bank]),
                       "your name, your address and your bank details (a sort code and account number, or an IBAN and SWIFT)")
        XCTAssertEqual(ProfileGap.describe([]), "")
    }
}

final class BillingLinesTests: XCTestCase {
    private func item(_ name: String, _ quantity: Int, _ rate: Decimal, _ cost: Decimal) -> LineItem {
        let json = #"{"description":"\#(name)","quantity":\#(quantity),"unitPrice":"\#(rate)","cost":"\#(cost)"}"#
        return try! JSONDecoder().decode(LineItem.self, from: Data(json.utf8))
    }

    private func lines(in groups: [BillingGroup], _ title: String) -> [String] {
        groups.first { $0.title == title }?.lines.map(\.title) ?? []
    }

    func testAPerDiemWithDaysButNoRateIsLeftOut() {
        // A client paid a travel per diem only: three work days and nothing owed per day
        let groups = BillingLines.groups(
            items: [item("Work Days", 3, 500, 1500), item("Per Diems Travel Days", 1, 60, 60),
                    item("Per Diems Work Days", 3, 0, 0)],
            overtime: [], expenses: [], currency: "GBP")
        XCTAssertEqual(lines(in: groups, "Per diems"), ["Travel days"])
    }

    func testPerDiemsWithARateStillShow() {
        let groups = BillingLines.groups(
            items: [item("Work Days", 2, 500, 1000), item("Per Diems Travel Days", 1, 60, 60),
                    item("Per Diems Work Days", 2, 45, 90)],
            overtime: [], expenses: [], currency: "GBP")
        XCTAssertEqual(lines(in: groups, "Per diems"), ["Travel days", "Work days"])
    }

    func testTheGroupDisappearsWhenNothingInItIsOwed() {
        let groups = BillingLines.groups(
            items: [item("Work Days", 2, 500, 1000), item("Per Diems Work Days", 2, 0, 0)],
            overtime: [], expenses: [], currency: "GBP")
        XCTAssertNil(groups.first { $0.title == "Per diems" })
    }
}
