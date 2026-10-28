import SwiftUI

struct InvoiceListView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var store
    @State private var search = ""
    @State private var filter: InvoiceStatus?
    @State private var creating = false
    @State private var selection: String?
    @Environment(\.horizontalSizeClass) private var sizeClass

    private var rows: [InvoiceListItem] {
        store.invoices
            .filter { filter == nil || $0.status == filter }
            .filter {
                search.isEmpty
                    || $0.invoiceNumber.localizedCaseInsensitiveContains(search)
                    || $0.showName.localizedCaseInsensitiveContains(search)
                    || ($0.clientName ?? "").localizedCaseInsensitiveContains(search)
            }
            .sorted { ($0.date ?? .distantPast) > ($1.date ?? .distantPast) }
    }

    private var wide: Bool { sizeClass == .regular }

    var body: some View {
        if wide {
            // A wide screen has room for the list and the invoice side by side
            NavigationSplitView {
                listColumn
            } detail: {
                detailColumn
            }
            // The columns and the strip under the tab bar share the app's canvas, not the system white
            .modifier(CanvasSplitBackground())
        } else {
            NavigationStack {
                listColumn
                    .navigationDestination(for: String.self) { InvoiceDetailView(id: $0) }
            }
        }
    }

    @ViewBuilder
    private var detailColumn: some View {
        // An invoice that was deleted drops out of the store, which empties this on its own
        if let id = selection, store.invoices.contains(where: { $0.id == id }) {
            InvoiceDetailView(id: id).id(id)
        } else {
            EmptyState(title: "Select an invoice", message: "Pick one from the list to see its billing.", symbol: "doc.text")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.canvas)
        }
    }

    private var listColumn: some View {
        Group {
            if !store.loaded && store.error == nil {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = store.error, !store.loaded {
                EmptyState(title: "Couldn't load invoices", message: error, symbol: "wifi.exclamationmark")
            } else if rows.isEmpty {
                EmptyState(
                    title: store.invoices.isEmpty ? "No invoices yet" : "No matches",
                    message: store.invoices.isEmpty
                        ? "Invoices you create on the web show up here."
                        : "Try a different search or status.",
                    symbol: "doc.text"
                )
            } else {
                // Only the wide layout tracks a selection: on a phone a selection binding would
                // take the tap before the row's link could push the invoice
                Group {
                    if wide {
                        List(rows, selection: $selection) { invoice in row(invoice) }
                    } else {
                        List(rows) { invoice in row(invoice) }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .background(Color.canvas)
        .navigationTitle("Invoices")
        .searchable(text: $search, prompt: "Invoice, show or client")
        .sheet(isPresented: $creating) {
            InvoiceEditorView(editing: nil) { Task { await store.load(auth: auth) } }
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { creating = true } label: { Image(systemName: "plus") }
                    .accessibilityLabel("New invoice")
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Picker("Status", selection: $filter) {
                        Text("All").tag(InvoiceStatus?.none)
                        ForEach(InvoiceStatus.allCases) { Text($0.label).tag(InvoiceStatus?.some($0)) }
                    }
                } label: {
                    Image(systemName: filter == nil
                          ? "line.3.horizontal.decrease.circle"
                          : "line.3.horizontal.decrease.circle.fill")
                }
                .accessibilityLabel("Filter by status")
                .accessibilityValue(filter?.label ?? "All")
            }
        }
        .refreshable { await store.load(auth: auth) }
        .task { if !store.loaded { await store.load(auth: auth) } }

    }

    private func row(_ invoice: InvoiceListItem) -> some View {
        NavigationLink(value: invoice.id) { InvoiceRow(invoice: invoice) }
            // The open invoice stays marked, as it would in Mail
            .listRowBackground(wide && selection == invoice.id ? Color.brand.opacity(0.14) : Color.clear)
            .swipeActions(edge: .trailing) { swipe(for: invoice) }
    }

    @ViewBuilder
    private func swipe(for invoice: InvoiceListItem) -> some View {
        if invoice.status != .paid {
            Button("Paid", systemImage: "checkmark.circle") {
                Task { _ = await store.setStatus(.paid, for: invoice.id, auth: auth) }
            }
            .tint(.green)
        }
        if invoice.status == .draft {
            Button("Sent", systemImage: "paperplane") {
                Task { _ = await store.setStatus(.sent, for: invoice.id, auth: auth) }
            }
            .tint(.blue)
        }
    }
}

struct InvoiceRow: View {
    let invoice: InvoiceListItem

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                // The date is what you scan for, so it sits beside the number where nothing can cut it off
                Text(invoice.invoiceNumber).font(.subheadline.weight(.semibold))
                if let date = invoice.date {
                    Text(DateOnly.format(date)).font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer(minLength: 8)
                Text(invoice.totalAmount.money(invoice.currencyCode))
                    .font(.subheadline.weight(.semibold))
                    .monospacedDigit()
            }
            .lineLimit(1)
            Text(invoice.showName).font(.subheadline).lineLimit(1)
            HStack {
                Text(invoice.clientName ?? "No client")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Spacer()
                StatusBadge(status: invoice.status)
            }
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }
}

private struct CanvasSplitBackground: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 18, *) {
            content
                .containerBackground(Color.canvas, for: .navigationSplitView)
                .background(Color.canvas.ignoresSafeArea())
        } else {
            content.background(Color.canvas.ignoresSafeArea())
        }
    }
}
