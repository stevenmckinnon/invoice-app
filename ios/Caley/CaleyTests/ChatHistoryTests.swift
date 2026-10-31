import XCTest
@testable import Caley

final class ChatHistoryTests: XCTestCase {
    private func json(_ text: String) -> JSONValue {
        try! JSONDecoder().decode(JSONValue.self, from: Data(text.utf8))
    }

    /// What a message says, without the ids that are made up on the way in
    private func shape(_ message: ChatMessage) -> [String] {
        message.parts.map {
            switch $0 {
            case .stepStart: "step"
            case .text(_, let text): "text:\(text)"
            case .tool(let call): "tool:\(call.name):\(call.state)"
            }
        }
    }

    func testAMessageSurvivesBeingSavedAndReadBack() throws {
        var created = ToolCall(id: "call_1", name: ToolCall.createDraft)
        created.input = json(#"{"showName":"Harbour Lights"}"#)
        created.output = json(#"{"success":true,"invoiceId":"inv_9","invoiceNumber":"INV-2609"}"#)
        created.state = .done
        let original = ChatMessage(id: "m1", role: .assistant, parts: [
            .stepStart(id: "s"), .text(id: "t", "Drafted it."), .tool(created),
        ])

        let back = try XCTUnwrap(ChatMessage(wire: original.wire))

        XCTAssertEqual(back.id, "m1")
        XCTAssertEqual(back.role, .assistant)
        XCTAssertEqual(shape(back), shape(original))
        // The card that opens the draft still has what it needs after a reopen
        guard case .tool(let call) = back.parts.last else { return XCTFail("no tool call") }
        XCTAssertEqual(call.draftInvoiceId, "inv_9")
        XCTAssertEqual(call.output?["invoiceNumber"]?.string, "INV-2609")
    }

    func testAToolCallThatNeverAnsweredIsLeftOutBothWays() throws {
        let running = ToolCall(id: "call_2", name: ToolCall.updateDraft)
        let message = ChatMessage(id: "m", role: .assistant, parts: [.text(id: "t", "On it"), .tool(running)])
        let back = try XCTUnwrap(ChatMessage(wire: message.wire))
        XCTAssertEqual(shape(back), ["text:On it"])
    }

    func testReadsAChatTheWebSaved() throws {
        let web = json("""
        {"id":"web1","role":"assistant","parts":[
          {"type":"step-start"},
          {"type":"reasoning","text":"thinking","state":"done"},
          {"type":"text","text":"Here you go.","state":"done"},
          {"type":"tool-createInvoiceDraft","toolCallId":"c1","state":"output-available",
           "input":{"showName":"X"},"output":{"success":true,"invoiceId":"inv_1"}},
          {"type":"tool-updateInvoiceDraft","toolCallId":"c2","state":"input-streaming","input":{}},
          {"type":"tool-updateInvoiceDraft","toolCallId":"c3","state":"output-error","errorText":"Nope"},
          {"type":"file","mediaType":"image/png","url":"x"}
        ]}
        """)
        let message = try XCTUnwrap(ChatMessage(wire: web))
        // Reasoning, files and a call with no answer aren't drawn; the failure is kept as one
        XCTAssertEqual(shape(message), ["step", "text:Here you go.", "tool:createInvoiceDraft:done", "tool:updateInvoiceDraft:failed"])
        guard case .tool(let failed) = message.parts.last else { return XCTFail("no tool call") }
        XCTAssertEqual(failed.errorText, "Nope")
    }

    func testASystemOrMalformedMessageIsSkipped() {
        XCTAssertNil(ChatMessage(wire: json(#"{"id":"s","role":"system","parts":[{"type":"text","text":"x"}]}"#)))
        XCTAssertNil(ChatMessage(wire: json(#"{"id":"u","role":"user"}"#)))
        XCTAssertNil(ChatMessage(wire: json(#"{"id":"u","parts":[]}"#)))
    }

    func testTheSavedFileReadsInBothShapes() throws {
        let user = ChatMessage(id: "u", role: .user, parts: [.text(id: "t", "Hi")])
        let empty = ChatMessage(id: "e", role: .assistant, parts: [])

        // The current shape keeps its id and drops a reply that said nothing
        let current = try JSONEncoder().encode(["id": JSONValue.string("abc-123"),
                                                "messages": .array([try JSONDecoder().decode(JSONValue.self, from: JSONEncoder().encode(user)),
                                                                    try JSONDecoder().decode(JSONValue.self, from: JSONEncoder().encode(empty))])])
        let saved = try XCTUnwrap(ChatStore.decodeSaved(current))
        XCTAssertEqual(saved.id, "abc-123")
        XCTAssertEqual(saved.messages.map(\.id), ["u"])

        // Earlier versions stored the bare list: still read, and given an id
        let legacy = try JSONEncoder().encode([user])
        let old = try XCTUnwrap(ChatStore.decodeSaved(legacy))
        XCTAssertEqual(old.messages.map(\.id), ["u"])
        XCTAssertFalse(old.id.isEmpty)

        XCTAssertNil(ChatStore.decodeSaved(Data("not json".utf8)))
    }

    func testDateLabels() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let now = try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-10-31T12:00:00Z"))
        func label(_ iso: String) -> String {
            ChatConversationSummary(id: "x", title: "t", updatedAt: iso).dateLabel(now: now, calendar: calendar)
        }
        XCTAssertEqual(label("2026-10-31T00:03:06.421Z"), "Today")
        XCTAssertEqual(label("2026-10-30T23:59:59.000Z"), "Yesterday")
        XCTAssertFalse(label("2026-03-02T10:00:00.000Z").isEmpty)
        XCTAssertTrue(label("2025-03-02T10:00:00.000Z").contains("2025"))
        XCTAssertFalse(label("2026-03-02T10:00:00.000Z").contains("2026"))
        XCTAssertEqual(label("garbage"), "")
    }

    func testASummaryReadsTheServersList() throws {
        let data = Data(#"[{"id":"a1","title":"How much am I owed?","updatedAt":"2026-10-31T00:03:06.421Z"}]"#.utf8)
        let list = try JSONDecoder().decode([ChatConversationSummary].self, from: data)
        XCTAssertEqual(list.first?.title, "How much am I owed?")
        XCTAssertNotNil(list.first?.date)
    }
}
