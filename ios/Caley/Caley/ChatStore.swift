import SwiftUI

/// The conversation with the assistant. The chat on screen is kept on the device so it survives a
/// relaunch (the web app does the same in localStorage), and each one is saved to your account when a
/// reply finishes, so a chat started here can be reopened on the web and the other way round. All of it
/// is wiped on sign-out.
@MainActor
@Observable
final class ChatStore {
    private(set) var messages: [ChatMessage] = []
    private(set) var sending = false
    var error: String?

    /// The chat on screen; a new one has an id before it is first saved
    private(set) var conversationId = UUID().uuidString
    /// Past chats, newest first: read when the list opens
    private(set) var conversations: [ChatConversationSummary] = []
    private(set) var loadingHistory = false
    private(set) var historyError: String?

    private var streamTask: Task<Void, Never>?

    private static let file: URL = URL.applicationSupportDirectory.appending(path: "chat.json")

    /// What the device keeps of the open chat
    private struct Saved: Codable {
        let id: String
        let messages: [ChatMessage]
    }

    /// Reads the saved file. Earlier versions stored just the messages, so that shape still reads
    /// (and is given an id). A reply cut off by quitting the app has nothing to resume.
    nonisolated static func decodeSaved(_ data: Data) -> (id: String, messages: [ChatMessage])? {
        let decoder = JSONDecoder()
        if let saved = try? decoder.decode(Saved.self, from: data) {
            return (saved.id, saved.messages.filter(\.hasContent))
        }
        if let legacy = try? decoder.decode([ChatMessage].self, from: data) {
            return (UUID().uuidString, legacy.filter(\.hasContent))
        }
        return nil
    }

    init() {
        if let data = try? Data(contentsOf: Self.file), let saved = Self.decodeSaved(data) {
            conversationId = saved.id
            messages = saved.messages
        }
    }

    /// Forget everything: on sign-out the next person must not read this one's chats
    func reset() {
        stop()
        messages = []
        conversationId = UUID().uuidString
        conversations = []
        historyError = nil
        error = nil
        try? FileManager.default.removeItem(at: Self.file)
    }

    /// Start again with an empty chat. The one you leave is already in your history.
    func newChat() {
        guard !sending else { return }
        messages = []
        conversationId = UUID().uuidString
        error = nil
        try? FileManager.default.removeItem(at: Self.file)
    }

    /// Reopen a saved chat; false if it couldn't be loaded
    func open(_ id: String, auth: AuthStore) async -> Bool {
        guard !sending else { return false }
        if id == conversationId { return true }
        do {
            let loaded = try await auth.api.chatConversation(id: id)
            messages = loaded
            conversationId = id
            error = nil
            save()
            return true
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            historyError = "Couldn't open that chat. \((error as? APIError)?.errorDescription ?? error.localizedDescription)"
            await refreshHistory(auth: auth)
        }
        return false
    }

    func delete(_ id: String, auth: AuthStore) async {
        do {
            try await auth.api.deleteChatConversation(id: id)
            conversations.removeAll { $0.id == id }
            if id == conversationId { newChat() }
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            historyError = "Couldn't delete that chat. \((error as? APIError)?.errorDescription ?? error.localizedDescription)"
        }
    }

    /// Read the list again: a chat may have been started on the web since
    func refreshHistory(auth: AuthStore) async {
        loadingHistory = true
        defer { loadingHistory = false }
        do {
            conversations = try await auth.api.chatConversations()
            historyError = nil
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            historyError = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    /// Save the chat to your account. Quiet on failure: it is still on this device, and the next
    /// reply saves it again.
    private func syncToServer(auth: AuthStore) async {
        guard !messages.isEmpty else { return }
        let id = conversationId, snapshot = messages
        do {
            try await auth.api.saveChatConversation(id: id, messages: snapshot)
            await refreshHistory(auth: auth)
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            #if DEBUG
            print("Chat: saving to your account failed — \(error)")
            #endif
        }
    }

    func stop() {
        streamTask?.cancel()
    }

    func send(_ text: String, auth: AuthStore, invoices: InvoiceStore) {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !sending else { return }
        error = nil
        messages.append(ChatMessage(id: UUID().uuidString, role: .user, parts: [.text(id: UUID().uuidString, text)]))
        // The request carries everything up to and including this question, but not the reply being written
        let history = messages
        messages.append(ChatMessage(id: UUID().uuidString, role: .assistant, parts: []))
        sending = true

        streamTask = Task {
            defer {
                sending = false
                if UIAccessibility.isVoiceOverRunning, messages.last?.hasContent == true, self.error == nil {
                    UIAccessibility.post(notification: .announcement, argument: "Reply finished")
                }
                // A reply that said nothing (stopped at once, or failed) leaves no empty bubble behind
                if messages.last?.hasContent == false { messages.removeLast() }
                save()
                Task { await syncToServer(auth: auth) }
            }
            do {
                for try await chunk in auth.api.chat(history) {
                    if await apply(chunk, auth: auth, invoices: invoices) { Haptics.success() }
                }
            } catch is CancellationError {
                // Stopped by the user: keep what arrived
            } catch APIError.unauthorized {
                auth.sessionExpired()
            } catch {
                self.error = (error as? APIError)?.errorDescription ?? error.localizedDescription
                Haptics.failure()
            }
        }
    }

    /// Returns true when the chunk finished saving a draft
    private func apply(_ chunk: ChatChunk, auth: AuthStore, invoices: InvoiceStore) async -> Bool {
        guard let index = messages.indices.last else { return false }
        switch chunk {
        case .stepStart:
            messages[index].parts.append(.stepStart(id: UUID().uuidString))
        case .textStart:
            messages[index].parts.append(.text(id: UUID().uuidString, ""))
        case .textDelta(let delta):
            if case .text(let id, let existing)? = messages[index].parts.last {
                messages[index].parts[messages[index].parts.count - 1] = .text(id: id, existing + delta)
            }
        case .toolInputStart(let id, let name):
            messages[index].parts.append(.tool(ToolCall(id: id, name: name)))
        case .toolInput(let id, let name, let input):
            update(call: id, in: index, createAs: name) { $0.input = input }
        case .toolOutput(let id, let output):
            var saved = false
            update(call: id, in: index, createAs: "") {
                $0.output = output
                $0.state = .done
                saved = $0.draftInvoiceId != nil
            }
            if saved {
                // The draft is a real invoice now: the list and dashboard should show it
                await invoices.load(auth: auth)
                return true
            }
        case .toolFailed(let id, let text):
            update(call: id, in: index, createAs: "") { $0.state = .failed; $0.errorText = text }
        case .error(let text):
            error = text
        case .ignored:
            break
        }
        return false
    }

    private func update(call id: String, in message: Int, createAs name: String, _ change: (inout ToolCall) -> Void) {
        if let i = messages[message].parts.firstIndex(where: { $0.id == id }), case .tool(var call) = messages[message].parts[i] {
            change(&call)
            messages[message].parts[i] = .tool(call)
        } else {
            var call = ToolCall(id: id, name: name)
            change(&call)
            messages[message].parts.append(.tool(call))
        }
    }

    private func save() {
        do {
            try FileManager.default.createDirectory(at: Self.file.deletingLastPathComponent(), withIntermediateDirectories: true)
            try JSONEncoder().encode(Saved(id: conversationId, messages: messages))
                .write(to: Self.file, options: [.atomic, .completeFileProtection])
        } catch {
            #if DEBUG
            print("Chat: saving the conversation failed — \(error)")
            #endif
        }
    }
}
