import SwiftUI

/// A labelled text field in the app's card style, shared by the client and profile forms.
struct LabeledField: View {
    let label: String
    @Binding var text: String
    var prompt = ""
    var keyboard: UIKeyboardType = .default
    var capitalization: TextInputAutocapitalization = .sentences
    var monospaced = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            TextField(prompt, text: $text)
                .keyboardType(keyboard)
                .textInputAutocapitalization(capitalization)
                .autocorrectionDisabled(keyboard != .default || monospaced)
                .font(monospaced ? .body.monospaced() : .body)
                .padding(12)
                .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

struct CardSection<Content: View>: View {
    let title: String
    var footnote: String?
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title).font(.subheadline.weight(.semibold))
            content
            if let footnote {
                Text(footnote).font(.caption).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }
}

/// A saving bar pinned to the bottom of a form sheet
struct SaveBar: View {
    let title: String
    let busy: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if busy { ProgressView().tint(.white) }
                Text(title).fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity, minHeight: 50)
            .foregroundStyle(.white)
            .background(Color.brand, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(PressableStyle())
        .disabled(busy)
        .padding(.horizontal, 16).padding(.vertical, 10)
        .background(.bar)
    }
}

/// Fields side by side while they fit, stacked once text is large enough that two columns would
/// squeeze each one to a few characters.
struct AdaptiveRow<Content: View>: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    var alignment: VerticalAlignment = .top
    @ViewBuilder let content: Content

    var body: some View {
        if typeSize >= .xxLarge {
            VStack(alignment: .leading, spacing: 12) { content }
        } else {
            HStack(alignment: alignment, spacing: 12) { content }
        }
    }
}

extension View {
    /// A whole screen (its title, toolbar and content) as one centred column on an iPad, so the
    /// title and the buttons line up with the content instead of sitting at the screen's far edges.
    /// The background still runs edge to edge. A no-op on a phone.
    func readableColumn(_ width: CGFloat = 760) -> some View {
        frame(maxWidth: width).frame(maxWidth: .infinity).background(Color.canvas.ignoresSafeArea())
    }

    /// On an iPad a full-width card is a long way from its own edge. Cap the content at a width that
    /// reads well and centre it, leaving the background to run edge to edge. A no-op on a phone.
    func readableWidth(_ width: CGFloat = 720) -> some View {
        frame(maxWidth: width).frame(maxWidth: .infinity)
    }
}
