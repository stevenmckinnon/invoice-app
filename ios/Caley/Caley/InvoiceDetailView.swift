import SwiftUI
import QuickLook

struct InvoiceDetailView: View {
    let id: String

    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var invoice: InvoiceDetail?
    @State private var error: String?
    @State private var pdfBusy = false
    @State private var shareURL: URL?
    @State private var previewURL: URL?
    @State private var editing = false
    @State private var duplicating = false
    @State private var confirmingDelete = false
    @ScaledMetric(relativeTo: .largeTitle) private var totalSize: CGFloat = 32
    @State private var pdfError: String?
    /// Shown for a few seconds after sharing a draft marked it sent, so it can be taken back
    @State private var showUndo = false
    @State private var undoTimer: Task<Void, Never>?

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
        // Back online: replace the saved copy on screen with the live invoice
        .onChange(of: Connectivity.shared.showingSavedCopy) { _, showing in
            if !showing {
                pdfError = nil
                Task { await load() }
            }
        }
        .sheet(item: $shareURL) { url in
            ShareSheet(url: url) { completed in
                guard let inv = invoice, let next = InvoiceStatus.afterSharing(inv.status, completed: completed) else { return }
                Task {
                    await change(to: next, inv)
                    // Only say so if the change held (a failed save rolls back and shows its own error)
                    guard invoice?.status == next else { return }
                    announceSent()
                }
            }
            .presentationDetents([.medium, .large])
        }
        .quickLookPreview($previewURL)
        .sheet(isPresented: $duplicating) {
            if let invoice {
                InvoiceEditorView(editing: nil, copying: invoice) {
                    Task { await store.load(auth: auth) }
                }
            }
        }
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
            .readableWidth()
        }
        .refreshable { await load() }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if showUndo { undoNotice(inv) }
        }
        .animation(.easeOut(duration: 0.2), value: showUndo)
        .toolbar {
            if inv.isEditable {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Edit") { editing = true }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("Preview PDF", systemImage: "eye") { Task { previewURL = await fetchPDF(inv) } }
                    // A draft that is shared has gone out, so the label says what will happen
                    Button(inv.status == .draft ? "Share and mark as sent" : "Share PDF",
                           systemImage: "square.and.arrow.up") { Task { shareURL = await fetchPDF(inv) } }
                    Divider()
                    Button("Duplicate", systemImage: "plus.square.on.square") { duplicating = true }
                    Button("Delete", systemImage: "trash", role: .destructive) { confirmingDelete = true }
                } label: {
                    if pdfBusy { ProgressView() } else { Image(systemName: "ellipsis.circle") }
                }
                .accessibilityLabel("More")
                .disabled(pdfBusy)
                .confirmationDialog(
                    "Delete \(inv.invoiceNumber)?", isPresented: $confirmingDelete, titleVisibility: .visible
                ) {
                    Button("Delete invoice", role: .destructive) {
                        Task {
                            if await store.delete(id: inv.id, auth: auth) { dismiss() } else { pdfError = store.error }
                        }
                    }
                } message: {
                    Text(inv.status == .draft
                         ? "This can't be undone."
                         : "This invoice is \(inv.status.label.lowercased()). Deleting it can't be undone.")
                }
            }
        }
    }

    private func announceSent() {
        showUndo = true
        UIAccessibility.post(notification: .announcement, argument: "Marked as sent. Undo is available.")
        undoTimer?.cancel()
        undoTimer = Task {
            try? await Task.sleep(for: .seconds(7))
            if !Task.isCancelled { showUndo = false }
        }
    }

    private func undoNotice(_ inv: InvoiceDetail) -> some View {
        HStack(spacing: 14) {
            Label("Marked as sent", systemImage: "paperplane").font(.subheadline.weight(.medium))
            Button("Undo") {
                undoTimer?.cancel()
                showUndo = false
                Task { await change(to: .draft, inv) }
            }
            .font(.subheadline.weight(.semibold))
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .background(.regularMaterial, in: Capsule())
        .overlay(Capsule().strokeBorder(.separator))
        .padding(.bottom, 8)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    private func fetchPDF(_ inv: InvoiceDetail) async -> URL? {
        pdfBusy = true
        pdfError = nil
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
            // A picker, so iOS draws the tick and keeps every row aligned around it
            Picker("Status", selection: Binding(
                get: { inv.status },
                set: { status in Task { await change(to: status, inv) } }
            )) {
                ForEach(InvoiceStatus.allCases) { status in
                    Label(status.label, systemImage: status.symbol).tag(status)
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
        pdfError = nil
        let previous = invoice?.status
        invoice?.status = status
        if await store.setStatus(status, for: inv.id, auth: auth) == false {
            invoice?.status = previous ?? inv.status
            // Offline, say so: the change would otherwise just flip back with no explanation
            pdfError = store.error
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
