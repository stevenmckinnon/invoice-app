import SwiftUI

struct AccountView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var store
    @Environment(AppNavigation.self) private var navigation

    var body: some View {
        @Bindable var navigation = navigation
        NavigationStack(path: $navigation.accountPath) {
            List {
                if case .signedIn(let user) = auth.state, !user.email.isEmpty {
                    Section {
                        VStack(alignment: .leading, spacing: 2) {
                            if !user.name.isEmpty { Text(user.name).font(.headline) }
                            Text(user.email).foregroundStyle(.secondary)
                        }
                    }
                }
                Section {
                    NavigationLink("Your details") { ProfileEditorView() }
                    NavigationLink(value: AccountRoute.clients) { Text("Clients") }
                }
                Section {
                    LabeledContent("Server", value: Config.baseURL.host() ?? Config.baseURL.absoluteString)
                }
                Section {
                    Button("Sign out", role: .destructive) {
                        Task { await auth.signOut() }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.canvas)
            .navigationTitle("Account")
            .navigationDestination(for: AccountRoute.self) { route in
                switch route {
                case .clients: ClientsView()
                }
            }
        }
    }
}
