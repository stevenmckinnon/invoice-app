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
    /// What Account has pushed, so another screen can open Clients inside it
    var accountPath: [AccountRoute] = []
}
