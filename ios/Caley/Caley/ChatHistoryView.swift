import SwiftUI

/// Past chats, newest first, with New chat at the top. On an iPad it sits beside the conversation,
/// as the web does; on a phone it opens as a sheet (`onPick` puts that away once you've chosen).
/// The list is read each time it appears, so a chat started on the web is here. Deleting asks
/// first: it can't be undone.
struct ChatHistoryList: View {
    @Environment(AuthStore.self) private var auth
    @Environment(ChatStore.self) private var chat

    var onPick: (() -> Void)?

    @State private var pendingDelete: ChatConversationSummary?

    var body: some View {
        List {
            Section {
                Button {
                    chat.newChat()
                    onPick?()
                } label: {
                    Label("New chat", systemImage: "square.and.pencil")
                }
                // Nothing to start over from until something has been said, and not mid-reply
                .disabled(chat.messages.isEmpty || chat.sending)
            }

            Section("Chats") {
                if chat.conversations.isEmpty {
                    if chat.loadingHistory {
                        ProgressView().frame(maxWidth: .infinity)
                    } else if let message = chat.historyError {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(message).foregroundStyle(.secondary)
                            Button("Try again") { Task { await chat.refreshHistory(auth: auth) } }
                        }
                    } else {
                        Text("Chats you have with the assistant are kept here, on every device.")
                            .foregroundStyle(.secondary)
                    }
                }
                ForEach(chat.conversations) { conversation in
                    row(conversation)
                }
            }

            // A failed refresh keeps showing the list it has, and says so below it
            if let message = chat.historyError, !chat.conversations.isEmpty {
                Section { Text(message).font(.footnote).foregroundStyle(.secondary) }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.canvas)
        .refreshable { await chat.refreshHistory(auth: auth) }
        .task { await chat.refreshHistory(auth: auth) }
        .confirmationDialog(
            "Delete this chat?", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } }),
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let conversation = pendingDelete { Task { await chat.delete(conversation.id, auth: auth) } }
            }
        } message: {
            Text(pendingDelete?.title ?? "")
        }
    }

    private func row(_ conversation: ChatConversationSummary) -> some View {
        let current = conversation.id == chat.conversationId
        return Button {
            Task { if await chat.open(conversation.id, auth: auth) { onPick?() } }
        } label: {
            VStack(alignment: .leading, spacing: 2) {
                Text(conversation.title).lineLimit(2)
                Text(conversation.dateLabel()).font(.caption).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .foregroundStyle(.primary)
        .disabled(chat.sending)
        .listRowBackground(current ? Color.brand.opacity(0.12) : nil)
        .accessibilityAddTraits(current ? .isSelected : [])
        .swipeActions(edge: .trailing) {
            Button("Delete", role: .destructive) { pendingDelete = conversation }
        }
    }
}
