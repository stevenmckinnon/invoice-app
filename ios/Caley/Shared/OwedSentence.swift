import Foundation

extension WidgetSnapshot {
    /// What Siri says for "what am I owed?". With the app lock on, a voice reply is as public as a
    /// widget, so it gives counts and never amounts.
    func owedSentence(hideAmounts: Bool) -> String {
        guard outstandingCount > 0 else { return "Nothing is outstanding for \(fyLabel)." }
        let invoices = outstandingCount == 1 ? "1 invoice" : "\(outstandingCount) invoices"
        let overdue: String
        switch overdueCount {
        case 0: overdue = ""
        case 1: overdue = " 1 is overdue."
        default: overdue = " \(overdueCount) are overdue."
        }
        if hideAmounts { return "You have \(invoices) outstanding.\(overdue)" }
        return "You're owed \(outstanding.money(currency)) across \(invoices).\(overdue)"
    }
}
