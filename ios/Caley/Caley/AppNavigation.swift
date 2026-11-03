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
    /// - `caley://dashboard`: the dashboard
    /// - `caley://invoice/<id>`: one invoice
    /// - `caley://new`: the new invoice editor
    /// - `caley://clients`: Clients, inside Account
    /// - `caley://assistant`: the Assistant
    /// A caley.app web link is read as the same thing first (`AppLink.route`). Anything else is ignored.
    func handle(_ url: URL) {
        guard let url = url.scheme == "caley" ? url : AppLink.route(from: url) else { return }
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
        case "dashboard":
            tab = .dashboard
        case "new":
            tab = .dashboard
            pendingNewInvoice = true
        case "clients":
            accountPath = [.clients]
            tab = .account
        case "assistant":
            tab = .assistant
        default:
            break
        }
    }
}

/// caley.app links that open in the app instead of Safari (universal links): an invoice from the
/// Claude connector, say. iOS only hands over the paths in the site's association file
/// (`APP_LINK_COMPONENTS` in `src/lib/app-association.ts`); keep the two in step.
enum AppLink {
    static let hosts: Set<String> = ["caley.app", "www.caley.app"]

    /// The `caley://` link a web URL means, or nil for a page the app doesn't have
    static func route(from url: URL) -> URL? {
        guard url.scheme == "https", let host = url.host(), hosts.contains(host) else { return nil }
        let parts = url.pathComponents.filter { $0 != "/" }
        let query = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        switch parts.first {
        case "dashboard" where parts.count == 1:
            return URL(string: "caley://dashboard")
        case "clients" where parts.count == 1:
            return URL(string: "caley://clients")
        case "chat" where parts.count == 1:
            return URL(string: "caley://assistant")
        case "invoices":
            guard parts.count > 1 else { return URL(string: "caley://invoices") }
            if parts[1] == "new" {
                // Starting a correction stays on the web; the app corrects from the invoice
                return query.contains { $0.name == "corrects" } ? nil : URL(string: "caley://new")
            }
            // `/invoices/<id>/edit` opens the invoice: its Edit button is there for a draft
            return URL(string: "caley://invoice/\(parts[1])")
        default:
            return nil
        }
    }
}
