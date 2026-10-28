import SwiftUI

/// Chat with the same assistant as the web app: it answers questions about your invoices and
/// builds drafts from a description of the job. A draft it saves opens in the normal invoice screen.
struct ChatView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var invoices
    @Environment(ChatStore.self) private var chat

    @State private var input = ""
    @State private var openDraft: DraftRef?
    @State private var confirmingClear = false
    @ScaledMetric(relativeTo: .title) private var sendSize: CGFloat = 34
    @FocusState private var composerFocused: Bool

    private struct DraftRef: Identifiable { let id: String }

    var body: some View {
        NavigationStack {
            Group {
                if chat.messages.isEmpty {
                    welcome
                } else {
                    conversation
                }
            }
            .background(Color.canvas)
            .navigationTitle("Assistant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("New chat", systemImage: "square.and.pencil") { confirmingClear = true }
                        .disabled(chat.messages.isEmpty || chat.sending)
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) { composer }
            .confirmationDialog("Start a new chat?", isPresented: $confirmingClear, titleVisibility: .visible) {
                Button("Clear conversation", role: .destructive) { chat.reset() }
            } message: {
                Text("Drafts the assistant already saved stay in your invoices.")
            }
            .sheet(item: $openDraft) { draft in
                NavigationStack {
                    InvoiceDetailView(id: draft.id)
                        .toolbar {
                            ToolbarItem(placement: .topBarLeading) {
                                Button("Done") { openDraft = nil }
                            }
                        }
                }
            }
        }
    }

    // MARK: Empty

    private var welcome: some View {
        ScrollView {
            VStack(spacing: 20) {
                Image(systemName: "sparkles")
                    .font(.system(size: 34))
                    .foregroundStyle(Color.brand)
                    .padding(.top, 48)
                    .accessibilityHidden(true)
                VStack(spacing: 6) {
                    Text("Ask Caley").font(.title2.weight(.semibold))
                    Text("Describe a job and it drafts the invoice, or ask about what you're owed.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                VStack(spacing: 10) {
                    suggestion("What's outstanding right now?")
                    suggestion("Which invoices are overdue?")
                    suggestion("Draft an invoice for the job I just finished", fill: "Draft an invoice for ")
                }
                .padding(.top, 4)
            }
            .padding(.horizontal, 20)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    /// Questions run at once; a draft needs details, so it fills the field for you to finish
    private func suggestion(_ text: String, fill: String? = nil) -> some View {
        Button {
            if let fill {
                input = fill
                composerFocused = true
            } else {
                chat.send(text, auth: auth, invoices: invoices)
            }
        } label: {
            Text(text)
                .font(.subheadline.weight(.medium))
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(Color.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .foregroundStyle(.primary)
        }
        .buttonStyle(PressableStyle())
    }

    // MARK: Conversation

    private var conversation: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    ForEach(chat.messages) { message in
                        MessageView(message: message) { openDraft = DraftRef(id: $0) }
                    }
                    if chat.sending, chat.messages.last?.hasVisibleParts == false {
                        ProgressView()
                            .padding(.leading, 4)
                            .accessibilityLabel("Thinking")
                    }
                    if let error = chat.error {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    Color.clear.frame(height: 1).id("bottom")
                }
                .padding(16)
            }
            .defaultScrollAnchor(.bottom)
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: chat.messages) { proxy.scrollTo("bottom", anchor: .bottom) }
            .onChange(of: chat.error) { proxy.scrollTo("bottom", anchor: .bottom) }
        }
    }

    // MARK: Composer

    private var canSend: Bool { !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("Message", text: $input, axis: .vertical)
                .lineLimit(1...5)
                .focused($composerFocused)
                .submitLabel(.send)
                .onSubmit(submit)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            if chat.sending {
                Button(action: chat.stop) {
                    Image(systemName: "stop.circle.fill").font(.system(size: sendSize)).foregroundStyle(Color.brand)
                }
                .accessibilityLabel("Stop")
            } else {
                Button(action: submit) {
                    Image(systemName: "arrow.up.circle.fill").font(.system(size: sendSize)).foregroundStyle(Color.brand)
                        .opacity(canSend ? 1 : 0.35)
                }
                .disabled(!canSend)
                .accessibilityLabel("Send")
            }
        }
        .buttonStyle(PressableStyle())
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.canvas)
    }

    private func submit() {
        guard canSend, !chat.sending else { return }
        let text = input
        input = ""
        chat.send(text, auth: auth, invoices: invoices)
    }
}

private struct MessageView: View {
    let message: ChatMessage
    let openDraft: (String) -> Void

    var body: some View {
        switch message.role {
        case .user:
            Text(message.text)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .foregroundStyle(.white)
                .background(Color.brand, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.leading, 48)
                .accessibilityLabel("You: \(message.text)")
        case .assistant:
            VStack(alignment: .leading, spacing: 10) {
                ForEach(message.parts) { part in
                    switch part {
                    case .text(_, let text) where !text.isEmpty:
                        MarkdownText(text: text)
                    case .tool(let call):
                        ToolCallView(call: call, openDraft: openDraft)
                    default:
                        EmptyView()
                    }
                }
            }
            .padding(.trailing, 24)
        }
    }
}

/// A tool call shows as a status line while it runs, then as a card for a saved draft.
/// A refused or failed call shows nothing: the model explains what went wrong in its own words.
private struct ToolCallView: View {
    let call: ToolCall
    let openDraft: (String) -> Void

    var body: some View {
        if call.isDraftTool {
            switch call.state {
            case .running:
                HStack(spacing: 8) {
                    ProgressView()
                    Text(call.name == ToolCall.createDraft ? "Drafting the invoice…" : "Updating the draft…")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .accessibilityElement(children: .combine)
            case .done:
                if let id = call.draftInvoiceId { draftCard(id) }
            case .failed:
                EmptyView()
            }
        }
    }

    private func draftCard(_ id: String) -> some View {
        let output = call.output
        let number = output?["invoiceNumber"]?.string
        let detail = [output?["days"]?.string, output?["total"]?.string]
            .compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
        return Button { openDraft(id) } label: {
            HStack(spacing: 12) {
                Image(systemName: "doc.text")
                    .font(.title3)
                    .foregroundStyle(Color.brand)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(call.name == ToolCall.createDraft ? "Draft \(number ?? "saved")" : "Draft updated")
                        .font(.subheadline.weight(.semibold))
                    if !detail.isEmpty {
                        Text(detail).font(.footnote).foregroundStyle(.secondary).monospacedDigit()
                    }
                }
                Spacer(minLength: 8)
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(PressableStyle())
        .accessibilityHint("Opens the draft")
    }
}
