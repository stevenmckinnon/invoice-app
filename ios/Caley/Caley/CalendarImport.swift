import EventKit

/// One event from the phone's calendar, reduced to what picking work days needs
struct CalendarEvent: Equatable {
    let title: String
    let start: Date
    let end: Date
}

/// A date with at least one event on it
struct CalendarDay: Identifiable, Equatable {
    let date: String
    var titles: [String]
    var id: String { date }
}

/// Turns calendar events into candidate work days. The calendar only suggests dates: nothing is
/// painted until they are picked, and the server still prices whatever is saved.
enum CalendarImport {
    /// A runaway event (a year-long "Holiday") shouldn't suggest hundreds of days
    private static let longestSpan = 62

    /// Every date the events touch, in date order, optionally only events whose title contains
    /// `filter`. A timed event ending at midnight doesn't touch the next day.
    static func days(from events: [CalendarEvent], matching filter: String = "", calendar: Calendar = .current) -> [CalendarDay] {
        let needle = filter.trimmingCharacters(in: .whitespaces)
        var byDate: [String: [String]] = [:]
        for event in events where needle.isEmpty || event.title.localizedCaseInsensitiveContains(needle) {
            let last = event.end > event.start ? event.end.addingTimeInterval(-1) : event.start
            var day = calendar.startOfDay(for: event.start)
            var steps = 0
            while day <= last, steps < longestSpan {
                let key = isoDate(day, calendar)
                let title = event.title.trimmingCharacters(in: .whitespaces)
                if !title.isEmpty, !(byDate[key] ?? []).contains(title) { byDate[key, default: []].append(title) }
                else if byDate[key] == nil { byDate[key] = [] }
                guard let next = calendar.date(byAdding: .day, value: 1, to: day) else { break }
                day = next
                steps += 1
            }
        }
        return byDate.keys.sorted().map { CalendarDay(date: $0, titles: byDate[$0] ?? []) }
    }

    /// Paints `dates` as work days. A date that is already painted keeps what it is (a travel or
    /// dark day, overtime), so importing never overwrites a decision.
    static func filling(_ painted: Painted, dates: some Collection<String>) -> Painted {
        var next = painted
        for date in dates where next[date] == nil {
            next[date] = PaintedDay(kind: .work)
        }
        return next
    }

    private static func isoDate(_ date: Date, _ calendar: Calendar) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }
}

/// Reads events with the user's permission. Read-only: Caley never writes to the calendar.
@MainActor
final class CalendarReader {
    private let store = EKEventStore()

    var authorized: Bool { EKEventStore.authorizationStatus(for: .event) == .fullAccess }
    /// Refused earlier: the system won't ask again, so the only way back is Settings
    var denied: Bool {
        switch EKEventStore.authorizationStatus(for: .event) {
        case .denied, .restricted: true
        default: false
        }
    }

    func requestAccess() async -> Bool {
        await Self.request(store)
    }

    /// The completion-handler form, wrapped by hand, as in `AppLock`: the `async` overload makes the
    /// runtime report "unsafeForcedSync" when awaited from a main-actor class.
    private nonisolated static func request(_ store: EKEventStore) async -> Bool {
        await withCheckedContinuation { continuation in
            store.requestFullAccessToEvents { granted, _ in continuation.resume(returning: granted) }
        }
    }

    func events(from start: Date, to end: Date) -> [CalendarEvent] {
        guard authorized else { return [] }
        let calendar = Calendar.current
        let from = calendar.startOfDay(for: start)
        let to = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: end)) ?? end
        let predicate = store.predicateForEvents(withStart: from, end: to, calendars: nil)
        return store.events(matching: predicate)
            .filter { $0.status != .canceled }
            .map { CalendarEvent(title: $0.title ?? "", start: $0.startDate, end: $0.endDate) }
    }
}
