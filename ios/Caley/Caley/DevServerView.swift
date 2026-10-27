#if DEBUG
import SwiftUI

/// Debug builds only: say where the dev server is and check the phone can reach it. The error
/// shown is the real one, since "can't connect" has several causes that look alike.
struct DevServerView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var address = Config.baseURL.absoluteString
    @State private var result: Result?

    private struct Result {
        let ok: Bool
        let message: String
    }

    private var url: URL? { Config.normalised(address) }

    /// A typo like 192.1681.97 would otherwise surface later as a baffling security error
    private var addressProblem: String? {
        guard let url, let host = url.host() else { return address.isEmpty ? nil : "That isn't a web address." }
        // HTTPS is fine anywhere (production); only plain HTTP is limited to local addresses
        return url.scheme == "https" || Config.isLocalHost(host)
            ? nil
            : "\(host) isn't an IP address or a .local name, so iOS won't allow plain HTTP to it. An IP looks like 192.168.1.97 (four numbers, three dots)."
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("192.168.1.97:3000", text: $address)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .font(.body.monospaced())
                } header: {
                    Text("Dev server")
                } footer: {
                    Text("The Mac running pnpm dev. If the .local name won't connect, use the Mac's IP address and port 3000.")
                }

                Section {
                    Button("Test connection", action: test).disabled(url == nil || addressProblem != nil)
                    if let addressProblem {
                        Label(addressProblem, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.orange)
                            .font(.footnote)
                    } else if let result {
                        Label(result.message, systemImage: result.ok ? "checkmark.circle.fill" : "xmark.octagon.fill")
                            .foregroundStyle(result.ok ? .green : .red)
                            .font(.footnote)
                    }
                }

                Section {
                    Button("Save") {
                        if let url { UserDefaults.standard.set(url.absoluteString, forKey: Config.debugServerKey) }
                        dismiss()
                    }
                    .disabled(url == nil || addressProblem != nil)
                    Button("Use the default", role: .destructive) {
                        UserDefaults.standard.removeObject(forKey: Config.debugServerKey)
                        address = Config.defaultDebugURL.absoluteString
                        result = nil
                    }
                }
            }
            .navigationTitle("Server")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
        }
    }

    private func test() {
        guard let url else { return }
        result = Result(ok: true, message: "Testing…")
        Task {
            var request = URLRequest(url: url.appending(path: "api/auth/get-session"))
            request.timeoutInterval = 8
            do {
                let (_, response) = try await URLSession(configuration: .ephemeral).data(for: request)
                let code = (response as? HTTPURLResponse)?.statusCode ?? 0
                result = Result(ok: (200..<300).contains(code), message: "Reached \(url.host() ?? "the server") (HTTP \(code)).")
            } catch {
                let nsError = error as NSError
                var message = "\(nsError.localizedDescription) (code \(nsError.code))"
                switch nsError.code {
                case NSURLErrorNotConnectedToInternet, NSURLErrorCannotConnectToHost, NSURLErrorTimedOut, NSURLErrorNetworkConnectionLost:
                    message += ". Check Settings → Caley → Local Network is on, and that the phone and the Mac are on the same Wi-Fi."
                case NSURLErrorCannotFindHost, NSURLErrorDNSLookupFailed:
                    message += ". The phone can't resolve that name. Try the Mac's IP address."
                case NSURLErrorAppTransportSecurityRequiresSecureConnection:
                    message += ". Plain HTTP only works for IP addresses and .local names, so check the address for typos."
                default: break
                }
                result = Result(ok: false, message: message)
            }
        }
    }
}
#endif
