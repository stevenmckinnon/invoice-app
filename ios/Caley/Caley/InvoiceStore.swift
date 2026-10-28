import SwiftUI

@MainActor
@Observable
final class InvoiceStore {
    private(set) var invoices: [InvoiceListItem] = []
    private(set) var loaded = false
    var error: String?
    private var prefetching: Task<Void, Never>?

    /// Forget everything: on sign-out the next person to sign in must not see this one's invoices
    func reset() {
        WidgetSync.clear()
        prefetching?.cancel()
        invoices = []
        loaded = false
        error = nil
    }

    func load(auth: AuthStore) async {
        do {
            invoices = try await auth.api.invoices()
            error = nil
            loaded = true
            // Only a live answer goes to the widgets: a saved copy would just show them old numbers again
            if !Connectivity.shared.showingSavedCopy { WidgetSync.publish(invoices) }
            // Only from a live answer: a saved list would just re-fetch what is already saved
            if !Connectivity.shared.showingSavedCopy { prefetchRecent(auth: auth) }
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// Opens the latest few invoices in the background, so they are saved for a place with no signal
    private func prefetchRecent(auth: AuthStore) {
        prefetching?.cancel()
        let ids = invoices.sorted { ($0.date ?? .distantPast) > ($1.date ?? .distantPast) }.prefix(8).map(\.id)
        let api = auth.api
        prefetching = Task(priority: .utility) {
            for id in ids {
                if Task.isCancelled { return }
                _ = try? await api.invoice(id: id)
            }
        }
    }

    /// Deletes on the server first, then drops the row: unlike a status change there is nothing to roll back to
    func delete(id: String, auth: AuthStore) async -> Bool {
        do {
            try await auth.api.deleteInvoice(id: id)
            invoices.removeAll { $0.id == id }
            WidgetSync.publish(invoices)
            Haptics.success()
            return true
        } catch {
            Haptics.failure()
            if case APIError.unauthorized = error { auth.sessionExpired() }
            self.error = error.localizedDescription
            return false
        }
    }

    /// Optimistic: the list and dashboard move at once, and roll back if the server refuses.
    func setStatus(_ status: InvoiceStatus, for id: String, auth: AuthStore) async -> Bool {
        guard let index = invoices.firstIndex(where: { $0.id == id }) else { return false }
        let previous = invoices[index].status
        invoices[index].status = status
        do {
            try await auth.api.setStatus(status, id: id)
            WidgetSync.publish(invoices)
            Haptics.success()
            return true
        } catch {
            invoices[index].status = previous
            Haptics.failure()
            if case APIError.unauthorized = error { auth.sessionExpired() }
            self.error = error.localizedDescription
            return false
        }
    }
}
