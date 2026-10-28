import SwiftUI

enum AppTab: Hashable {
    case dashboard, invoices, assistant, account
}

enum AccountRoute: Hashable {
    case clients
}

/// Which tab is showing, shared so one screen can send you to another (the dashboard's "Add a client")
@MainActor
@Observable
final class AppNavigation {
    var tab: AppTab = .dashboard
    /// Set by a `caley://` link, and cleared by the screen that acts on it, which may not exist yet
    /// when the link arrives (a cold launch from a widget)
    var invoiceFilter: InvoiceStatus?
    var pendingInvoiceID: String?
    var pendingNewInvoice = false
    /// The compact Invoices stack, so a link can push an invoice onto it
    var invoicesPath: [String] = []
    /// What Account has pushed, so another screen can open Clients inside it
    var accountPath: [AccountRoute] = []
}

extension AppNavigation {
    /// What the `caley://` links the widgets use mean:
    /// - `caley://invoices` and `caley://invoices?filter=overdue`: the invoice list, optionally filtered
    /// - `caley://invoice/<id>`: one invoice
    /// - `caley://new`: the new invoice editor
    /// Anything else is ignored.
    func handle(_ url: URL) {
        guard url.scheme == "caley" else { return }
        switch url.host() {
        case "invoices":
            let filter = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first { $0.name == "filter" }?.value
            invoiceFilter = filter.flatMap(InvoiceStatus.init(rawValue:))
            invoicesPath = []
            tab = .invoices
        case "invoice":
            let id = url.pathComponents.dropFirst().first
            guard let id, !id.isEmpty else { return }
            tab = .invoices
            pendingInvoiceID = id
        case "new":
            tab = .dashboard
            pendingNewInvoice = true
        default:
            break
        }
    }
}
