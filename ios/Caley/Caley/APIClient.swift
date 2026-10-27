import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case server(String)
    case network(Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized: "Your session has expired. Sign in again."
        case .server(let message): message
        case .network(let error): error.localizedDescription
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
            return (data, http)
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.network(error)
        }
    }

    private func send<T: Decodable>(_ path: String, method: String = "GET", body: Encodable? = nil) async throws -> T {
        let (data, _) = try await perform(try request(path, method: method, body: body))
        do { return try decoder.decode(T.self, from: data) }
        catch { throw APIError.server("Unexpected response: \(error)") }
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
