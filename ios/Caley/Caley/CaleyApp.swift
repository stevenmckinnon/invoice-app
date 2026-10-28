import SwiftUI

@main
struct CaleyApp: App {
    @State private var auth = AuthStore()
    @State private var store = InvoiceStore()
    @State private var clients = ClientStore()
    @State private var chat = ChatStore()
    @State private var lock = AppLock()
    @State private var navigation = AppNavigation()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .environment(store)
                .environment(clients)
                .environment(chat)
                .environment(lock)
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
    @Environment(ChatStore.self) private var chat
    @Environment(AppNavigation.self) private var navigation
    @Environment(AppLock.self) private var lock
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        content
            .animation(.easeOut(duration: 0.25), value: phase)
            .overlay {
                // Locked, or just not in front (the app switcher snapshots whatever is showing)
                if lock.enabled, auth.isSignedIn, lock.locked || scenePhase != .active {
                    LockView().transition(.opacity)
                }
            }
            .animation(.easeOut(duration: 0.2), value: lock.locked)
            .onChange(of: scenePhase) { _, phase in lock.scenePhaseChanged(phase) }
            // Whatever the reason for signing out (button, expired session), drop the cached invoices
            .onChange(of: auth.isSignedIn) { _, signedIn in
                if !signedIn {
                    store.reset()
                    clients.reset()
                    chat.reset()
                    DiskCache.clear()
                    navigation.tab = .dashboard
                    lock.signedOut()
                    navigation.accountPath = []
                }
            }
    }

    private var phase: Int {
        switch auth.state {
        case .launching: 0
        case .signedOut: 1
        case .signedIn: 2
        }
    }

    @ViewBuilder
    private var content: some View {
        switch auth.state {
        case .launching:
            LaunchView().transition(.opacity)
        case .signedOut:
            SignInView().transition(.opacity)
        case .signedIn:
            MainTabView().transition(.opacity)
        }
    }
}

/// Matches the system launch screen (same colour, same mark, same size and place) so starting the
/// app reads as one continuous screen while the saved login is checked, then fades into the app.
struct LaunchView: View {
    var body: some View {
        Image("LaunchMark")
            .resizable()
            .scaledToFit()
            .frame(width: 96, height: 96)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color("LaunchBackground").ignoresSafeArea())
            .accessibilityLabel("Caley")
            .accessibilityAddTraits(.updatesFrequently)
    }
}

struct MainTabView: View {
    @Environment(AppNavigation.self) private var navigation
    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var invoices
    @Environment(ClientStore.self) private var clients
    private var connectivity: Connectivity { .shared }

    var body: some View {
        @Bindable var navigation = navigation
        TabView(selection: $navigation.tab) {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "chart.bar") }
                .tag(AppTab.dashboard)
            InvoiceListView()
                .tabItem { Label("Invoices", systemImage: "doc.text") }
                .tag(AppTab.invoices)
            ChatView()
                .tabItem { Label("Assistant", systemImage: "sparkles") }
                .tag(AppTab.assistant)
            AccountView()
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
                .tag(AppTab.account)
        }
        .offlineBanner(savedAt: connectivity.servedFromCacheAt, retry: refresh)
        // The moment the network is back, replace what's saved with what's live
        .onChange(of: connectivity.pathOnline) { _, online in
            if online, connectivity.showingSavedCopy { refresh() }
        }
    }
}

extension MainTabView {
    fileprivate func refresh() {
        Task {
            await invoices.load(auth: auth)
            await clients.load(auth: auth)
        }
    }
}

/// Shown while the screens are on saved copies. Tapping it tries again.
private struct OfflineLabel: View {
    let savedAt: Date
    let retry: () -> Void

    var body: some View {
        Button(action: retry) {
            HStack(spacing: 8) {
                Image(systemName: "wifi.slash").accessibilityHidden(true)
                Text("Offline. Showing data saved ") + Text(savedAt, format: .relative(presentation: .named))
            }
            .font(.footnote.weight(.medium))
            .multilineTextAlignment(.center)
            .minimumScaleFactor(0.8)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(PressableStyle())
        .accessibilityHint("Tries to reconnect")
    }
}

private extension View {
    /// Above the tab bar: the system's own slot for it on iOS 26.1, an inset capsule before that
    @ViewBuilder
    func offlineBanner(savedAt: Date?, retry: @escaping () -> Void) -> some View {
        if #available(iOS 26.1, *) {
            tabViewBottomAccessory(isEnabled: savedAt != nil) {
                if let savedAt { OfflineLabel(savedAt: savedAt, retry: retry) }
            }
        } else {
            safeAreaInset(edge: .bottom, spacing: 0) {
                if let savedAt {
                    OfflineLabel(savedAt: savedAt, retry: retry)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(.regularMaterial, in: Capsule())
                        .padding(.bottom, 6)
                }
            }
        }
    }
}
