import SwiftUI

struct AccountView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var store
    @Environment(AppNavigation.self) private var navigation
    @Environment(AppLock.self) private var lock
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        @Bindable var navigation = navigation
        NavigationStack(path: $navigation.accountPath) {
            List {
                if sizeClass == .regular {
                    // The large title belongs to the navigation bar, at the screen's edge: on a wide
                    // screen it is drawn here instead, in line with the column
                    Text("Account")
                        .font(.largeTitle.bold())
                        .accessibilityAddTraits(.isHeader)
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 0, trailing: 0))
                }
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
                    Toggle("Require \(lock.methodName)", isOn: Binding(
                        get: { lock.enabled },
                        set: { on in
                            if on { Task { _ = await lock.enable() } } else { lock.enabled = false }
                        }))
                        .disabled(!lock.available)
                } footer: {
                    Text(lock.available
                         ? "Locks Caley when you open it, and when you've been away for 30 seconds or more."
                         : "Set a passcode on this iPhone to use this.")
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
            .readableScroll()
            .background(Color.canvas)
            .navigationTitle(sizeClass == .regular ? "" : "Account")
            .toolbarTitleDisplayMode(sizeClass == .regular ? .inline : .large)
            .navigationDestination(for: AccountRoute.self) { route in
                switch route {
                case .clients: ClientsView()
                }
            }
        }
    }
}
