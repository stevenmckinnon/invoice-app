import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case server(String)
    case network(Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized: "Your session has expired. Sign in again."
        case .server(let message): message
        case .network(let error):
            (error as? URLError)?.isOffline == true
                ? "You're offline. Check your connection and try again."
                : error.localizedDescription
        }
    }
}

/// Thin wrapper over the Next.js route handlers. Auth is a Bearer token from
/// better-auth's `bearer` plugin; the same routes serve the web app by cookie.
struct APIClient {
    var token: String?

    private let decoder = JSONDecoder()

    /// The app authenticates with its bearer token, so it keeps no cookies. better-auth also sets a
    /// session cookie on sign-in; replaying it on the next sign-in makes the server reject the
    /// request (a cookie with no Origin header looks like cross-site forgery).
    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        config.httpCookieAcceptPolicy = .never
        return URLSession(configuration: config)
    }()

    private func request(_ path: String, method: String = "GET", body: Encodable? = nil) throws -> URLRequest {
        var req = URLRequest(url: Config.baseURL.appending(path: path))
        req.httpMethod = method
        req.timeoutInterval = 30
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }
        return req
    }

    private func perform(_ req: URLRequest) async throws -> (Data, HTTPURLResponse) {
        do {
            let (data, response) = try await Self.session.data(for: req)
            guard let http = response as? HTTPURLResponse else { throw APIError.server("Bad response") }
            if http.statusCode == 401 { throw APIError.unauthorized }
            guard (200..<300).contains(http.statusCode) else {
                let message = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])
                    .flatMap { ($0["error"] ?? $0["message"]) as? String }
                throw APIError.server(message ?? "Request failed (\(http.statusCode))")
            }
            // Any answer at all means the connection works, so saved copies are no longer what's showing
            await Connectivity.shared.reachedServer()
            return (data, http)
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.network(error)
        }
    }

    private func send<T: Decodable>(_ path: String, method: String = "GET", body: Encodable? = nil) async throws -> T {
        let saves = method == "GET" && DiskCache.isCacheable(path)
        do {
            let (data, _) = try await perform(try request(path, method: method, body: body))
            let value: T
            do { value = try decoder.decode(T.self, from: data) }
            catch { throw APIError.server("Unexpected response: \(error)") }
            if saves { DiskCache.write(data, for: path) }
            return value
        } catch APIError.network(let underlying) where saves && (underlying as? URLError)?.isOffline == true {
            // No connection: the last good answer beats an error, and the screens say it is old
            guard let saved = DiskCache.read(path), let value = try? decoder.decode(T.self, from: saved.data) else {
                throw APIError.network(underlying)
            }
            await Connectivity.shared.servedFromCache(savedAt: saved.savedAt)
            return value
        }
    }

    // MARK: Auth

    /// Returns the bearer token from the `set-auth-token` response header.
    static func signIn(email: String, password: String) async throws -> String {
        let client = APIClient(token: nil)
        struct Body: Encodable { let email: String; let password: String }
        let req = try client.request("api/auth/sign-in/email", method: "POST", body: Body(email: email, password: password))
        let http: HTTPURLResponse
        do {
            (_, http) = try await client.perform(req)
        } catch APIError.unauthorized {
            // No session exists yet, so a 401 here means the credentials were refused
            throw APIError.server("Email or password is incorrect.")
        }
        guard let token = http.value(forHTTPHeaderField: "set-auth-token") else {
            throw APIError.server("The server did not return a session token.")
        }
        return token
    }

    func session() async throws -> Session? {
        let (data, _) = try await perform(try request("api/auth/get-session"))
        // `null` when the token is no longer valid
        return try? decoder.decode(Session.self, from: data)
    }

    func signOut() async {
        _ = try? await perform(try request("api/auth/sign-out", method: "POST", body: [String: String]()))
    }

    // MARK: Invoices

    func invoices() async throws -> [InvoiceListItem] { try await send("api/invoices") }

    func invoice(id: String) async throws -> InvoiceDetail { try await send("api/invoices/\(id)") }

    func setStatus(_ status: InvoiceStatus, id: String) async throws {
        struct Body: Encodable { let status: InvoiceStatus }
        struct Ignored: Decodable {}
        let _: Ignored = try await send("api/invoices/\(id)", method: "PATCH", body: Body(status: status))
    }

    func deleteInvoice(id: String) async throws {
        struct Ignored: Decodable {}
        let _: Ignored = try await send("api/invoices/\(id)", method: "DELETE")
    }

    // MARK: Editing

    func clients() async throws -> [Client] { try await send("api/clients") }

    func profile() async throws -> Profile { try await send("api/profile") }

    func nextInvoiceNumber() async throws -> String {
        struct Next: Decodable { let invoiceNumber: String }
        let next: Next = try await send("api/invoices/next-number")
        return next.invoiceNumber
    }

    func createClient(_ payload: ClientPayload) async throws {
        struct Ignored: Decodable {}
        let _: Ignored = try await send("api/clients", method: "POST", body: payload)
    }

    func updateClient(id: String, _ payload: ClientPayload) async throws {
        struct Ignored: Decodable {}
        let _: Ignored = try await send("api/clients/\(id)", method: "PUT", body: payload)
    }

    func deleteClient(id: String) async throws {
        struct Ignored: Decodable {}
        let _: Ignored = try await send("api/clients/\(id)", method: "DELETE")
    }

    func updateProfile(_ payload: ProfilePayload) async throws {
        struct Ignored: Decodable {}
        let _: Ignored = try await send("api/profile", method: "PUT", body: payload)
    }

    /// Prices days on the server, so the editor can't disagree with what a save stores
    func preview(_ request: PreviewRequest) async throws -> PreviewResult {
        try await send("api/invoices/preview", method: "POST", body: request)
    }

    func createInvoice(_ payload: InvoicePayload) async throws -> String {
        struct Created: Decodable { let id: String }
        let created: Created = try await send("api/invoices", method: "POST", body: payload)
        return created.id
    }

    func updateInvoice(id: String, _ payload: InvoicePayload) async throws {
        struct Ignored: Decodable {}
        let _: Ignored = try await send("api/invoices/\(id)", method: "PUT", body: payload)
    }

    // MARK: Assistant

    /// Sends the conversation and yields the response as it streams. The server keeps no history:
    /// every request carries the whole conversation, as the web chat does.
    func chat(_ messages: [ChatMessage]) -> AsyncThrowingStream<ChatChunk, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    var req = try request("api/chat", method: "POST",
                                          body: JSONValue.object(["messages": .array(messages.map(\.wire))]))
                    // A reply can pause while the model works through a tool call
                    req.timeoutInterval = 120
                    let (bytes, response) = try await Self.session.bytes(for: req)
                    guard let http = response as? HTTPURLResponse else { throw APIError.server("Bad response") }
                    if http.statusCode == 401 { throw APIError.unauthorized }
                    guard (200..<300).contains(http.statusCode) else {
                        var body = Data()
                        for try await byte in bytes { body.append(byte); if body.count > 4096 { break } }
                        // The rate limiter replies with a sentence meant to be shown as it is
                        let message = (try? JSONSerialization.jsonObject(with: body) as? [String: Any])
                            .flatMap { $0["message"] as? String }
                        throw APIError.server(message ?? "The assistant isn't available (\(http.statusCode)).")
                    }
                    for try await line in bytes.lines {
                        guard line.hasPrefix("data:") else { continue }
                        let payload = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
                        if payload == "[DONE]" { break }
                        guard let data = payload.data(using: .utf8),
                              let json = try? decoder.decode(JSONValue.self, from: data) else { continue }
                        continuation.yield(ChatChunk(json))
                    }
                    continuation.finish()
                } catch let error as APIError {
                    continuation.finish(throwing: error)
                } catch is CancellationError {
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: (error as? URLError)?.code == .cancelled ? CancellationError() : APIError.network(error))
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    /// Downloads the PDF to a temp file named after the invoice, so the share
    /// sheet offers a sensible filename.
    func pdf(id: String, invoiceNumber: String) async throws -> URL {
        let (data, _) = try await perform(try request("api/invoices/\(id)/pdf"))
        let dir = FileManager.default.temporaryDirectory.appending(path: "pdf-\(id)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let url = dir.appending(path: "\(invoiceNumber).pdf")
        try data.write(to: url, options: .atomic)
        return url
    }
}

private struct AnyEncodable: Encodable {
    let value: Encodable
    init(_ value: Encodable) { self.value = value }
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}
