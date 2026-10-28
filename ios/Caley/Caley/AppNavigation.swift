import SwiftUI

enum AppTab: Hashable {
    case dashboard, invoices, assistant, clients, account
}

/// Which tab is showing, shared so one screen can send you to another (the dashboard's "Add a client")
@MainActor
@Observable
final class AppNavigation {
    var tab: AppTab = .dashboard
}
