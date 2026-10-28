import Foundation

/// The dashboard's numbers, shared with the home screen widgets so the two can't disagree. One
/// currency at a time (there is no rate to add pounds to dollars with), the UK tax year, and
/// outstanding means sent plus overdue.
struct DashboardSummary: Equatable {
    let currencies: [String]
    let currency: String
    let years: [Int]
    let fy: Int
    let inYear: [InvoiceListItem]

    init(invoices: [InvoiceListItem], fy selectedFy: Int? = nil, currency selectedCurrency: String? = nil, now: Date = .now) {
        let codes = Array(Set(invoices.map(\.currencyCode))).sorted()
        currencies = codes
        // The currency most invoices use; a tie goes to the alphabetically first so it never flickers
        let commonest = Dictionary(grouping: invoices, by: \.currencyCode)
            .map { (code: $0.key, count: $0.value.count) }
            .sorted { ($0.count, $1.code) > ($1.count, $0.code) }
            .first?.code ?? "GBP"
        if let selectedCurrency, codes.contains(selectedCurrency) { currency = selectedCurrency } else { currency = commonest }

        let currentFy = DateOnly.fyStart(of: now)
        years = Set(invoices.compactMap { $0.date.map(DateOnly.fyStart(of:)) }).union([currentFy]).sorted(by: >)
        fy = selectedFy ?? currentFy

        let code = currency
        let year = fy
        inYear = invoices.filter { $0.currencyCode == code && $0.date.map(DateOnly.fyStart(of:)) == year }
    }

    static func total(_ list: [InvoiceListItem]) -> Decimal { list.reduce(0) { $0 + $1.totalAmount.value } }

    func list(_ status: InvoiceStatus) -> [InvoiceListItem] { inYear.filter { $0.status == status } }

    var outstandingInvoices: [InvoiceListItem] { inYear.filter { $0.status == .sent || $0.status == .overdue } }

    var invoiced: Decimal { Self.total(inYear) }
    var paid: Decimal { Self.total(list(.paid)) }
    var outstanding: Decimal { Self.total(outstandingInvoices) }
    var overdueCount: Int { list(.overdue).count }
}
