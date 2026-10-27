import SwiftUI

private enum Names {
    static let travel = "Travel Days", work = "Work Days", dark = "Dark days"
    static let perDiemTravel = "Per Diems Travel Days", perDiemWork = "Per Diems Work Days"
    static let standard: Set<String> = [travel, work, dark, perDiemTravel, perDiemWork]
}

struct BillingLine: Identifiable {
    let id: String
    let title: String
    let detail: String
    let amount: Decimal
}

struct BillingGroup: Identifiable {
    var id: String { title }
    let title: String
    let lines: [BillingLine]
}

enum BillingLines {
    /// Reads stored (or server-previewed) rows into the groups an invoice shows. It never bills:
    /// overtime is the only derived line, as hourly = Work Days rate ÷ 10, exactly as
    /// `summariseInvoice` does on the web.
    static func groups(items: [LineItem], overtime: [OvertimeEntry], expenses: [LineItem], currency: String) -> [BillingGroup] {
        func line(_ item: LineItem, _ title: String, _ index: Int) -> BillingLine {
            BillingLine(
                id: "\(title)-\(index)", title: title,
                detail: "\(item.quantity) × \(item.unitPrice.money(currency))", amount: item.cost.value)
        }
        func named(_ name: String) -> LineItem? { items.first { $0.description == name && $0.quantity > 0 } }

        var labour = [Names.travel, Names.work, Names.dark].enumerated().compactMap { index, name in
            named(name).map { line($0, name.replacingOccurrences(of: "Days", with: "days"), index) }
        }

        let hourly = (items.first { $0.description == Names.work }?.unitPrice.value ?? 0) / 10
        struct Key: Hashable { let date: String; let rate: String }
        var hours: [Key: Decimal] = [:]
        for entry in overtime {
            hours[Key(date: String(entry.date.prefix(10)), rate: entry.rateType == "1.5x" ? "1.5x" : "2x"), default: 0] += entry.hours.value
        }
        for (key, total) in hours.sorted(by: { ($0.key.date, $0.key.rate) < ($1.key.date, $1.key.rate) }) where total > 0 {
            let multiplier: Decimal = key.rate == "1.5x" ? 1.5 : 2
            let date = DateOnly.parse(key.date).map { DateOnly.format($0, .dateTime.day().month(.abbreviated)) } ?? key.date
            labour.append(BillingLine(
                id: "ot-\(key.date)-\(key.rate)",
                title: "Overtime at \(key.rate.replacingOccurrences(of: "x", with: "×")) · \(date)",
                detail: "\(total) h × \((hourly * multiplier).money(currency))",
                amount: total * hourly * multiplier))
        }

        let perDiems = [
            named(Names.perDiemTravel).map { line($0, "Travel days", 0) },
            named(Names.perDiemWork).map { line($0, "Work days", 1) },
        ].compactMap { $0 }
        let other = items.filter { !Names.standard.contains($0.description) && $0.quantity > 0 }
            .enumerated().map { line($1, $1.description, $0) }
        let expenseLines = expenses.enumerated().map { line($1, $1.description, $0) }

        return [("Labour", labour), ("Per diems", perDiems), ("Other", other), ("Expenses", expenseLines)]
            .filter { !$0.1.isEmpty }
            .map { BillingGroup(title: $0.0, lines: $0.1) }
    }
}

/// The grouped lines and a total; the caller supplies the card around it.
struct BillingBreakdown: View {
    let groups: [BillingGroup]
    let total: Decimal
    let currency: String

    var body: some View {
        VStack(spacing: 14) {
            ForEach(groups) { group in
                VStack(spacing: 8) {
                    Text(group.title).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    ForEach(group.lines) { line in
                        HStack(alignment: .firstTextBaseline) {
                            VStack(alignment: .leading, spacing: 1) {
                                Text(line.title)
                                Text(line.detail).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(line.amount.money(currency)).monospacedDigit()
                        }
                        .font(.subheadline)
                    }
                }
            }
            Divider()
            HStack {
                Text("Total").font(.headline)
                Spacer()
                Text(total.money(currency)).font(.headline).monospacedDigit()
            }
        }
    }
}
