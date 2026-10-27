import SwiftUI

struct AccountView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var store

    var body: some View {
        NavigationStack {
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
        }
    }
}
