import SwiftUI

/// Invoice dates are calendar dates stored as UTC midnight, so they are read and
/// shown in UTC; going through the local zone would move them a day in the west.
enum DateOnly {
    private static let utc = TimeZone(identifier: "UTC")!

    static var calendar: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = utc
        return c
    }

    static func parse(_ s: String) -> Date? {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = utc
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: String(s.prefix(10)))
    }

    static func format(_ date: Date, _ style: Date.FormatStyle = .dateTime.day().month(.abbreviated).year()) -> String {
        var style = style
        style.timeZone = utc
        style.locale = Locale(identifier: "en_GB")
        return date.formatted(style)
    }

    /// UK tax year, 6 April – 5 April, identified by the calendar year it starts in.
    static func fyStart(of date: Date) -> Int {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        let beforeApril6 = c.month! < 4 || (c.month! == 4 && c.day! < 6)
        return beforeApril6 ? c.year! - 1 : c.year!
    }

    static func fyLabel(_ start: Int) -> String {
        "\(start)/\(String(format: "%02d", (start + 1) % 100))"
    }
}

extension Decimal {
    func money(_ currency: String) -> String {
        formatted(.currency(code: currency).locale(Locale(identifier: "en_GB")))
    }
}

extension Amount {
    func money(_ currency: String) -> String { value.money(currency) }
}

extension InvoiceStatus {
    var tint: Color {
        switch self {
        case .draft: .gray
        case .sent: .blue
        case .paid: .green
        case .overdue: .red
        }
    }

    var symbol: String {
        switch self {
        case .draft: "square.and.pencil"
        case .sent: "paperplane"
        case .paid: "checkmark.circle"
        case .overdue: "exclamationmark.circle"
        }
    }
}

extension Color {
    /// Warm cream canvas in light mode, matching the web app.
    static let canvas = Color(UIColor { $0.userInterfaceStyle == .dark
        ? UIColor(red: 0.075, green: 0.072, blue: 0.066, alpha: 1)
        : UIColor(red: 0.980, green: 0.972, blue: 0.950, alpha: 1) })
    static let card = Color(UIColor { $0.userInterfaceStyle == .dark
        ? UIColor(red: 0.118, green: 0.114, blue: 0.106, alpha: 1)
        : .white })
    static let brand = Color(UIColor { $0.userInterfaceStyle == .dark
        ? UIColor(red: 0.30, green: 0.60, blue: 0.92, alpha: 1)
        : UIColor(red: 0.04, green: 0.38, blue: 0.70, alpha: 1) })
}

extension DateOnly {
    /// yyyy-mm-dd for a calendar date held in UTC
    static func iso(_ date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    static func addDays(_ iso: String, _ n: Int) -> String {
        guard let date = parse(iso) else { return iso }
        return Self.iso(calendar.date(byAdding: .day, value: n, to: date) ?? date)
    }

    /// The day the user picked in their own calendar, as yyyy-mm-dd
    static func isoLocal(_ date: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    /// A stored calendar date as a local date, at noon so no timezone moves it a day
    static func localDate(_ iso: String) -> Date {
        let p = iso.prefix(10).split(separator: "-").compactMap { Int($0) }
        guard p.count == 3 else { return .now }
        return Calendar.current.date(from: DateComponents(year: p[0], month: p[1], day: p[2], hour: 12)) ?? .now
    }

    /// Monday-first weeks of a month, padded with the neighbouring months so every row is full.
    /// `month` is 0-based.
    static func monthGrid(year: Int, month: Int) -> [String] {
        guard let first = calendar.date(from: DateComponents(year: year, month: month + 1, day: 1)),
              let days = calendar.range(of: .day, in: .month, for: first)?.count else { return [] }
        // weekday: 1 = Sunday; shift so Monday is column 0
        let lead = (calendar.component(.weekday, from: first) + 5) % 7
        let cells = Int((Double(lead + days) / 7).rounded(.up)) * 7
        return (0..<cells).map { addDays(iso(first), $0 - lead) }
    }
}
