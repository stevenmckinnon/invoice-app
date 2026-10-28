import Foundation

/// Any JSON value. The chat endpoint speaks the AI SDK's UI message format, whose tool inputs and
/// outputs are free-form, so they travel through the app untouched and go back to the server as-is.
enum JSONValue: Codable, Hashable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode([JSONValue].self) { self = .array(v) }
        else { self = .object(try c.decode([String: JSONValue].self)) }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .null: try c.encodeNil()
        case .bool(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .string(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        }
    }

    subscript(key: String) -> JSONValue? {
        if case .object(let o) = self { o[key] } else { nil }
    }

    var string: String? { if case .string(let s) = self { s } else { nil } }
    var bool: Bool? { if case .bool(let b) = self { b } else { nil } }
}

/// One tool call the assistant made. The model's own arguments are `input`; what the server did
/// with them is `output`.
struct ToolCall: Codable, Hashable {
    enum State: String, Codable { case running, done, failed }

    let id: String
    let name: String
    var input: JSONValue?
    var output: JSONValue?
    var errorText: String?
    var state: State = .running

    static let createDraft = "createInvoiceDraft"
    static let updateDraft = "updateInvoiceDraft"

    var isDraftTool: Bool { name == Self.createDraft || name == Self.updateDraft }

    /// Set when the call finished and the server saved (or changed) a draft
    var draftInvoiceId: String? {
        guard isDraftTool, state == .done, output?["success"]?.bool == true else { return nil }
        return output?["invoiceId"]?.string
    }

    /// The tool ran but refused, e.g. an incomplete profile. The model reads this and explains it,
    /// so the screen shows nothing of its own.
    var refused: Bool { state == .done && output?["error"] != nil }
}

enum ChatPart: Codable, Hashable, Identifiable {
    case stepStart(id: String)
    case text(id: String, String)
    case tool(ToolCall)

    var id: String {
        switch self {
        case .stepStart(let id), .text(let id, _): id
        case .tool(let call): call.id
        }
    }
}

struct ChatMessage: Identifiable, Codable, Hashable {
    enum Role: String, Codable { case user, assistant }

    let id: String
    let role: Role
    var parts: [ChatPart]

    var text: String {
        parts.compactMap { if case .text(_, let t) = $0 { t } else { nil } }.joined(separator: "\n\n")
    }

    /// The AI SDK `UIMessage` the route handler expects. A tool call that never got a result (the
    /// stream was cut off) is left out: the model rejects a call with no answer.
    var wire: JSONValue {
        let parts: [JSONValue] = self.parts.compactMap { part in
            switch part {
            case .stepStart:
                return .object(["type": .string("step-start")])
            case .text(_, let text):
                guard !text.isEmpty else { return nil }
                return .object(["type": .string("text"), "text": .string(text), "state": .string("done")])
            case .tool(let call):
                guard call.state != .running else { return nil }
                var object: [String: JSONValue] = [
                    "type": .string("tool-\(call.name)"),
                    "toolCallId": .string(call.id),
                    "input": call.input ?? .object([:]),
                ]
                if call.state == .failed {
                    object["state"] = .string("output-error")
                    object["errorText"] = .string(call.errorText ?? "The tool failed.")
                } else {
                    object["state"] = .string("output-available")
                    object["output"] = call.output ?? .null
                }
                return .object(object)
            }
        }
        return .object(["id": .string(id), "role": .string(role.rawValue), "parts": .array(parts)])
    }

    /// Whether anything of this message is on screen yet: until then a spinner stands in for it
    var hasVisibleParts: Bool {
        parts.contains {
            switch $0 {
            case .text(_, let t): !t.isEmpty
            case .tool: true
            case .stepStart: false
            }
        }
    }

    /// Whether this message says anything the model should see
    var hasContent: Bool {
        parts.contains {
            switch $0 {
            case .text(_, let t): !t.isEmpty
            case .tool(let call): call.state != .running
            case .stepStart: false
            }
        }
    }
}

/// One event of the response stream (server-sent events, one JSON object per `data:` line)
enum ChatChunk {
    case stepStart
    case textStart
    case textDelta(String)
    case toolInputStart(id: String, name: String)
    case toolInput(id: String, name: String, input: JSONValue)
    case toolOutput(id: String, output: JSONValue)
    case toolFailed(id: String, text: String)
    case error(String)
    case ignored

    init(_ json: JSONValue) {
        let id = json["toolCallId"]?.string ?? ""
        switch json["type"]?.string {
        case "start-step": self = .stepStart
        case "text-start": self = .textStart
        case "text-delta": self = .textDelta(json["delta"]?.string ?? "")
        case "tool-input-start": self = .toolInputStart(id: id, name: json["toolName"]?.string ?? "")
        case "tool-input-available":
            self = .toolInput(id: id, name: json["toolName"]?.string ?? "", input: json["input"] ?? .null)
        case "tool-output-available": self = .toolOutput(id: id, output: json["output"] ?? .null)
        case "tool-input-error", "tool-output-error":
            self = .toolFailed(id: id, text: json["errorText"]?.string ?? "The tool failed.")
        case "error": self = .error(json["errorText"]?.string ?? "Something went wrong.")
        default: self = .ignored
        }
    }
}
