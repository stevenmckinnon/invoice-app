import XCTest
@testable import Caley

final class CalendarImportTests: XCTestCase {
    private var calendar: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "Europe/London")!
        return c
    }

    private func date(_ iso: String, _ hour: Int = 9) -> Date {
        let p = iso.split(separator: "-").map { Int($0)! }
        return calendar.date(from: DateComponents(year: p[0], month: p[1], day: p[2], hour: hour))!
    }

    private func event(_ title: String, _ from: Date, _ to: Date) -> CalendarEvent {
        CalendarEvent(title: title, start: from, end: to)
    }

    func testOneDayPerEventDay() {
        let days = CalendarImport.days(from: [
            event("Shoot", date("2026-10-05"), date("2026-10-05", 18)),
            event("Shoot", date("2026-10-06"), date("2026-10-06", 18)),
        ], calendar: calendar)
        XCTAssertEqual(days.map(\.date), ["2026-10-05", "2026-10-06"])
    }

    func testMultiDayAllDayEventCoversEachDate() {
        let days = CalendarImport.days(from: [event("Location", date("2026-10-05", 0), date("2026-10-08", 0))], calendar: calendar)
        XCTAssertEqual(days.map(\.date), ["2026-10-05", "2026-10-06", "2026-10-07"])
    }

    func testEventEndingAtMidnightStaysOnItsDay() {
        let days = CalendarImport.days(from: [event("Night", date("2026-10-05", 20), date("2026-10-06", 0))], calendar: calendar)
        XCTAssertEqual(days.map(\.date), ["2026-10-05"])
    }

    func testFilterMatchesTitleIgnoringCase() {
        let events = [
            event("Triplemania day 1", date("2026-10-05"), date("2026-10-05", 18)),
            event("Dentist", date("2026-10-06"), date("2026-10-06", 10)),
        ]
        XCTAssertEqual(CalendarImport.days(from: events, matching: "TRIPLE", calendar: calendar).map(\.date), ["2026-10-05"])
    }

    func testTitlesAreKeptOncePerDay() {
        let days = CalendarImport.days(from: [
            event("Shoot", date("2026-10-05"), date("2026-10-05", 12)),
            event("Shoot", date("2026-10-05", 13), date("2026-10-05", 18)),
            event("Call", date("2026-10-05", 19), date("2026-10-05", 20)),
        ], calendar: calendar)
        XCTAssertEqual(days.first?.titles, ["Shoot", "Call"])
    }

    func testRunawayEventIsCapped() {
        let days = CalendarImport.days(from: [event("Holiday", date("2026-01-01", 0), date("2027-01-01", 0))], calendar: calendar)
        XCTAssertLessThanOrEqual(days.count, 62)
    }

    func testFillingKeepsPaintedDays() {
        let painted: Painted = ["2026-10-05": PaintedDay(kind: .travel), "2026-10-06": PaintedDay(kind: .work, overtimeHours: 2)]
        let next = CalendarImport.filling(painted, dates: ["2026-10-05", "2026-10-06", "2026-10-07"])
        XCTAssertEqual(next["2026-10-05"]?.kind, .travel)
        XCTAssertEqual(next["2026-10-06"]?.overtimeHours, 2)
        XCTAssertEqual(next["2026-10-07"]?.kind, .work)
    }
}
