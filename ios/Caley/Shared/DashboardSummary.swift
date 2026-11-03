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
    /// Every non-void invoice in the display currency, whatever its year: a payment this month can be
    /// for an invoice from last tax year
    let inCurrency: [InvoiceListItem]
    let now: Date

    var isCurrentFy: Bool { fy == DateOnly.fyStart(of: now) }

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
        self.now = now
        // A voided invoice was replaced, so counting it would count the job twice
        inCurrency = invoices.filter { $0.status != .void && $0.currencyCode == code }
        inYear = inCurrency.filter { $0.date.map(DateOnly.fyStart(of:)) == year }
    }

    static func total(_ list: [InvoiceListItem]) -> Decimal { list.reduce(0) { $0 + $1.totalAmount.value } }

    func list(_ status: InvoiceStatus) -> [InvoiceListItem] { inYear.filter { $0.status == status } }

    var outstandingInvoices: [InvoiceListItem] { inYear.filter { $0.status == .sent || $0.status == .overdue } }

    var invoiced: Decimal { Self.total(inYear) }
    var paid: Decimal { Self.total(list(.paid)) }
    var outstanding: Decimal { Self.total(outstandingInvoices) }
    var overdueCount: Int { list(.overdue).count }

    /// The calendar month `now` is in, as the name the dashboard says ("November")
    var monthName: String {
        var style = Date.FormatStyle.dateTime.month(.wide)
        style.locale = Locale(identifier: "en_GB")
        return now.formatted(style)
    }

    /// Invoiced so far in this calendar month, by invoice date (a calendar date, so read in UTC)
    var invoicedThisMonth: Decimal {
        let today = Calendar.current.dateComponents([.year, .month], from: now)
        return Self.total(inCurrency.filter {
            guard let date = $0.date else { return false }
            let c = DateOnly.calendar.dateComponents([.year, .month], from: date)
            return c.year == today.year && c.month == today.month && date <= now
        })
    }

    /// Marked paid in this calendar month, by the paid date, not the invoice date. Invoices paid
    /// before paid dates were recorded have none, so they never count. The web's `paidInMonth`.
    var paidThisMonth: (amount: Decimal, count: Int) {
        let calendar = Calendar.current
        let paid = inCurrency.filter {
            guard $0.status == .paid, let date = $0.paidDate else { return false }
            return calendar.isDate(date, equalTo: now, toGranularity: .month) && date <= now
        }
        return (Self.total(paid), paid.count)
    }

    struct MonthBar: Identifiable, Equatable {
        let id: Int // 0 = April … 11 = March
        let label: String
        /// Nil for a month still to come
        let value: Decimal?
        /// The same month a year earlier; nil with no earlier year to compare
        let previous: Decimal?
    }

    /// The selected tax year as twelve months, April first, with last year's months beside them.
    /// The web dashboard's `MonthBars` draws the same thing.
    var monthBars: [MonthBar] {
        func totals(_ year: Int) -> [Decimal] {
            var sums = [Decimal](repeating: 0, count: 12)
            for invoice in inCurrency {
                guard let date = invoice.date, DateOnly.fyStart(of: date) == year else { continue }
                sums[Self.fyMonthIndex(of: date)] += invoice.totalAmount.value
            }
            return sums
        }
        let current = totals(fy)
        let previousYear = inCurrency.contains { $0.date.map(DateOnly.fyStart(of:)) == fy - 1 }
        let previous = previousYear ? totals(fy - 1) : nil
        let lastElapsed = isCurrentFy ? Self.fyMonthIndex(of: now) : 11
        let symbols = DateFormatter()
        symbols.locale = Locale(identifier: "en_GB")
        return (0..<12).map { i in
            MonthBar(id: i, label: symbols.shortMonthSymbols[(i + 3) % 12],
                     value: i <= lastElapsed ? current[i] : nil,
                     previous: previous?[i])
        }
    }

    /// 0 = April … 11 = March. 1–5 April belongs to the year that's ending, so it lands in that
    /// year's last slot, as `getFyMonthIndex` on the web.
    static func fyMonthIndex(of date: Date) -> Int {
        let c = DateOnly.calendar.dateComponents([.year, .month], from: date)
        if c.month == 4 && DateOnly.fyStart(of: date) < c.year! { return 11 }
        return (c.month! + 8) % 12
    }
}
