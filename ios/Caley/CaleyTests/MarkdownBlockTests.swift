import XCTest
@testable import Caley

final class MarkdownBlockTests: XCTestCase {
    func testTheAssistantsTypicalReply() {
        let text = """
        Perfect! I've created your draft invoice **#INV-2610**:

        - 3 work days at £150/day
        - 2 hours overtime (at 1.5x rate)
          - on Tuesday

        1. Open the draft
        2) Check the days

        ## Next
        Anything else?
        """
        XCTAssertEqual(MarkdownBlock.parse(text), [
            .paragraph("Perfect! I've created your draft invoice **#INV-2610**:"),
            .bullet("3 work days at £150/day", level: 0),
            .bullet("2 hours overtime (at 1.5x rate)", level: 0),
            .bullet("on Tuesday", level: 1),
            .numbered(1, "Open the draft", level: 0),
            .numbered(2, "Check the days", level: 0),
            .heading("Next"),
            .paragraph("Anything else?"),
        ])
    }

    func testHalfFinishedTextDoesNotBreak() {
        XCTAssertEqual(MarkdownBlock.parse(""), [])
        XCTAssertEqual(MarkdownBlock.parse("- "), [.paragraph("-")])
        XCTAssertEqual(MarkdownBlock.parse("**bold"), [.paragraph("**bold")])
        XCTAssertEqual(MarkdownBlock.parse("-").count, 1)
    }

    func testDashesInsideSentencesStayText() {
        XCTAssertEqual(MarkdownBlock.parse("Tuesday - Friday"), [.paragraph("Tuesday - Friday")])
        XCTAssertEqual(MarkdownBlock.parse("-5 degrees"), [.paragraph("-5 degrees")])
        XCTAssertEqual(MarkdownBlock.parse("2026 was a year"), [.paragraph("2026 was a year")])
    }

    func testLineBreaksInsideAParagraphSurvive() {
        XCTAssertEqual(MarkdownBlock.parse("one\ntwo\n\nthree"), [.paragraph("one\ntwo"), .paragraph("three")])
    }
}
