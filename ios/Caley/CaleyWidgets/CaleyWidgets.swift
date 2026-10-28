import SwiftUI
import WidgetKit

@main
struct CaleyWidgets: WidgetBundle {
    var body: some Widget {
        OutstandingWidget()
        PaidOwedWidget()
        SummaryWidget()
        NewInvoiceWidget()
    }
}

/// How much is owed: small on the home screen, and a line or a badge on the lock screen
struct OutstandingWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CaleyOutstanding", provider: CaleyProvider()) { entry in
            OutstandingView(entry: entry)
        }
        .configurationDisplayName("Outstanding")
        .description("What you're owed, and how much of it is overdue.")
        .supportedFamilies([.systemSmall, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

/// What you've been paid this tax year against what is still owed, with how far through that you are
struct PaidOwedWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CaleyPaidOwed", provider: CaleyProvider()) { entry in
            PaidOwedView(entry: entry)
        }
        .configurationDisplayName("Paid and owed")
        .description("Paid so far this tax year, what's still outstanding, and how much of it you've been paid.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}

/// The tax year at a glance, with the latest invoices to tap
struct SummaryWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CaleySummary", provider: CaleyProvider()) { entry in
            SummaryView(entry: entry)
        }
        .configurationDisplayName("This tax year")
        .description("Invoiced, paid and outstanding, with your latest invoices.")
        .supportedFamilies([.systemMedium])
    }
}

/// One tap to start an invoice. Needs no data, so it never shows a stale or empty state.
struct NewInvoiceWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CaleyNewInvoice", provider: QuickActionProvider()) { _ in
            NewInvoiceView()
        }
        .configurationDisplayName("New invoice")
        .description("Open Caley straight to a new invoice.")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}
