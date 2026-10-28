import SwiftUI

@MainActor
@Observable
final class AuthStore {
    enum State { case launching, signedOut, signedIn(SessionUser) }

    private(set) var state: State = .launching
    private(set) var token: String?

    var api: APIClient { APIClient(token: token) }

    /// Still checking the saved login: a link that arrives now should wait for the answer
    var isLaunching: Bool {
        if case .launching = state { return true }
        return false
    }

    var isSignedIn: Bool {
        if case .signedIn = state { return true }
        return false
    }

    func restore() async {
        guard let stored = Keychain.read() else { state = .signedOut; return }
        token = stored
        do {
            if let session = try await api.session() {
                state = .signedIn(session.user)
            } else {
                clear()
            }
        } catch APIError.unauthorized {
            clear()
        } catch {
            // Offline at launch: keep the token and let the screens show their own error
            state = .signedIn(SessionUser(name: "", email: ""))
        }
    }

    func signIn(email: String, password: String) async throws {
        let newToken = try await APIClient.signIn(email: email, password: password)
        Keychain.write(newToken)
        token = newToken
        let session = try await api.session()
        state = .signedIn(session?.user ?? SessionUser(name: "", email: email))
    }

    func signOut() async {
        await api.signOut()
        clear()
    }

    /// Called when any request comes back 401.
    func sessionExpired() { clear() }

    private func clear() {
        Keychain.delete()
        token = nil
        state = .signedOut
    }
}
