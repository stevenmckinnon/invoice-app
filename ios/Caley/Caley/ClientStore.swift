import SwiftUI

@MainActor
@Observable
final class ClientStore {
    private(set) var clients: [Client] = []
    private(set) var currency = "GBP"
    private(set) var loaded = false
    var error: String?

    func reset() {
        clients = []
        loaded = false
        error = nil
    }

    func load(auth: AuthStore) async {
        do {
            async let fetched = auth.api.clients()
            async let profile = auth.api.profile()
            clients = try await fetched.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            if let p = try? await profile { currency = p.currency ?? currency }
            error = nil
            loaded = true
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func delete(_ client: Client, auth: AuthStore) async {
        do {
            try await auth.api.deleteClient(id: client.id)
            clients.removeAll { $0.id == client.id }
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
