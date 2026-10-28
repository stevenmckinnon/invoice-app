import SwiftUI

/// The assistant writes light Markdown: paragraphs, "- " and "1." lists, the odd heading, and bold
/// or italics inside them. SwiftUI's own Markdown handles the inline parts but not lists, so this
/// splits the text into blocks first and lays each out itself.
enum MarkdownBlock: Equatable {
    case paragraph(String)
    case heading(String)
    /// `level` is how far it is indented (0 = top level)
    case bullet(String, level: Int)
    case numbered(Int, String, level: Int)

    /// Whole text to blocks. Safe on half-finished text, since it is called on every streamed chunk.
    static func parse(_ text: String) -> [MarkdownBlock] {
        var blocks: [MarkdownBlock] = []
        var paragraph: [String] = []

        func flush() {
            if !paragraph.isEmpty { blocks.append(.paragraph(paragraph.joined(separator: "\n"))) }
            paragraph = []
        }

        for raw in text.split(separator: "\n", omittingEmptySubsequences: false) {
            let line = String(raw)
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.isEmpty { flush(); continue }

            // Two spaces (or a tab) of indentation per nesting level
            let indent = line.prefix { $0 == " " || $0 == "\t" }
            let level = min(indent.reduce(0) { $0 + ($1 == "\t" ? 2 : 1) } / 2, 3)

            if let heading = trimmed.firstMatch(of: /^#{1,6}\s+(.+)$/) {
                flush()
                blocks.append(.heading(String(heading.1)))
            } else if let bullet = trimmed.firstMatch(of: /^[-*•]\s+(.+)$/) {
                flush()
                blocks.append(.bullet(String(bullet.1), level: level))
            } else if let item = trimmed.firstMatch(of: /^(\d{1,3})[.)]\s+(.+)$/) {
                flush()
                blocks.append(.numbered(Int(item.1) ?? 1, String(item.2), level: level))
            } else {
                paragraph.append(trimmed)
            }
        }
        flush()
        return blocks
    }
}

struct MarkdownText: View {
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            let blocks = MarkdownBlock.parse(text)
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in
                view(for: block)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func view(for block: MarkdownBlock) -> some View {
        switch block {
        case .paragraph(let line):
            Text(Self.inline(line))
        case .heading(let line):
            Text(Self.inline(line)).font(.headline).accessibilityAddTraits(.isHeader)
        case .bullet(let line, let level):
            item(marker: "•", line: line, level: level)
        case .numbered(let number, let line, let level):
            item(marker: "\(number).", line: line, level: level)
        }
    }

    private func item(marker: String, line: String, level: Int) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(marker)
                .monospacedDigit()
                .foregroundStyle(.secondary)
                .accessibilityHidden(true)
            Text(Self.inline(line))
        }
        .padding(.leading, CGFloat(level) * 16)
        .accessibilityElement(children: .combine)
    }

    /// Bold, italics, code and links
    private static func inline(_ line: String) -> AttributedString {
        (try? AttributedString(markdown: line, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)))
            ?? AttributedString(line)
    }
}
