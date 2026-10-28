import Foundation

/// Fetches the invoice list with the app's saved login, for the things that run outside the app's own
/// screens: the home screen widgets and the Siri and Shortcuts intents. It keeps no cookies, like the app.
enum InvoiceFetcher {
    enum Outcome {
        case success([InvoiceListItem])
        /// The server refused the login: the session has ended
        case signedOut
        /// No answer worth showing (offline, a server error, an unreadable reply)
        case failed
    }

    static func fetch(token: String) async -> Outcome {
        var request = URLRequest(url: (SharedStore.serverURL ?? Config.production).appending(path: "api/invoices"))
        request.timeoutInterval = 15
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let config = URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies = false
        config.httpCookieAcceptPolicy = .never
        do {
            let (data, response) = try await URLSession(configuration: config).data(for: request)
            guard let http = response as? HTTPURLResponse else { return .failed }
            if http.statusCode == 401 { return .signedOut }
            guard (200..<300).contains(http.statusCode) else { return .failed }
            return .success(try JSONDecoder().decode([InvoiceListItem].self, from: data))
        } catch {
            return .failed
        }
    }
}
