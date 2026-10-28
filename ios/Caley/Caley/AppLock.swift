import SwiftUI
import LocalAuthentication

/// Optional Face ID (or Touch ID, or the device passcode) lock. Invoices carry bank details, so
/// the app can ask for the phone's own authentication on launch and after being away for a while.
@MainActor
@Observable
final class AppLock {
    private static let key = "appLockEnabled"
    /// Switching apps for a moment shouldn't cost a Face ID scan
    static let grace: TimeInterval = 30

    var enabled: Bool {
        didSet { UserDefaults.standard.set(enabled, forKey: Self.key) }
    }
    /// Starts locked when the lock is on, so a cold launch asks before showing anything
    private(set) var locked: Bool
    private var leftAt: Date?
    private var asking = false
    /// One automatic prompt per lock, so cancelling it leaves the button rather than asking again
    private var autoPrompted = false

    init() {
        let on = UserDefaults.standard.bool(forKey: Self.key)
        enabled = on
        locked = on
    }

    /// "Face ID", "Touch ID" or "Passcode", whichever this phone has
    var methodName: String {
        let context = LAContext()
        var error: NSError?
        _ = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
        switch context.biometryType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        default: return "Passcode"
        }
    }

    /// False when the phone has no passcode: there is nothing to check against
    var available: Bool { LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: nil) }

    func scenePhaseChanged(_ phase: ScenePhase) {
        switch phase {
        case .background:
            if leftAt == nil { leftAt = .now }
        case .active:
            if enabled, let leftAt, Date.now.timeIntervalSince(leftAt) >= Self.grace {
                locked = true
                autoPrompted = false
            }
            leftAt = nil
        default:
            break
        }
    }

    /// Signing out ends the session, so the next sign-in (with a password) starts unlocked
    func signedOut() { locked = false }

    /// Called when the lock screen is showing in front of you: asks straight away, once
    func promptIfNeeded() async {
        guard locked, !autoPrompted else { return }
        autoPrompted = true
        await unlock()
    }

    /// Asks the phone to authenticate; unlocks on success. A cancel leaves it locked for the button.
    func unlock() async {
        guard locked, !asking else { return }
        asking = true
        defer { asking = false }
        if await authenticate() {
            locked = false
            autoPrompted = false
        }
    }

    /// Turning the lock on takes one successful check, so you can't lock yourself out of a phone
    /// that can't authenticate
    func enable() async -> Bool {
        guard available, await authenticate() else { return false }
        enabled = true
        return true
    }

    private func authenticate() async -> Bool {
        let context = LAContext()
        do {
            return try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock your invoices")
        } catch {
            return false
        }
    }
}

/// Covers the app while it is locked, and while it is in the app switcher, so the snapshot iOS
/// takes shows no invoices.
struct LockView: View {
    @Environment(AppLock.self) private var lock
    @Environment(\.scenePhase) private var scenePhase

    /// Face ID can only be asked for while the app is in front
    private var shouldPrompt: Bool { lock.locked && scenePhase == .active }

    var body: some View {
        VStack(spacing: 24) {
            Image("LaunchMark")
                .resizable()
                .scaledToFit()
                .frame(width: 96, height: 96)
                .accessibilityHidden(true)
            if lock.locked {
                VStack(spacing: 6) {
                    Text("Caley is locked").font(.headline)
                    Button("Unlock with \(lock.methodName)") { Task { await lock.unlock() } }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .padding(.top, 8)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color("LaunchBackground").ignoresSafeArea())
        .task(id: shouldPrompt) { if shouldPrompt { await lock.promptIfNeeded() } }
    }
}
