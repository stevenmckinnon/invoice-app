import SwiftUI

/// Every figure here is in one currency at a time: there is no FX rate to add
/// pounds to dollars with, so a picker appears only when invoices use several.
struct DashboardView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var store
    @Environment(ClientStore.self) private var clientStore
    @Environment(AppNavigation.self) private var navigation
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.horizontalSizeClass) private var sizeClass
    @ScaledMetric(relativeTo: .largeTitle) private var heroSize: CGFloat = 34
    @State private var creating = false
    @State private var needsClient = false
    @State private var selectedFy: Int?
    @State private var selectedCurrency: String?

    private var summary: DashboardSummary {
        DashboardSummary(invoices: store.invoices, fy: selectedFy, currency: selectedCurrency)
    }

    private var currencies: [String] { summary.currencies }
    private var currency: String { summary.currency }
    private var years: [Int] { summary.years }
    private var fy: Int { summary.fy }
    private var inYear: [InvoiceListItem] { summary.inYear }

    private func total(_ list: [InvoiceListItem]) -> Decimal { DashboardSummary.total(list) }

    var body: some View {
        NavigationStack {
            ScrollView {
                if !store.loaded && store.error == nil {
                    ProgressView().frame(maxWidth: .infinity).padding(.top, 80)
                } else if let error = store.error, !store.loaded {
                    EmptyState(title: "Couldn't load", message: error, symbol: "wifi.exclamationmark")
                } else {
                    content
                }
            }
            .readableScroll()
            .background(Color.canvas)
            .navigationTitle(sizeClass == .regular ? "" : "Dashboard")
            .toolbarTitleDisplayMode(sizeClass == .regular ? .inline : .large)
            .navigationDestination(for: String.self) { InvoiceDetailView(id: $0) }
            .toolbar {
                // On a wide screen the year picker joins the header row below instead: a toolbar item
                // isn't kept inside the content's width on every wide layout (a foldable's side tab bar)
                if sizeClass != .regular {
                    ToolbarItem(placement: .topBarTrailing) { yearMenu }
                }

            }
            .refreshable { await store.load(auth: auth) }
            // A `caley://new` link from the widget: it may arrive before this screen exists
            .task(id: navigation.pendingNewInvoice) {
                guard navigation.pendingNewInvoice else { return }
                navigation.pendingNewInvoice = false
                startInvoice()
            }
            .task {
                if !store.loaded { await store.load(auth: auth) }
                if !clientStore.loaded { await clientStore.load(auth: auth) }
            }
            .sheet(isPresented: $creating) {
                InvoiceEditorView(editing: nil) { Task { await store.load(auth: auth) } }
            }
            .alert("Add a client first", isPresented: $needsClient) {
                Button("Go to Clients") {
                    navigation.accountPath = [.clients]
                    navigation.tab = .account
                }
                Button("Not now", role: .cancel) {}
            } message: {
                Text("A client's day rate prices every invoice, and none of your clients has one yet.")
            }
        }
    }

    /// Creating is the most common thing to do here, so it leads the page. With no client that can
    /// price days the editor couldn't save anything, so that case sends you to Clients instead.
    private func startInvoice() {
        if clientStore.loaded, !clientStore.clients.contains(where: \.canBill) {
            needsClient = true
        } else {
            creating = true
        }
    }

    private var newInvoiceButton: some View {
        Button(action: startInvoice) {
            Label("New invoice", systemImage: "plus")
                .font(.headline)
                .frame(maxWidth: .infinity, minHeight: 52)
                .foregroundStyle(.white)
                .background(Color.brand, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(PressableStyle())
    }

    private var yearMenu: some View {
        Menu {
            Picker("Tax year", selection: Binding(get: { fy }, set: { selectedFy = $0 })) {
                ForEach(years, id: \.self) { Text(DateOnly.fyLabel($0)).tag($0) }
            }
            if currencies.count > 1 {
                Picker("Currency", selection: Binding(get: { currency }, set: { selectedCurrency = $0 })) {
                    ForEach(currencies, id: \.self) { Text($0).tag($0) }
                }
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "calendar")
                Text(DateOnly.fyLabel(fy)).monospacedDigit()
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Tax year \(DateOnly.fyLabel(fy))")
            .accessibilityHint("Change year or currency")
        }
    }

    @ViewBuilder
    private var content: some View {
        let outstanding = inYear.filter { $0.status == .sent || $0.status == .overdue }
        let overdue = inYear.filter { $0.status == .overdue }
        VStack(spacing: 12) {
            if sizeClass == .regular {
                // The large title belongs to the navigation bar and can't share its line, so on a wide
                // screen the title is drawn here, with a compact button beside it
                HStack(alignment: .center) {
                    Text("Dashboard")
                        .font(.largeTitle.bold())
                        .accessibilityAddTraits(.isHeader)
                    Spacer(minLength: 12)
                    yearMenu
                        .padding(.horizontal, 16)
                        .frame(minHeight: 44)
                        .background(Color.card, in: Capsule())
                    Button(action: startInvoice) {
                        Label("New invoice", systemImage: "plus")
                            .font(.headline)
                            .padding(.horizontal, 20)
                            .frame(minHeight: 44)
                            .foregroundStyle(.white)
                            .background(Color.brand, in: Capsule())
                    }
                    .buttonStyle(PressableStyle())
                }
                .padding(.top, 4)
            } else {
                newInvoiceButton
            }
            if store.invoices.isEmpty {
                EmptyState(title: "Nothing to show yet", message: "Create your first invoice and your totals show up here.", symbol: "chart.bar")
            } else {
                let thisMonth = summary.invoicedThisMonth
                heroCard(title: "Invoiced · \(DateOnly.fyLabel(fy))", value: total(inYear).money(currency),
                         pill: summary.isCurrentFy && thisMonth > 0
                            ? "\(thisMonth.money(currency)) invoiced in \(summary.monthName)" : nil,
                         footnote: "\(inYear.count) invoice\(inYear.count == 1 ? "" : "s")")
                let paidThisMonth = summary.paidThisMonth
                // Side by side while two amounts fit; stacked once text is large enough that they'd be cut off
                let cards = Group {
                    statCard(title: "Paid", value: total(inYear.filter { $0.status == .paid }).money(currency), tint: .green,
                             change: summary.isCurrentFy && paidThisMonth.count > 0
                                ? "\(paidThisMonth.amount.money(currency)) paid in \(summary.monthName)" : nil)
                    statCard(title: "Outstanding", value: total(outstanding).money(currency), tint: .blue,
                             footnote: overdue.isEmpty ? nil : "\(overdue.count) overdue")
                }
                if typeSize >= .xxLarge {
                    VStack(spacing: 12) { cards }
                } else {
                    HStack(spacing: 12) { cards }
                }
                if !inYear.isEmpty { MonthBarsCard(summary: summary) }
                statusBreakdown
                recent
            }
        }
        // On a wide screen the large title sits at the column's edge, so the cards go flush with it
        .padding(.vertical, 16)
        .padding(.horizontal, sizeClass == .regular ? 0 : 16)
    }

    /// The pill says what this month added to the total, as an amount; with nothing yet this month
    /// the count stands in for it
    private func heroCard(title: String, value: String, pill: String?, footnote: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.subheadline).foregroundStyle(.secondary)
            Text(value)
                .font(.system(size: heroSize, weight: .bold, design: .rounded))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            if let pill {
                Text(pill)
                    .font(.subheadline.weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(Color.success)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.success.opacity(0.12), in: Capsule())
                    .padding(.top, 4)
            } else {
                Text(footnote).font(.footnote).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
        .accessibilityElement(children: .combine)
    }

    /// `change` is one plain fact under the number, muted with an arrow ("↑ £4,378.13 paid in November")
    private func statCard(title: String, value: String, tint: Color, footnote: String? = nil, change: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(title, systemImage: "circle.fill")
                .font(.caption.weight(.medium))
                .labelStyle(DotLabelStyle(tint: tint))
            Text(value).font(.title3.weight(.semibold)).monospacedDigit().minimumScaleFactor(0.7).lineLimit(1)
            if let change {
                Text("\(Image(systemName: "arrow.up")) \(change)")
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
                    .accessibilityLabel(change)
            }
            if let footnote {
                Text(footnote).font(.caption).foregroundStyle(.red)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .cardStyle()
        .accessibilityElement(children: .combine)
    }

    private var statusBreakdown: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("By status").font(.subheadline.weight(.semibold))
            ForEach(InvoiceStatus.allCases.filter { $0 != .void }) { status in
                let list = inYear.filter { $0.status == status }
                HStack {
                    Circle().fill(status.tint).frame(width: 8, height: 8).accessibilityHidden(true)
                    Text(status.label)
                    Text("\(list.count)").foregroundStyle(.secondary)
                    Spacer()
                    Text(total(list).money(currency)).monospacedDigit()
                }
                .font(.subheadline)
                .accessibilityElement(children: .combine)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private var recent: some View {
        let latest = store.invoices
            .sorted { ($0.date ?? .distantPast) > ($1.date ?? .distantPast) }
            .prefix(5)
        return VStack(alignment: .leading, spacing: 4) {
            Text("Recent").font(.subheadline.weight(.semibold)).padding(.bottom, 4)
            ForEach(Array(latest)) { invoice in
                NavigationLink(value: invoice.id) {
                    InvoiceRow(invoice: invoice).contentShape(Rectangle())
                }
                .buttonStyle(RowPressStyle())
                if invoice.id != latest.last?.id { Divider() }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }
}

/// The tax year as twelve bars, April first, each standing in a full-height track: months still to
/// come are bare tracks, and last year's month is a mark across its track. The web's `MonthBars`.
private struct MonthBarsCard: View {
    let summary: DashboardSummary
    @ScaledMetric(relativeTo: .caption2) private var trackHeight: CGFloat = 120

    var body: some View {
        let bars = summary.monthBars
        let hasPrevious = bars.contains { $0.previous != nil }
        let peak = bars.map { max($0.value ?? 0, $0.previous ?? 0) }.max() ?? 0
        let max = peak > 0 ? peak : 1
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("By month").font(.subheadline.weight(.semibold))
                Spacer()
                if hasPrevious {
                    HStack(spacing: 12) {
                        HStack(spacing: 4) {
                            Capsule().fill(Color.brand).frame(width: 5, height: 11)
                            Text(DateOnly.fyLabel(summary.fy))
                        }
                        HStack(spacing: 4) {
                            Rectangle().fill(Color.primary.opacity(0.45)).frame(width: 11, height: 2)
                            Text(DateOnly.fyLabel(summary.fy - 1))
                        }
                    }
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .accessibilityHidden(true)
                }
            }
            HStack(alignment: .bottom, spacing: 4) {
                ForEach(bars) { bar in
                    VStack(spacing: 6) {
                        track(bar, max: max)
                        Text(bar.label)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .opacity(bar.value == nil ? 0.6 : 1)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: .infinity)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(label(bar))
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private func fraction(_ value: Decimal, of max: Decimal) -> CGFloat {
        CGFloat(truncating: (value / max) as NSDecimalNumber)
    }

    private func track(_ bar: DashboardSummary.MonthBar, max: Decimal) -> some View {
        GeometryReader { proxy in
            let height = proxy.size.height
            ZStack(alignment: .bottom) {
                Capsule().fill(Color.primary.opacity(0.07))
                if let value = bar.value, value > 0 {
                    // Never thinner than the track is wide, so a small month still reads as a bar
                    Capsule().fill(Color.brand)
                        .frame(height: Swift.max(proxy.size.width, height * fraction(value, of: max)))
                }
                if let previous = bar.previous, previous > 0 {
                    Rectangle().fill(Color.primary.opacity(0.45))
                        .frame(height: 2)
                        .offset(y: -height * fraction(previous, of: max) + 1)
                }
            }
            .clipShape(Capsule())
        }
        .frame(maxWidth: 28)
        .frame(height: trackHeight)
    }

    private func label(_ bar: DashboardSummary.MonthBar) -> String {
        let currency = summary.currency
        var text = bar.value.map { "\(bar.label), \($0.money(currency)) invoiced" } ?? "\(bar.label), still to come"
        if let previous = bar.previous {
            text += ", \(previous.money(currency)) in \(DateOnly.fyLabel(summary.fy - 1))"
        }
        return text
    }
}

struct DotLabelStyle: LabelStyle {
    let tint: Color
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 6) {
            Circle().fill(tint).frame(width: 8, height: 8).accessibilityHidden(true)
            configuration.title.foregroundStyle(.secondary)
        }
    }
}

extension View {
    func cardStyle() -> some View {
        padding(16).background(Color.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
