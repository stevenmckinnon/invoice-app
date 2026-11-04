import Foundation

/// The Diary's rules, a port of the web's `src/lib/holds.ts` (which the server also runs):
/// which pencils clash, who moves up when a 1st is released, and how a run of dates reads.
/// `HoldRulesTests` holds them to the same cases as `holds.test.ts`.
enum HoldRules {
    private static func overlaps(_ a: Hold, _ b: Hold) -> Bool { !Set(a.dates).isDisjoint(with: b.dates) }

    /// For each pencil sharing a date with another hold, the holds it shares them with. A confirmed job
    /// never clashes itself: it's the pencils around it that are in question.
    static func clashes(_ holds: [Hold]) -> [String: [Hold]] {
        var result: [String: [Hold]] = [:]
        for hold in holds where hold.isPencilled {
            let others = holds.filter { $0.id != hold.id && overlaps(hold, $0) }
            if !others.isEmpty { result[hold.id] = others }
        }
        return result
    }

    /// Releasing a 1st pencil moves the 2nd pencils on its dates up; releasing anything else moves nobody
    static func promoted(byReleasing released: Hold, in holds: [Hold]) -> [Hold] {
        guard released.isPencilled, released.rank == 1 else { return [] }
        return holds.filter { $0.id != released.id && $0.isPencilled && $0.rank == 2 && overlaps($0, released) }
    }

    private static let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    private struct Parts { let year: Int; let month: Int; let day: Int }
    private static func parts(_ date: String) -> Parts {
        let n = date.split(separator: "-").compactMap { Int($0) }
        return Parts(year: n[0], month: n[1] - 1, day: n[2])
    }

    private static func nextDay(_ date: String) -> String {
        guard let d = DateOnly.parse(date), let next = DateOnly.calendar.date(byAdding: .day, value: 1, to: d) else { return date }
        return DateOnly.iso(next)
    }

    /// "10–13 Dec", "2–4, 9 Dec", "29 Nov–2 Dec", "30 Dec 2026–2 Jan 2027"
    static func rangeLabel(_ dates: [String], currentYear: Int = Calendar.current.component(.year, from: .now)) -> String {
        let sorted = Array(Set(dates)).sorted()
        guard !sorted.isEmpty else { return "" }
        var runs: [(String, String)] = []
        for date in sorted {
            if let last = runs.last, nextDay(last.1) == date { runs[runs.count - 1].1 = date } else { runs.append((date, date)) }
        }
        let years = Set(sorted.map { parts($0).year })
        let showYear = years.count > 1 || !years.contains(currentYear)
        func label(_ date: String, month: Bool, year: Bool) -> String {
            let p = parts(date)
            return "\(p.day)" + (month ? " \(months[p.month])" : "") + (year ? " \(p.year)" : "")
        }
        var out: [String] = []
        for (i, run) in runs.enumerated() {
            let s = parts(run.0), e = parts(run.1)
            let next = i + 1 < runs.count ? parts(runs[i + 1].0) : nil
            // The month is said at the end of each stretch of runs in that month
            let endMonthChanges = next == nil || next!.month != e.month || next!.year != e.year
            let yearHere = showYear && (endMonthChanges || s.year != e.year)
            if run.0 == run.1 {
                out.append(label(run.0, month: endMonthChanges, year: yearHere))
            } else {
                let sameMonth = s.month == e.month && s.year == e.year
                out.append(label(run.0, month: !sameMonth, year: showYear && s.year != e.year)
                           + "–" + label(run.1, month: endMonthChanges, year: yearHere))
            }
        }
        return out.joined(separator: ", ")
    }
}
