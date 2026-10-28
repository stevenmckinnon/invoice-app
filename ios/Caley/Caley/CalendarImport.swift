import EventKit

/// One event from the phone's calendar, reduced to what picking work days needs
struct CalendarEvent: Equatable {
    let title: String
    let start: Date
    let end: Date
}

/// A calendar the user can pick events from
struct CalendarChoice: Identifiable, Equatable {
    let id: String
    let title: String
    let account: String
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

    /// A job name to offer for the picked days: the title that comes up most (when it repeats), else
    /// the words every title starts with, minus a trailing "day". "Triplemania day 1", "Triplemania
    /// day 2" gives "Triplemania". Nil when the titles share nothing worth using.
    static func suggestedName(from titles: [String]) -> String? {
        let titles = titles.map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        guard !titles.isEmpty else { return nil }
        let counts = Dictionary(titles.map { ($0, 1) }, uniquingKeysWith: +)
        if let top = counts.max(by: { $0.value < $1.value || ($0.value == $1.value && $0.key > $1.key) }), top.value >= 2,
           top.value * 2 > titles.count {
            return top.key
        }
        var shared = titles[0].split(separator: " ").map(String.init)
        for title in titles.dropFirst() {
            let words = title.split(separator: " ").map(String.init)
            var keep = 0
            while keep < min(shared.count, words.count), shared[keep].lowercased() == words[keep].lowercased() { keep += 1 }
            shared = Array(shared.prefix(keep))
        }
        while let last = shared.last, last.lowercased() == "day" || Int(last) != nil { shared.removeLast() }
        let name = shared.joined(separator: " ")
        return name.count >= 4 ? name : nil
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

    /// Holidays, birthdays and other subscribed calendars are full of all-day events that aren't work
    private var workCandidates: [EKCalendar] {
        store.calendars(for: .event).filter { $0.type != .birthday && $0.type != .subscription }
    }

    /// The calendars that could hold work, for the picker
    func calendars() -> [CalendarChoice] {
        guard authorized else { return [] }
        return workCandidates
            .map { CalendarChoice(id: $0.calendarIdentifier, title: $0.title, account: $0.source.title) }
            .sorted { ($0.account, $0.title) < ($1.account, $1.title) }
    }

    /// Events in the range, from the given calendars (every work candidate when `only` is empty)
    func events(from start: Date, to end: Date, only: Set<String> = []) -> [CalendarEvent] {
        guard authorized else { return [] }
        let calendar = Calendar.current
        let from = calendar.startOfDay(for: start)
        let to = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: end)) ?? end
        let chosen = workCandidates.filter { only.isEmpty || only.contains($0.calendarIdentifier) }
        guard !chosen.isEmpty else { return [] }
        let predicate = store.predicateForEvents(withStart: from, end: to, calendars: chosen)
        return store.events(matching: predicate)
            .filter { $0.status != .canceled }
            .map { CalendarEvent(title: $0.title ?? "", start: $0.startDate, end: $0.endDate) }
    }
}
