import SwiftUI

/// The calendar editor's model, mirroring `src/lib/day-editor.ts`: what has been painted,
/// how a brush stroke changes it, and how it becomes the days the API bills. It decides
/// which days are sent, never what they cost; the server prices them.

enum PaintKind: Equatable {
    case work, travel, dark
    /// Painted explicitly but never stored; it only keeps a gap inside the job
    case off
}

enum TravelSide: String, Equatable, CaseIterable {
    case out, home
}

/// `auto` means work the direction out from where the day sits, until set by hand
enum AlsoTravel: Hashable {
    case auto
    case set(TravelSide)
}

struct PaintedDay: Equatable {
    var kind: PaintKind
    var alsoTravel: AlsoTravel?
    /// Travel days: which way, when the invoice stored one (the assistant sets it). Carried through
    /// an edit untouched, since the calendar has no control for it.
    var direction: TravelSide?
    var overtimeHours: Double?
}

typealias Painted = [String: PaintedDay]

enum Brush: String, CaseIterable, Identifiable {
    case work, worktravel, travel, dark, off
    var id: String { rawValue }

    var label: String {
        switch self {
        case .work: "Work"
        case .worktravel: "Work + travel"
        case .travel: "Travel"
        case .dark: "Dark"
        case .off: "Off"
        }
    }
}

extension Brush {
    var tint: Color {
        switch self {
        case .work, .worktravel: .brand
        case .travel: .orange
        case .dark: .indigo
        case .off: .gray
        }
    }
}

enum DayEditor {
    /// Whether a painted day is exactly what this brush paints
    static func matches(_ day: PaintedDay?, _ brush: Brush) -> Bool {
        switch brush {
        case .worktravel: day?.kind == .work && day?.alsoTravel != nil
        case .work: day?.kind == .work && day?.alsoTravel == nil
        case .travel: day?.kind == .travel
        case .dark: day?.kind == .dark
        case .off: day?.kind == .off
        }
    }

    /// One brush stroke on one date. A stroke that started on a day the brush already matches
    /// erases (only days of its own kind, so sliding over another type never wipes it); any
    /// other stroke paints. Work and Work + travel keep a day's overtime; other repaints drop it.
    static func applyStroke(_ painted: Painted, date: String, brush: Brush, erasing: Bool) -> Painted {
        let current = painted[date]
        var next = painted
        if erasing {
            guard matches(current, brush) else { return painted }
            next[date] = nil
            return next
        }
        if matches(current, brush) { return painted }

        let keptOvertime = current?.kind == .work ? current?.overtimeHours : nil
        switch brush {
        case .worktravel: next[date] = PaintedDay(kind: .work, alsoTravel: .auto, overtimeHours: keptOvertime)
        case .work: next[date] = PaintedDay(kind: .work, overtimeHours: keptOvertime)
        case .travel: next[date] = PaintedDay(kind: .travel)
        case .dark: next[date] = PaintedDay(kind: .dark)
        case .off: next[date] = PaintedDay(kind: .off)
        }
        return next
    }

    private static func isWorking(_ day: PaintedDay?) -> Bool { day?.kind == .work || day?.kind == .dark }

    /// The painted days as the API takes them, in date order. "Off" days drop out, and an
    /// "auto" travel + work day resolves from its neighbours: at the start of a run of work it
    /// is the day you flew in, at the end the day you flew home, mid-run flew in.
    static func billableDays(_ painted: Painted) -> [BillableDay] {
        painted.keys.sorted().compactMap { date in
            guard let day = painted[date], day.kind != .off else { return nil }
            var alsoTravel: String?
            if day.kind == .work, let also = day.alsoTravel {
                switch also {
                case .auto:
                    let startsRun = !isWorking(painted[DateOnly.addDays(date, -1)])
                    let endsRun = !isWorking(painted[DateOnly.addDays(date, 1)])
                    alsoTravel = (startsRun || !endsRun) ? "out" : "home"
                case .set(let side):
                    alsoTravel = side.rawValue
                }
            }
            let type: String = switch day.kind {
            case .work: "work"
            case .travel: "travel"
            case .dark: "dark"
            case .off: "work" // unreachable: filtered above
            }
            let hours = day.kind == .work ? day.overtimeHours : nil
            return BillableDay(
                date: date, type: type, alsoTravel: alsoTravel,
                direction: day.kind == .travel ? day.direction?.rawValue : nil,
                overtimeHours: (hours ?? 0) > 0 ? hours : nil)
        }
    }

    /// A stored invoice's days, back into the editor
    static func fromStored(_ days: [InvoiceDay]) -> Painted {
        var painted = Painted()
        for day in days {
            let kind: PaintKind = switch day.type {
            case "travel": .travel
            case "dark": .dark
            default: .work
            }
            let also = day.alsoTravel.flatMap(TravelSide.init(rawValue:)).map(AlsoTravel.set)
            let hours = day.overtimeHours?.double
            painted[String(day.date.prefix(10))] = PaintedDay(
                kind: kind, alsoTravel: kind == .work ? also : nil,
                direction: day.direction.flatMap(TravelSide.init(rawValue:)),
                overtimeHours: (hours ?? 0) > 0 ? hours : nil)
        }
        return painted
    }
}
