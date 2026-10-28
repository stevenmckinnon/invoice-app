import SwiftUI

@MainActor
@Observable
final class InvoiceStore {
    private(set) var invoices: [InvoiceListItem] = []
    private(set) var loaded = false
    var error: String?

    /// Forget everything: on sign-out the next person to sign in must not see this one's invoices
    func reset() {
        invoices = []
        loaded = false
        error = nil
    }

    func load(auth: AuthStore) async {
        do {
            invoices = try await auth.api.invoices()
            error = nil
            loaded = true
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// Deletes on the server first, then drops the row: unlike a status change there is nothing to roll back to
    func delete(id: String, auth: AuthStore) async -> Bool {
        do {
            try await auth.api.deleteInvoice(id: id)
            invoices.removeAll { $0.id == id }
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
