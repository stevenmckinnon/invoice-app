import SwiftUI

struct AccountView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var store
    @Environment(AppNavigation.self) private var navigation
    @Environment(AppLock.self) private var lock
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.openURL) private var openURL
    @State private var remindersOn = Reminders.isEnabled
    @State private var remindersRefused = false

    /// "1.0 (12)": the build is what tells two TestFlight installs of the same version apart
    private static var versionText: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(version) (\(build))"
    }

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
                    Toggle("Chase-up reminders", isOn: Binding(
                        get: { remindersOn },
                        set: { on in
                            Task {
                                if on {
                                    remindersOn = await Reminders.enable()
                                    remindersRefused = !remindersOn
                                } else {
                                    remindersOn = false
                                    await Reminders.disable()
                                }
                            }
                        }))
                } footer: {
                    Text("A reminder 30 days after an invoice's date while it's still unpaid, then every Monday. Tap one to open the invoice.")
                }
                Section {
                    LabeledContent("Version", value: Self.versionText)
                } footer: {
                    Text("The build number tells you which TestFlight build is on this device.")
                }
                #if DEBUG
                // Which server a debug build is talking to (the simulator defaults to localhost); a release
                // build only ever talks to caley.app, so there is nothing to show
                Section {
                    LabeledContent("Server", value: Config.baseURL.host() ?? Config.baseURL.absoluteString)
                }
                #endif
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
            .alert("Notifications are off", isPresented: $remindersRefused) {
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                }
                Button("Not now", role: .cancel) {}
            } message: {
                Text("Allow notifications for Caley in Settings to get chase-up reminders.")
            }
            .navigationDestination(for: AccountRoute.self) { route in
                switch route {
                case .clients: ClientsView()
                }
            }
        }
    }
}
