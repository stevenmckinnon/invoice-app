import SwiftUI

enum TaxYearExport {
    /// The tax years to offer: those with an invoice in them, plus the current one, newest first
    static func years(for invoices: [InvoiceListItem], now: Date = .now) -> [Int] {
        let dated = invoices.compactMap { $0.date.map(DateOnly.fyStart(of:)) }
        return Array(Set(dated + [DateOnly.fyStart(of: now)])).sorted(by: >)
    }

    /// Matches the file the server names: `caley-invoices-2026-27.csv`
    static func filename(year: Int) -> String {
        "caley-invoices-\(DateOnly.fyLabel(year).replacingOccurrences(of: "/", with: "-")).csv"
    }
}

/// Account's "Export for your accountant": pick a tax year, get the CSV, share it
struct TaxYearExportRow: View {
    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var store
    @State private var working: Int?
    @State private var shareURL: URL?
    @State private var failure: String?

    var body: some View {
        Menu {
            ForEach(TaxYearExport.years(for: store.invoices), id: \.self) { year in
                Button("Tax year \(DateOnly.fyLabel(year))") { Task { await export(year) } }
            }
        } label: {
            HStack {
                Label("Export for your accountant", systemImage: "square.and.arrow.up")
                Spacer()
                if working != nil { ProgressView() }
            }
            .contentShape(Rectangle())
        }
        // A Menu draws its label in the tint; the other rows in the list are plain text
        .tint(.primary)
        .disabled(working != nil)
        .sheet(item: $shareURL) { url in
            ShareSheet(url: url).presentationDetents([.medium, .large])
        }
        .alert("Couldn't export", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(failure ?? "")
        }
    }

    private func export(_ year: Int) async {
        working = year
        defer { working = nil }
        do {
            shareURL = try await auth.api.taxYearExport(year: year)
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            failure = error.localizedDescription
        }
    }
}
