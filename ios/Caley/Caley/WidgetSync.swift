import WidgetKit

/// Keeps the home screen widgets in step with the app. Invoice data goes out as a snapshot in the
/// app group; the widget also fetches on its own, but this makes a change you just made show at once.
enum WidgetSync {
    static func publish(_ invoices: [InvoiceListItem]) {
        SharedStore.serverURL = Config.baseURL
        SharedStore.snapshot = WidgetSnapshot(invoices: invoices)
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// Signing out: widgets go back to "open Caley to sign in"
    static func clear() {
        SharedStore.clear()
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// The Face ID lock decides whether widgets may show amounts
    static func lockChanged(enabled: Bool) {
        SharedStore.hideAmounts = enabled
        WidgetCenter.shared.reloadAllTimelines()
    }
}
