import AppIntents

/// Siri, Shortcuts, Spotlight and the Action button. These run in the app's process and use the same
/// login and numbers as the widgets.

/// Hands a `caley://` link to the running app. An intent can run before the app's screens exist (a cold
/// launch from Siri or the Action button), so a link that arrives early waits here until they attach.
@MainActor
final class LinkBridge {
    static let shared = LinkBridge()
    private var handler: ((URL) -> Void)?
    private var pending: URL?

    func deliver(_ url: URL) {
        if let handler { handler(url) } else { pending = url }
    }

    func attach(_ handler: @escaping (URL) -> Void) {
        self.handler = handler
        if let pending {
            self.pending = nil
            handler(pending)
        }
    }
}

struct OwedIntent: AppIntent {
    static let title: LocalizedStringResource = "What am I owed?"
    static let description = IntentDescription("Says how much is outstanding this tax year, and how much of it is overdue.")
    static let openAppWhenRun = false
    /// Money read aloud from a locked phone is money anyone can hear
    static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        let hide = SharedStore.hideAmounts
        guard let token = Keychain.read() else {
            return .result(value: "Not signed in", dialog: "Open Caley and sign in first.")
        }
        let snapshot: WidgetSnapshot
        var note = ""
        switch await InvoiceFetcher.fetch(token: token) {
        case .success(let invoices):
            snapshot = WidgetSnapshot(invoices: invoices)
            SharedStore.snapshot = snapshot
        case .signedOut:
            return .result(value: "Not signed in", dialog: "Your Caley session has ended. Open Caley to sign in.")
        case .failed:
            guard let saved = SharedStore.snapshot else {
                return .result(value: "Unavailable", dialog: "I couldn't reach Caley. Try again when you have a connection.")
            }
            snapshot = saved
            note = " That's from the last time Caley updated."
        }
        let sentence = snapshot.owedSentence(hideAmounts: hide) + note
        return .result(value: sentence, dialog: IntentDialog(stringLiteral: sentence))
    }
}

struct NewInvoiceIntent: AppIntent {
    static let title: LocalizedStringResource = "New invoice"
    static let description = IntentDescription("Opens Caley on a new invoice.")
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        LinkBridge.shared.deliver(URL(string: "caley://new")!)
        return .result()
    }
}

struct OverdueInvoicesIntent: AppIntent {
    static let title: LocalizedStringResource = "Show overdue invoices"
    static let description = IntentDescription("Opens Caley on the invoices that are overdue.")
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        LinkBridge.shared.deliver(URL(string: "caley://invoices?filter=overdue")!)
        return .result()
    }
}

/// What appears in the Shortcuts app and Spotlight, and what Siri understands without any setup. The
/// Action button can be set to any of these in Settings.
struct CaleyShortcuts: AppShortcutsProvider {
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OwedIntent(),
            phrases: [
                "What am I owed in \(.applicationName)",
                "How much am I owed in \(.applicationName)",
                "What's outstanding in \(.applicationName)",
            ],
            shortTitle: "What am I owed?",
            systemImageName: "sterlingsign.circle")
        AppShortcut(
            intent: NewInvoiceIntent(),
            phrases: [
                "New invoice in \(.applicationName)",
                "Start an invoice in \(.applicationName)",
                "Create an invoice in \(.applicationName)",
            ],
            shortTitle: "New invoice",
            systemImageName: "plus.circle")
        AppShortcut(
            intent: OverdueInvoicesIntent(),
            phrases: [
                "Show overdue invoices in \(.applicationName)",
                "What's overdue in \(.applicationName)",
            ],
            shortTitle: "Overdue invoices",
            systemImageName: "exclamationmark.circle")
    }
}
