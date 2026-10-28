import SwiftUI

/// The conversation with the assistant. One conversation, kept on the device so it survives a
/// relaunch (the web app does the same in localStorage) and wiped on sign-out.
@MainActor
@Observable
final class ChatStore {
    private(set) var messages: [ChatMessage] = []
    private(set) var sending = false
    var error: String?

    private var streamTask: Task<Void, Never>?

    private static let file: URL = URL.applicationSupportDirectory.appending(path: "chat.json")

    init() {
        if let data = try? Data(contentsOf: Self.file),
           let saved = try? JSONDecoder().decode([ChatMessage].self, from: data) {
            // A reply cut off by quitting the app has nothing to resume
            messages = saved.filter(\.hasContent)
        }
    }

    /// Forget the conversation: on sign-out the next person must not read this one's
    func reset() {
        stop()
        messages = []
        error = nil
        try? FileManager.default.removeItem(at: Self.file)
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
                // A reply that said nothing (stopped at once, or failed) leaves no empty bubble behind
                if messages.last?.hasContent == false { messages.removeLast() }
                save()
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
            try JSONEncoder().encode(messages).write(to: Self.file, options: [.atomic, .completeFileProtection])
        } catch {
            #if DEBUG
            print("Chat: saving the conversation failed — \(error)")
            #endif
        }
    }
}
