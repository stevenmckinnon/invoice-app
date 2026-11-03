import SwiftUI
import TipKit

/// Shown once someone has painted a few dates one tap at a time: touch-and-hold-and-drag paints a
/// run, and nothing on the calendar says so. Gone for good once they paint a run.
struct PaintRunTip: Tip {
    /// A date painted with a single tap
    static let tappedDate = Tips.Event(id: "tappedDate")

    var title: Text { Text("Paint several days at once") }
    var message: Text? { Text("Touch and hold a date, then drag across the rest.") }
    var image: Image? { Image(systemName: "hand.draw") }

    var rules: [Rule] {
        #Rule(Self.tappedDate) { $0.donations.count >= 3 }
    }
}

/// Shown after the first run is painted, which is when a job's days are in and its overtime is next.
/// Gone for good once overtime is set on any day.
struct OvertimeTip: Tip {
    /// A drag that painted dates
    static let paintedRun = Tips.Event(id: "paintedRun")

    var title: Text { Text("Overtime goes on the day") }
    var message: Text? { Text("Tap a painted work day, then set its hours just below the calendar.") }
    var image: Image? { Image(systemName: "clock") }

    var rules: [Rule] {
        #Rule(Self.paintedRun) { $0.donations.count >= 1 }
    }
}

enum EditorTips {
    /// Before any tip view appears. In a Debug build, `-resetTips` forgets which tips were seen and
    /// `-showAllTips` shows them all regardless of their rules (Scheme → Arguments).
    static func configure() {
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("-resetTips") { try? Tips.resetDatastore() }
        if arguments.contains("-showAllTips") { Tips.showAllTipsForTesting() }
        #endif
        try? Tips.configure()
    }
}
