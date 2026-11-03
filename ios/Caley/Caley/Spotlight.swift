import CoreSpotlight
import UniformTypeIdentifiers

/// One thing to put in Spotlight. Pure, so what gets indexed (and what's held back) is tested.
struct SpotlightEntry: Equatable {
    let id: String
    let title: String
    let detail: String
    let keywords: [String]
    /// Where tapping the result goes
    let link: String
}

/// Invoices and clients in the system's search, so "INV-2605" or "Triplemania" from the home screen
/// opens the invoice. The index lives on this device and is rebuilt from each live list load, the
/// way `Reminders` and the widgets are; it's wiped on sign-out.
enum SpotlightPlanner {
    static let invoicePrefix = "invoice:"
    static let clientPrefix = "client:"

    /// With the Face ID lock on, results carry no amounts, as the widgets and reminders don't
    static func invoices(_ invoices: [InvoiceListItem], hideAmounts: Bool) -> [SpotlightEntry] {
        invoices.map { invoice in
            var detail = [invoice.clientName, invoice.status.label].compactMap { $0 }
            if !hideAmounts { detail.insert(invoice.totalAmount.money(invoice.currencyCode), at: 0) }
            if let date = invoice.date { detail.append(DateOnly.format(date)) }
            return SpotlightEntry(
                id: invoicePrefix + invoice.id,
                title: "\(invoice.invoiceNumber) · \(invoice.showName)",
                detail: detail.joined(separator: " · "),
                keywords: [invoice.invoiceNumber, invoice.showName, invoice.clientName].compactMap { $0 },
                link: "caley://invoice/\(invoice.id)"
            )
        }
    }

    static func clients(_ clients: [Client]) -> [SpotlightEntry] {
        clients.map { client in
            SpotlightEntry(
                id: clientPrefix + client.id,
                title: client.name,
                detail: ["Client", client.city].compactMap { $0 }.joined(separator: " · "),
                keywords: [client.name, "client"],
                link: "caley://clients"
            )
        }
    }

    /// The link for a tapped result's identifier, or nil for one this app didn't make
    static func link(forIdentifier id: String) -> URL? {
        if id.hasPrefix(invoicePrefix) { return URL(string: "caley://invoice/\(id.dropFirst(invoicePrefix.count))") }
        if id.hasPrefix(clientPrefix) { return URL(string: "caley://clients") }
        return nil
    }
}

enum Spotlight {
    private static let invoiceDomain = "invoices"
    private static let clientDomain = "clients"
    @MainActor private static var latestInvoices: [InvoiceListItem] = []

    @MainActor
    static func sync(_ invoices: [InvoiceListItem]) {
        latestInvoices = invoices
        replace(domain: invoiceDomain, with: SpotlightPlanner.invoices(invoices, hideAmounts: SharedStore.hideAmounts))
    }

    static func sync(_ clients: [Client]) {
        replace(domain: clientDomain, with: SpotlightPlanner.clients(clients))
    }

    /// The Face ID lock changed, so what the results may say changed with it
    @MainActor
    static func refresh() { sync(latestInvoices) }

    /// Signing out: the next person must not find this one's invoices
    @MainActor
    static func clear() {
        latestInvoices = []
        CSSearchableIndex.default().deleteAllSearchableItems { _ in }
    }

    /// Remove the domain's items and add the new ones, so a deleted invoice doesn't linger
    private static func replace(domain: String, with entries: [SpotlightEntry]) {
        let items = entries.map { entry in
            let attributes = CSSearchableItemAttributeSet(contentType: .content)
            attributes.title = entry.title
            attributes.contentDescription = entry.detail
            attributes.keywords = entry.keywords
            return CSSearchableItem(uniqueIdentifier: entry.id, domainIdentifier: domain, attributeSet: attributes)
        }
        let index = CSSearchableIndex.default()
        index.deleteSearchableItems(withDomainIdentifiers: [domain]) { _ in
            guard !items.isEmpty else { return }
            index.indexSearchableItems(items) { error in
                #if DEBUG
                if let error { print("Spotlight: indexing failed: \(error)") }
                #endif
            }
        }
    }
}
