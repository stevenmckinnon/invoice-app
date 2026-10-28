import XCTest
@testable import Caley

/// Replays `day-editor-fixtures.json` (built by `src/lib/day-editor.fixtures.test.ts` from the
/// web app's real rules) through the Swift port. A failure here means `DayEditor.swift` or
/// `DateOnly.monthGrid` no longer agrees with `src/lib/day-editor.ts`.
final class DayEditorParityTests: XCTestCase {
    private struct Fixtures: Decodable {
        let cases: [Scenario]
        let months: [String: [String]]
    }

    private struct Scenario: Decodable {
        let name: String
        let stored: [Stored]
        let ops: [Op]
        let billable: [BillableDay]
    }

    private struct Stored: Decodable {
        let date: String
        let type: String
        let alsoTravel: String?
        let direction: String?
        let overtimeHours: Double?

        /// As the API sends it, so the test goes through the same decoding the app does
        func invoiceDay() throws -> InvoiceDay {
            let object: [String: Any] = [
                "id": UUID().uuidString, "date": date, "type": type,
                "alsoTravel": alsoTravel ?? NSNull(), "direction": direction ?? NSNull(),
                "overtimeHours": overtimeHours ?? NSNull(),
            ]
            return try JSONDecoder().decode(InvoiceDay.self, from: JSONSerialization.data(withJSONObject: object))
        }
    }

    private struct Op: Decodable {
        let op: String
        let date: String
        let brush: String?
        let erasing: Bool?
        let hours: Double?
        let side: String?
    }

    private func loadFixtures() throws -> Fixtures {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
            .appending(path: "day-editor-fixtures.json")
        return try JSONDecoder().decode(Fixtures.self, from: Data(contentsOf: url))
    }

    private func replay(_ scenario: Scenario) throws -> [BillableDay] {
        var painted = DayEditor.fromStored(try scenario.stored.map { try $0.invoiceDay() })
        for op in scenario.ops {
            switch op.op {
            case "stroke":
                let brush = try XCTUnwrap(op.brush.flatMap(Brush.init(rawValue:)), "unknown brush in \(scenario.name)")
                painted = DayEditor.applyStroke(painted, date: op.date, brush: brush, erasing: op.erasing ?? false)
            case "overtime":
                painted[op.date]?.overtimeHours = op.hours
            case "alsoTravel":
                let side = try XCTUnwrap(op.side.flatMap(TravelSide.init(rawValue:)), "unknown side in \(scenario.name)")
                painted[op.date]?.alsoTravel = .set(side)
            default:
                XCTFail("unknown op \(op.op) in \(scenario.name)")
            }
        }
        return DayEditor.billableDays(painted)
    }

    func testEveryScenarioBillsTheSameDaysAsTheWebEditor() throws {
        let fixtures = try loadFixtures()
        XCTAssertGreaterThan(fixtures.cases.count, 100, "the fixtures look empty")
        var failures: [String] = []
        for scenario in fixtures.cases {
            if try replay(scenario) != scenario.billable { failures.append(scenario.name) }
        }
        XCTAssertTrue(
            failures.isEmpty,
            "\(failures.count) of \(fixtures.cases.count) scenarios differ from day-editor.ts, e.g. \(failures.prefix(5))")
    }

    /// The first differing scenario, spelled out, so a failure says what changed
    func testFirstDifferenceInDetail() throws {
        let fixtures = try loadFixtures()
        for scenario in fixtures.cases {
            let got = try replay(scenario)
            XCTAssertEqual(got, scenario.billable, scenario.name)
            if got != scenario.billable { return }
        }
    }

    func testMonthGridsMatch() throws {
        let fixtures = try loadFixtures()
        XCTAssertFalse(fixtures.months.isEmpty)
        for (key, expected) in fixtures.months {
            let parts = key.split(separator: "-").compactMap { Int($0) }
            XCTAssertEqual(parts.count, 2)
            XCTAssertEqual(DateOnly.monthGrid(year: parts[0], month: parts[1]), expected, "month \(key)")
        }
    }
}
