import SwiftUI

struct ShareSheet: UIViewControllerRepresentable {
    let url: URL
    /// Called when the sheet closes: true if something was actually done with the file (sent, saved,
    /// copied), false if it was dismissed
    var onFinish: (Bool) -> Void = { _ in }

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        controller.completionWithItemsHandler = { _, completed, _, _ in onFinish(completed) }
        return controller
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

extension InvoiceStatus {
    /// Sharing a draft means it has gone out, so it becomes sent. Anything already sent, paid or
    /// overdue keeps its status, and so does an invoice whose share sheet was dismissed.
    static func afterSharing(_ current: InvoiceStatus, completed: Bool) -> InvoiceStatus? {
        completed && current == .draft ? .sent : nil
    }
}
