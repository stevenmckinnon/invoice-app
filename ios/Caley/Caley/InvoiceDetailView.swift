import SwiftUI
import QuickLook

struct InvoiceDetailView: View {
    let id: String

    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var store
    @State private var invoice: InvoiceDetail?
    @State private var error: String?
    @State private var pdfBusy = false
    @State private var shareURL: URL?
    @State private var previewURL: URL?
    @State private var editing = false
    @ScaledMetric(relativeTo: .largeTitle) private var totalSize: CGFloat = 32
    @State private var pdfError: String?

    var body: some View {
        Group {
            if let invoice {
                content(invoice)
            } else if let error {
                EmptyState(title: "Couldn't load invoice", message: error, symbol: "wifi.exclamationmark")
            } else {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Color.canvas)
        .navigationTitle(invoice?.invoiceNumber ?? "Invoice")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .sheet(item: $shareURL) { ShareSheet(url: $0).presentationDetents([.medium, .large]) }
        .quickLookPreview($previewURL)
        .sheet(isPresented: $editing) {
            if let invoice {
                InvoiceEditorView(editing: invoice) {
                    Task {
                        await load()
                        await store.load(auth: auth)
                    }
                }
            }
        }
    }

    private func load() async {
        do {
            invoice = try await auth.api.invoice(id: id)
            error = nil
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func content(_ inv: InvoiceDetail) -> some View {
        ScrollView {
            VStack(spacing: 12) {
                header(inv)
                billing(inv)
                parties(inv)
                payment(inv)
                if let notes = inv.notes, !notes.isEmpty {
                    section("Notes") { Text(notes).font(.subheadline).frame(maxWidth: .infinity, alignment: .leading) }
                }
            }
            .padding(16)
        }
        .refreshable { await load() }
        .toolbar {
            if inv.isEditable {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Edit") { editing = true }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("Preview PDF", systemImage: "eye") { Task { previewURL = await fetchPDF(inv) } }
                    Button("Share PDF", systemImage: "square.and.arrow.up") { Task { shareURL = await fetchPDF(inv) } }
                } label: {
                    if pdfBusy { ProgressView() } else { Image(systemName: "doc.richtext") }
                }
                .accessibilityLabel("PDF")
                .accessibilityHint("Preview or share this invoice as a PDF")
                .disabled(pdfBusy)
            }
        }
    }

    private func fetchPDF(_ inv: InvoiceDetail) async -> URL? {
        pdfBusy = true
        defer { pdfBusy = false }
        do {
            return try await auth.api.pdf(id: inv.id, invoiceNumber: inv.invoiceNumber)
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            pdfError = error.localizedDescription
        }
        return nil
    }

    // MARK: Sections

    private func header(_ inv: InvoiceDetail) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(inv.showName).font(.title3.weight(.semibold))
                    Text([inv.clientName, inv.date.map { DateOnly.format($0, .dateTime.day().month(.wide).year()) }]
                        .compactMap { $0 }.joined(separator: " · "))
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
            }
            Text(inv.totalAmount.money(inv.currencyCode))
                .font(.system(size: totalSize, weight: .bold, design: .rounded))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            statusMenu(inv)
            if let pdfError {
                Text(pdfError).font(.footnote).foregroundStyle(.red)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private func statusMenu(_ inv: InvoiceDetail) -> some View {
        Menu {
            ForEach(InvoiceStatus.allCases) { status in
                Button {
                    Task { await change(to: status, inv) }
                } label: {
                    if status == inv.status { Label(status.label, systemImage: "checkmark") } else { Text(status.label) }
                }
            }
        } label: {
            HStack(spacing: 6) {
                StatusBadge(status: inv.status)
                Image(systemName: "chevron.up.chevron.down").font(.caption2).foregroundStyle(.secondary)
            }
        }
        .accessibilityLabel("Status: \(inv.status.label). Change status")
    }

    private func change(to status: InvoiceStatus, _ inv: InvoiceDetail) async {
        guard status != inv.status else { return }
        let previous = invoice?.status
        invoice?.status = status
        if await store.setStatus(status, for: inv.id, auth: auth) == false {
            invoice?.status = previous ?? inv.status
        }
    }

    private func billing(_ inv: InvoiceDetail) -> some View {
        section("Billing") {
            BillingBreakdown(
                groups: BillingLines.groups(
                    items: inv.items, overtime: inv.overtimeEntries,
                    expenses: inv.customExpenseEntries, currency: inv.currencyCode),
                total: inv.totalAmount.value, currency: inv.currencyCode)
        }
    }

    private func parties(_ inv: InvoiceDetail) -> some View {
        section("Billed to") {
            VStack(alignment: .leading, spacing: 2) {
                if let name = inv.clientName { Text(name).fontWeight(.medium) }
                if let attn = inv.attentionTo, !attn.isEmpty { Text("Attn: \(attn)") }
                ForEach([inv.clientAddress1, inv.clientAddress2, inv.clientCity, inv.clientPostalCode, inv.clientCountry]
                    .compactMap { $0 }.filter { !$0.isEmpty }, id: \.self) { Text($0) }
            }
            .font(.subheadline)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func payment(_ inv: InvoiceDetail) -> some View {
        section("Payment details") {
            VStack(spacing: 8) {
                row("Account name", inv.fullName)
                row("IBAN", inv.iban)
                row("SWIFT / BIC", inv.swiftBic)
                if let n = inv.accountNumber, !n.isEmpty { row("Account number", n) }
                if let s = inv.sortCode, !s.isEmpty { row("Sort code", s) }
            }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label).foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .monospaced()
                .textSelection(.enabled)
                .multilineTextAlignment(.trailing)
                .fixedSize(horizontal: false, vertical: true)
        }
        .font(.subheadline)
    }

    private func section<Content: View>(_ title: String, @ViewBuilder _ body: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.subheadline.weight(.semibold))
            body()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

}

extension URL: @retroactive Identifiable {
    public var id: String { absoluteString }
}
