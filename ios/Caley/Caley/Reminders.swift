import SwiftUI
import UserNotifications

/// One local notification the app wants scheduled
struct PlannedReminder: Equatable {
    let id: String
    let invoiceID: String
    let fireAt: Date
    let title: String
    let body: String
}

/// Decides which chase-up reminders exist. A sent invoice gets one `firstAfterDays` after its date,
/// then one a week for a few weeks; an overdue one (or a sent one already past that point) gets the
/// weekly nudge on Mondays. Everything is at 9am. It only plans: `Reminders` schedules them.
enum ReminderPlanner {
    static let firstAfterDays = 30
    static let weeklyCount = 4
    static let hour = 9
    /// iOS keeps at most 64 pending notifications; the nearest ones are the useful ones
    static let limit = 60

    static func plan(_ invoices: [InvoiceListItem], now: Date = .now, hideAmounts: Bool, calendar: Calendar = .current) -> [PlannedReminder] {
        var planned: [PlannedReminder] = []
        for invoice in invoices where invoice.status == .sent || invoice.status == .overdue {
            guard let sentDay = localDay(invoice.invoiceDate, calendar) else { continue }
            let firstDay = calendar.date(byAdding: .day, value: firstAfterDays, to: sentDay)
            let first = firstDay.flatMap { calendar.date(bySettingHour: hour, minute: 0, second: 0, of: $0) }

            var times: [Date] = []
            if invoice.status == .sent, let first, first > now {
                times = (0..<weeklyCount).compactMap { calendar.date(byAdding: .day, value: 7 * $0, to: first) }
            } else if let monday = calendar.nextDate(
                after: now, matching: DateComponents(hour: hour, minute: 0, weekday: 2), matchingPolicy: .nextTime) {
                times = (0..<weeklyCount - 1).compactMap { calendar.date(byAdding: .day, value: 7 * $0, to: monday) }
            }
            for (index, time) in times.enumerated() where time > now {
                let age = calendar.dateComponents([.day], from: sentDay, to: calendar.startOfDay(for: time)).day ?? firstAfterDays
                let who = invoice.clientName ?? invoice.showName
                let amount = hideAmounts ? nil : invoice.totalAmount.money(invoice.currencyCode)
                planned.append(PlannedReminder(
                    id: "chase-\(invoice.id)-\(index)",
                    invoiceID: invoice.id,
                    fireAt: time,
                    title: "\(invoice.invoiceNumber) · \(who)",
                    body: amount.map { "\($0) has been outstanding for \(age) days." } ?? "Still outstanding after \(age) days."))
            }
        }
        return Array(planned.sorted { $0.fireAt < $1.fireAt }.prefix(limit))
    }

    /// An invoice date is a calendar date; read it as that same date on the phone's calendar
    private static func localDay(_ iso: String, _ calendar: Calendar) -> Date? {
        guard let date = DateOnly.parse(iso) else { return nil }
        let c = DateOnly.calendar.dateComponents([.year, .month, .day], from: date)
        return calendar.date(from: c)
    }
}

/// Schedules the planned reminders as local notifications. They are rebuilt whenever the invoices
/// load or change, so a paid invoice stops nagging the next time the app runs. Nothing is sent to a
/// server: the phone holds them, which is also why a change made on the web only reaches them once
/// the app is next opened.
@MainActor
enum Reminders {
    private static let key = "remindersEnabled"
    private static let prefix = "chase-"
    private static var latest: [InvoiceListItem] = []

    static var isEnabled: Bool { UserDefaults.standard.bool(forKey: key) }

    /// Call at launch so a tap on a notification is routed even on a cold start
    static func install() {
        UNUserNotificationCenter.current().delegate = NotificationRouter.shared
    }

    /// Asks for permission the first time; false when refused (the system won't ask again)
    static func enable() async -> Bool {
        let granted = await Self.authorize()
        UserDefaults.standard.set(granted, forKey: key)
        if granted { await rebuild() }
        return granted
    }

    static func disable() async {
        UserDefaults.standard.set(false, forKey: key)
        await removeOurs()
    }

    /// The invoices changed (a load, a status change, a delete)
    static func sync(_ invoices: [InvoiceListItem]) {
        latest = invoices
        Task { await rebuild() }
    }

    /// The Face ID lock changed, so what the text may say changed with it
    static func refresh() { Task { await rebuild() } }

    /// Signing out: the next person must not get this one's reminders
    static func clear() {
        latest = []
        Task { await removeOurs() }
    }

    private static func rebuild() async {
        await removeOurs()
        guard isEnabled, await Self.allowed() else { return }
        let center = UNUserNotificationCenter.current()
        for reminder in ReminderPlanner.plan(latest, hideAmounts: SharedStore.hideAmounts) {
            let content = UNMutableNotificationContent()
            content.title = reminder.title
            content.body = reminder.body
            content.sound = .default
            content.userInfo = ["url": "caley://invoice/\(reminder.invoiceID)"]
            let parts = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: reminder.fireAt)
            let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
            center.add(UNNotificationRequest(identifier: reminder.id, content: content, trigger: trigger)) { _ in }
        }
    }

    private static func removeOurs() async {
        let center = UNUserNotificationCenter.current()
        let ids = await Self.pendingIDs().filter { $0.hasPrefix(prefix) }
        center.removePendingNotificationRequests(withIdentifiers: ids)
    }

    // The completion-handler forms, wrapped by hand, as in `AppLock`: the `async` overloads can report
    // "unsafeForcedSync" when awaited from a main-actor type.
    private nonisolated static func authorize() async -> Bool {
        await withCheckedContinuation { continuation in
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, _ in
                continuation.resume(returning: granted)
            }
        }
    }

    private nonisolated static func allowed() async -> Bool {
        await withCheckedContinuation { continuation in
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                let ok = settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
                continuation.resume(returning: ok)
            }
        }
    }

    private nonisolated static func pendingIDs() async -> [String] {
        await withCheckedContinuation { continuation in
            UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
                continuation.resume(returning: requests.map(\.identifier))
            }
        }
    }
}

/// Shows reminders while the app is open, and opens the invoice when one is tapped
final class NotificationRouter: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationRouter()

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let link = (response.notification.request.content.userInfo["url"] as? String).flatMap(URL.init(string:))
        completionHandler()
        if let link { Task { @MainActor in LinkBridge.shared.deliver(link) } }
    }
}
