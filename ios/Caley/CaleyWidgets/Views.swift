import SwiftUI
import WidgetKit

private extension WidgetFamily {
    var isAccessory: Bool {
        switch self {
        case .accessoryCircular, .accessoryRectangular, .accessoryInline: true
        default: false
        }
    }
}

private extension View {
    /// The warm canvas on the home screen; the lock screen draws its own backdrop
    func caleyBackground(_ family: WidgetFamily, tint: Color = .canvas) -> some View {
        containerBackground(for: .widget) { family.isAccessory ? Color.clear : tint }
    }
}

private func link(_ path: String) -> URL { URL(string: "caley://\(path)")! }

// MARK: Outstanding

struct OutstandingView: View {
    let entry: CaleyEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        content
            .widgetURL(url)
            .caleyBackground(family)
    }

    private var url: URL {
        if case .data(let snapshot, _) = entry.state, snapshot.overdueCount > 0 { return link("invoices?filter=overdue") }
        return link("invoices")
    }

    @ViewBuilder
    private var content: some View {
        switch entry.state {
        case .signedOut: StateMessage(title: "Sign in", detail: "Open Caley to sign in.", symbol: "person.crop.circle", family: family)
        case .unavailable: StateMessage(title: "Can't load", detail: "Open Caley to try again.", symbol: "wifi.slash", family: family)
        case .data(let snapshot, let stale):
            switch family {
            case .accessoryCircular: circular(snapshot)
            case .accessoryRectangular: rectangular(snapshot)
            case .accessoryInline: inline(snapshot)
            default: small(snapshot, stale: stale)
            }
        }
    }

    private func small(_ snapshot: WidgetSnapshot, stale: Bool) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Outstanding").font(.footnote.weight(.medium)).foregroundStyle(.secondary)
            Text(snapshot.amount(snapshot.outstanding, hidden: entry.hideAmounts))
                .font(.system(.title, design: .rounded))
                .fontWeight(.bold)
                .monospacedDigit()
                .minimumScaleFactor(0.5)
                .lineLimit(1)
            Spacer(minLength: 4)
            OverdueLine(count: snapshot.overdueCount)
            FootLine(snapshot: snapshot, stale: stale)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func rectangular(_ snapshot: WidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("Outstanding").font(.caption2).foregroundStyle(.secondary)
            Text(snapshot.amount(snapshot.outstanding, hidden: entry.hideAmounts))
                .font(.headline).monospacedDigit().minimumScaleFactor(0.6).lineLimit(1)
            Text(snapshot.overdueCount > 0 ? "\(snapshot.overdueCount) overdue" : "Nothing overdue")
                .font(.caption2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func circular(_ snapshot: WidgetSnapshot) -> some View {
        ZStack {
            AccessoryWidgetBackground()
            if snapshot.overdueCount > 0 {
                VStack(spacing: 0) {
                    Text("\(snapshot.overdueCount)").font(.title2.weight(.bold)).monospacedDigit()
                    Text("overdue").font(.system(size: 9, weight: .medium))
                }
            } else {
                Image(systemName: "checkmark").font(.title2.weight(.bold))
            }
        }
    }

    private func inline(_ snapshot: WidgetSnapshot) -> some View {
        Text("Owed \(snapshot.amount(snapshot.outstanding, hidden: entry.hideAmounts))" +
             (snapshot.overdueCount > 0 ? " · \(snapshot.overdueCount) overdue" : ""))
    }
}

// MARK: Paid and owed

struct PaidOwedView: View {
    let entry: CaleyEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        content
            .widgetURL(link("dashboard"))
            .caleyBackground(family)
    }

    @ViewBuilder
    private var content: some View {
        switch entry.state {
        case .signedOut: StateMessage(title: "Sign in", detail: "Open Caley to sign in.", symbol: "person.crop.circle", family: family)
        case .unavailable: StateMessage(title: "Can't load", detail: "Open Caley to try again.", symbol: "wifi.slash", family: family)
        case .data(let snapshot, let stale):
            switch family {
            case .accessoryCircular: circular(snapshot)
            case .accessoryRectangular: rectangular(snapshot)
            case .systemMedium: medium(snapshot, stale: stale)
            default: small(snapshot, stale: stale)
            }
        }
    }

    private func paid(_ snapshot: WidgetSnapshot) -> String { snapshot.amount(snapshot.paid, hidden: entry.hideAmounts) }
    private func owed(_ snapshot: WidgetSnapshot) -> String { snapshot.amount(snapshot.outstanding, hidden: entry.hideAmounts) }
    private func percent(_ snapshot: WidgetSnapshot) -> String { "\(Int((snapshot.paidShare * 100).rounded()))% paid" }

    private func small(_ snapshot: WidgetSnapshot, stale: Bool) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Paid · \(snapshot.fyLabel)").font(.footnote.weight(.medium)).foregroundStyle(.secondary)
            Text(paid(snapshot))
                .font(.system(.title2, design: .rounded)).fontWeight(.bold).monospacedDigit()
                .foregroundStyle(.green)
                .minimumScaleFactor(0.5).lineLimit(1)
            Spacer(minLength: 4)
            if !entry.hideAmounts { ShareBar(share: snapshot.paidShare).padding(.bottom, 4) }
            Text("Outstanding").font(.caption2).foregroundStyle(.secondary)
            Text(owed(snapshot))
                .font(.system(.callout, design: .rounded)).fontWeight(.bold).monospacedDigit()
                .foregroundStyle(Color.brand)
                .minimumScaleFactor(0.6).lineLimit(1)
            if stale { OfflineTag(savedAt: snapshot.savedAt) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func medium(_ snapshot: WidgetSnapshot, stale: Bool) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 16) {
                column("Paid", paid(snapshot), tint: .green)
                column("Outstanding", owed(snapshot), tint: Color.brand)
            }
            Spacer(minLength: 0)
            if !entry.hideAmounts {
                ShareBar(share: snapshot.paidShare)
                HStack {
                    Text(percent(snapshot)).font(.caption.weight(.medium))
                    Spacer(minLength: 8)
                    Text(snapshot.fyLabel).font(.caption).foregroundStyle(.secondary)
                }
            } else {
                Text(snapshot.fyLabel).font(.caption).foregroundStyle(.secondary)
            }
            HStack(spacing: 8) {
                OverdueLine(count: snapshot.overdueCount)
                Spacer(minLength: 0)
                if stale { OfflineTag(savedAt: snapshot.savedAt) }
            }
        }
    }

    private func column(_ title: String, _ value: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(title).font(.footnote.weight(.medium)).foregroundStyle(.secondary)
            Text(value)
                .font(.system(.title2, design: .rounded)).fontWeight(.bold).monospacedDigit()
                .foregroundStyle(tint)
                .minimumScaleFactor(0.5).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func rectangular(_ snapshot: WidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Paid \(paid(snapshot))").font(.headline).monospacedDigit().minimumScaleFactor(0.6).lineLimit(1)
            Text("Owed \(owed(snapshot))").font(.caption).monospacedDigit().minimumScaleFactor(0.6).lineLimit(1)
            if !entry.hideAmounts { Gauge(value: snapshot.paidShare) { EmptyView() }.gaugeStyle(.accessoryLinearCapacity) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func circular(_ snapshot: WidgetSnapshot) -> some View {
        Group {
            if entry.hideAmounts {
                ZStack { AccessoryWidgetBackground(); Image(systemName: "lock.fill").font(.title3) }
            } else {
                Gauge(value: snapshot.paidShare) {
                    Text("Paid")
                } currentValueLabel: {
                    Text("\(Int((snapshot.paidShare * 100).rounded()))")
                }
                .gaugeStyle(.accessoryCircularCapacity)
            }
        }
    }
}

/// Paid against outstanding as one bar: the green part is what has been paid
private struct ShareBar: View {
    let share: Double

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.brand.opacity(0.28))
                Capsule().fill(Color.green).frame(width: max(proxy.size.width * share, share > 0 ? 6 : 0))
            }
        }
        .frame(height: 6)
        .accessibilityLabel("\(Int((share * 100).rounded())) percent paid")
    }
}

// MARK: Summary

struct SummaryView: View {
    let entry: CaleyEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        content
            .widgetURL(link("invoices"))
            .caleyBackground(family)
    }

    @ViewBuilder
    private var content: some View {
        switch entry.state {
        case .signedOut: StateMessage(title: "Sign in", detail: "Open Caley to sign in.", symbol: "person.crop.circle", family: family)
        case .unavailable: StateMessage(title: "Can't load", detail: "Open Caley to try again.", symbol: "wifi.slash", family: family)
        case .data(let snapshot, let stale): summary(snapshot, stale: stale)
        }
    }

    private func summary(_ snapshot: WidgetSnapshot, stale: Bool) -> some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text(snapshot.fyLabel).font(.footnote.weight(.medium)).foregroundStyle(.secondary)
                Stat(title: "Invoiced", value: snapshot.amount(snapshot.invoiced, hidden: entry.hideAmounts), tint: .primary)
                Stat(title: "Paid", value: snapshot.amount(snapshot.paid, hidden: entry.hideAmounts), tint: .green)
                Stat(title: "Outstanding", value: snapshot.amount(snapshot.outstanding, hidden: entry.hideAmounts), tint: .brand)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .leading, spacing: 7) {
                ForEach(snapshot.recent) { invoice in
                    Link(destination: link("invoice/\(invoice.id)")) {
                        RecentRow(invoice: invoice, snapshot: snapshot, hidden: entry.hideAmounts)
                    }
                }
                Spacer(minLength: 0)
                if stale || snapshot.overdueCount > 0 {
                    HStack(spacing: 6) {
                        if snapshot.overdueCount > 0 { OverdueLine(count: snapshot.overdueCount) }
                        Spacer(minLength: 0)
                        if stale { OfflineTag(savedAt: snapshot.savedAt) }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct Stat: View {
    let title: String
    let value: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title).font(.caption2).foregroundStyle(.secondary)
            Text(value)
                .font(.system(.callout, design: .rounded))
                .fontWeight(.bold)
                .monospacedDigit()
                .foregroundStyle(tint)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
        }
    }
}

private struct RecentRow: View {
    let invoice: WidgetSnapshot.Recent
    let snapshot: WidgetSnapshot
    let hidden: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 5) {
                Circle().fill(invoice.status.tint).frame(width: 6, height: 6)
                Text(invoice.number).font(.caption.weight(.semibold))
                Spacer(minLength: 4)
                Text(snapshot.amount(invoice.total, hidden: hidden))
                    .font(.caption.weight(.semibold)).monospacedDigit().lineLimit(1).minimumScaleFactor(0.7)
            }
            Text(invoice.showName).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
        }
    }
}

// MARK: New invoice

struct NewInvoiceView: View {
    @Environment(\.widgetFamily) private var family

    var body: some View {
        Group {
            if family == .accessoryCircular {
                ZStack {
                    AccessoryWidgetBackground()
                    Image(systemName: "plus").font(.title2.weight(.bold))
                }
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    Image(systemName: "plus.circle.fill").font(.system(size: 34))
                    Spacer(minLength: 0)
                    Text("New invoice").font(.headline)
                    Text("Paint the days").font(.caption).opacity(0.8)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .widgetURL(link("new"))
        .caleyBackground(family, tint: .brand)
    }
}

// MARK: Pieces

private struct OverdueLine: View {
    let count: Int

    var body: some View {
        if count > 0 {
            Label("\(count) overdue", systemImage: "exclamationmark.circle.fill")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.red)
        } else {
            Label("Nothing overdue", systemImage: "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(.green)
        }
    }
}

/// The tax year, or how old the numbers are when the server couldn't be reached
private struct FootLine: View {
    let snapshot: WidgetSnapshot
    let stale: Bool

    var body: some View {
        if stale {
            OfflineTag(savedAt: snapshot.savedAt)
        } else {
            Text(snapshot.fyLabel).font(.caption2).foregroundStyle(.secondary)
        }
    }
}

private struct OfflineTag: View {
    let savedAt: Date

    var body: some View {
        Label {
            Text(savedAt, format: .relative(presentation: .numeric, unitsStyle: .abbreviated))
        } icon: {
            Image(systemName: "wifi.slash")
        }
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
}

private struct StateMessage: View {
    let title: String
    let detail: String
    let symbol: String
    let family: WidgetFamily

    var body: some View {
        if family == .accessoryInline {
            Text("Caley: \(detail)")
        } else {
            VStack(alignment: .leading, spacing: 4) {
                Image(systemName: symbol).font(family == .accessoryCircular ? .title3 : .title2).foregroundStyle(.secondary)
                if family != .accessoryCircular {
                    Text(title).font(.headline)
                    Text(detail).font(.caption).foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: family == .accessoryCircular ? .center : .leading)
        }
    }
}
