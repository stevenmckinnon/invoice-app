import SwiftUI

@main
struct CaleyApp: App {
    @State private var auth = AuthStore()
    @State private var store = InvoiceStore()
    @State private var clients = ClientStore()
    @State private var navigation = AppNavigation()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .environment(store)
                .environment(clients)
                .environment(navigation)
                .tint(.brand)
                .task { await auth.restore() }
        }
    }
}

struct RootView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var store
    @Environment(ClientStore.self) private var clients

    var body: some View {
        content
            // Whatever the reason for signing out (button, expired session), drop the cached invoices
            .onChange(of: auth.isSignedIn) { _, signedIn in
                if !signedIn {
                    store.reset()
                    clients.reset()
                }
            }
    }

    @ViewBuilder
    private var content: some View {
        switch auth.state {
        case .launching:
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.canvas)
        case .signedOut:
            SignInView()
        case .signedIn:
            MainTabView()
        }
    }
}

struct MainTabView: View {
    @Environment(AppNavigation.self) private var navigation

    var body: some View {
        @Bindable var navigation = navigation
        TabView(selection: $navigation.tab) {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "chart.bar") }
                .tag(AppTab.dashboard)
            InvoiceListView()
                .tabItem { Label("Invoices", systemImage: "doc.text") }
                .tag(AppTab.invoices)
            ClientsView()
                .tabItem { Label("Clients", systemImage: "person.2") }
                .tag(AppTab.clients)
            AccountView()
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
                .tag(AppTab.account)
        }
    }
}
