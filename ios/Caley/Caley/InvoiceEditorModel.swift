import SwiftUI

@MainActor
@Observable
final class InvoiceEditorModel {
    struct ExpenseDraft: Identifiable, Hashable {
        let id = UUID()
        var description = ""
        var quantity = 1
        var unitPrice = ""
    }

    struct PreviewKey: Hashable {
        let clientId: String?
        let days: [BillableDay]
        let expenses: [ExpensePayload]
    }

    /// The invoice being edited; nil for a new one
    let editing: InvoiceDetail?
    /// Currency of the invoice a new one was copied from, so a copy of a dollar invoice stays in dollars
    private let copiedCurrency: String?

    var clients: [Client] = []
    var profile: Profile?
    var loadError: String?
    var loaded = false

    var clientId: String?
    var showName: String
    var invoiceNumber: String
    var invoiceDate: Date
    var notes: String
    /// Nil until edited: then it follows the client
    var attention: String?
    var painted: Painted
    var expenses: [ExpenseDraft]

    var brush: Brush = .work
    var selected: String?

    var preview: PreviewResult?
    var previewError: String?
    var previewing = false

    var saving = false
    var saveError: String?
    var attempted = false
    /// Counts every tap on Save, so the screen can react to each failed one, not just the first
    private(set) var attempts = 0

    /// `copying` starts a new invoice from an old one: the client, job name, notes and expenses carry
    /// over, the days don't (they'd be the old job's dates) and the number is the next free one.
    init(editing: InvoiceDetail?, copying: InvoiceDetail? = nil) {
        let base = editing ?? copying
        self.editing = editing
        copiedCurrency = copying?.currencyCode
        clientId = base?.clientId
        showName = base?.showName ?? ""
        invoiceNumber = editing?.invoiceNumber ?? ""
        invoiceDate = editing.map { DateOnly.localDate($0.invoiceDate) } ?? .now
        notes = base?.notes ?? ""
        attention = base?.attentionTo
        painted = editing.map { DayEditor.fromStored($0.days) } ?? [:]
        expenses = (base?.customExpenseEntries ?? []).map {
            var draft = ExpenseDraft()
            draft.description = $0.description
            draft.quantity = $0.quantity
            draft.unitPrice = "\($0.unitPrice.value)"
            return draft
        }
    }

    // MARK: Derived

    var client: Client? { clients.first { $0.id == clientId } }
    /// An existing invoice keeps the terms it was priced under; only a change of client re-prices it
    var sameClient: Bool { editing != nil && clientId == editing?.clientId }
    var currency: String { editing?.currencyCode ?? copiedCurrency ?? profile?.currency ?? "GBP" }
    var billable: [BillableDay] { DayEditor.billableDays(painted) }
    var initialMonth: String { billable.first?.date ?? DateOnly.isoLocal(invoiceDate) }

    var parsedExpenses: [ExpensePayload] {
        expenses
            .filter { !$0.description.trimmingCharacters(in: .whitespaces).isEmpty || (Double($0.unitPrice) ?? 0) != 0 }
            .map {
                let name = $0.description.trimmingCharacters(in: .whitespaces)
                return ExpensePayload(description: name.isEmpty ? "Expense" : name, quantity: max($0.quantity, 1),
                                      unitPrice: Double($0.unitPrice.replacingOccurrences(of: ",", with: ".")) ?? 0)
            }
    }

    var previewKey: PreviewKey { PreviewKey(clientId: clientId, days: billable, expenses: parsedExpenses) }

    var counts: (work: Int, travel: Int, dark: Int) {
        let days = billable
        return (days.filter { $0.type == "work" }.count, days.filter { $0.type == "travel" }.count,
                days.filter { $0.type == "dark" }.count)
    }

    /// What a new invoice still needs from your details, said up front; empty once it has it all
    var profileGapText: String {
        guard editing == nil, let profile else { return "" }
        return ProfileGap.describe(profile.gaps)
    }

    /// One thing that stops a save: `message` answers a tap on Save, `short` is what's still to do,
    /// said before the first tap. Listed in the order a person would fix them.
    struct Check {
        let message: String
        let short: String
    }

    var checks: [Check] {
        var list: [Check] = []
        if clientId == nil { list.append(Check(message: "Pick a client: their rates price the invoice.", short: "pick a client")) }
        else if let client, !client.canBill, !sameClient { list.append(Check(message: "This client has no day rate yet.", short: "give the client a day rate")) }
        if showName.trimmingCharacters(in: .whitespaces).isEmpty { list.append(Check(message: "Name the job.", short: "name the job")) }
        if invoiceNumber.trimmingCharacters(in: .whitespaces).isEmpty { list.append(Check(message: "Give it an invoice number.", short: "give it an invoice number")) }
        if billable.isEmpty && parsedExpenses.isEmpty { list.append(Check(message: "Paint at least one day.", short: "paint a day")) }
        if let previewError { list.append(Check(message: previewError, short: "")) }
        if !profileGapText.isEmpty {
            list.append(Check(message: "Add \(profileGapText) to your details.", short: "add \(profileGapText) to your details"))
        }
        return list
    }

    var problems: [String] { checks.map(\.message) }

    /// What's left, for the line under the total once there are days to bill
    var stillToDo: [String] { checks.map(\.short).filter { !$0.isEmpty } }

    /// Where a failed save should take you: the first thing that needs doing
    enum Problem { case client, job, other }

    var firstProblem: Problem {
        if clientId == nil { return .client }
        if showName.trimmingCharacters(in: .whitespaces).isEmpty { return .job }
        return .other
    }

    /// Where the calendar import starts looking: around the days already painted, else the four weeks
    /// before the invoice date
    var importRange: (start: Date, end: Date) {
        let dates = painted.keys.sorted()
        if let first = dates.first.flatMap(DateOnly.parse), let last = dates.last.flatMap(DateOnly.parse) {
            let calendar = Calendar.current
            return (calendar.date(byAdding: .day, value: -7, to: first) ?? first, calendar.date(byAdding: .day, value: 7, to: last) ?? last)
        }
        return (Calendar.current.date(byAdding: .day, value: -28, to: invoiceDate) ?? invoiceDate, invoiceDate)
    }

    /// A job name is only suggested when you haven't typed one
    func addWorkDays(_ dates: [String], suggestedName: String? = nil) {
        painted = CalendarImport.filling(painted, dates: dates)
        if showName.trimmingCharacters(in: .whitespaces).isEmpty, let suggestedName { showName = suggestedName }
    }

    // MARK: Loading

    func load(auth: AuthStore) async {
        guard !loaded else { return }
        do {
            clients = try await auth.api.clients()
            if editing == nil {
                profile = try await auth.api.profile()
                if invoiceNumber.isEmpty { invoiceNumber = try await auth.api.nextInvoiceNumber() }
            }
            loaded = true
            loadError = nil
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            loadError = error.localizedDescription
        }
    }

    /// Read your details again, after they've been edited over this invoice
    func reloadProfile(auth: AuthStore) async {
        guard editing == nil else { return }
        do {
            profile = try await auth.api.profile()
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            // Keep what we had: the notice stays until the server says otherwise
        }
    }

    /// Prices the current days on the server. Run from `.task(id: previewKey)`, so a newer edit
    /// cancels the wait and only the last one asks.
    func refreshPreview(auth: AuthStore) async {
        guard let clientId else { preview = nil; previewError = nil; return }
        try? await Task.sleep(for: .milliseconds(300))
        if Task.isCancelled { return }
        previewing = true
        defer { previewing = false }
        do {
            let result = try await auth.api.preview(PreviewRequest(
                clientId: clientId, invoiceId: editing?.id, days: billable, expenses: parsedExpenses))
            if Task.isCancelled { return }
            preview = result
            previewError = nil
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            if Task.isCancelled { return }
            preview = nil
            previewError = error.localizedDescription
        }
    }

    // MARK: Saving

    /// Returns the saved invoice's id, or nil with `saveError` / `attempted` set
    func save(auth: AuthStore) async -> String? {
        attempted = true
        attempts += 1
        guard problems.isEmpty, let clientId else { return nil }
        saving = true
        saveError = nil
        defer { saving = false }

        let payload = makePayload(clientId: clientId)
        do {
            if let editing {
                try await auth.api.updateInvoice(id: editing.id, payload)
                return editing.id
            }
            return try await auth.api.createInvoice(payload)
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            saveError = error.localizedDescription
        }
        return nil
    }

    private func makePayload(clientId: String) -> InvoicePayload {
        func blank(_ s: String?) -> String? { (s?.isEmpty ?? true) ? nil : s }

        // Your details: a saved invoice keeps its own copy, a new one takes your profile
        let you: (name: String, email: String, a1: String, a2: String?, city: String, state: String?, postal: String,
                  country: String, iban: String, swift: String, acct: String?, sort: String?, bank: String?, dob: String?)
        if let e = editing {
            you = (e.fullName, e.email, e.addressLine1, e.addressLine2, e.city, e.state, e.postalCode, e.country,
                   e.iban, e.swiftBic, e.accountNumber, e.sortCode, e.bankAddress, e.dateOfBirth.map { String($0.prefix(10)) })
        } else {
            let p = profile
            you = (p?.displayName ?? "", p?.email ?? "", p?.addressLine1 ?? "", p?.addressLine2, p?.city ?? "", p?.state,
                   p?.postalCode ?? "", p?.country ?? "", p?.iban ?? "", p?.swiftBic ?? "", p?.accountNumber, p?.sortCode,
                   p?.bankAddress, p?.dateOfBirth.map { String($0.prefix(10)) })
        }

        // The client's details likewise, unless the client changes
        let billedTo: (name: String?, a1: String?, a2: String?, city: String?, state: String?, postal: String?,
                       country: String?, attention: String?)
        if sameClient, let e = editing {
            billedTo = (e.clientName, e.clientAddress1, e.clientAddress2, e.clientCity, e.clientState,
                        e.clientPostalCode, e.clientCountry, e.attentionTo)
        } else {
            let c = client
            billedTo = (c?.name, c?.addressLine1, c?.addressLine2, c?.city, c?.state, c?.postalCode, c?.country, c?.attentionTo)
        }

        return InvoicePayload(
            invoiceNumber: invoiceNumber.trimmingCharacters(in: .whitespaces),
            invoiceDate: DateOnly.isoLocal(invoiceDate),
            showName: showName.trimmingCharacters(in: .whitespaces),
            fullName: you.name, email: you.email, addressLine1: you.a1, addressLine2: blank(you.a2),
            city: you.city, state: blank(you.state), postalCode: you.postal, country: you.country,
            iban: you.iban, swiftBic: you.swift, accountNumber: blank(you.acct), sortCode: blank(you.sort),
            bankAddress: blank(you.bank), dateOfBirth: blank(you.dob), currency: currency,
            clientId: clientId, clientName: blank(billedTo.name), clientAddress1: blank(billedTo.a1),
            clientAddress2: blank(billedTo.a2), clientCity: blank(billedTo.city), clientState: blank(billedTo.state),
            clientPostalCode: blank(billedTo.postal), clientCountry: blank(billedTo.country),
            attentionTo: blank(attention ?? billedTo.attention), notes: blank(notes),
            // The API defaults a missing status to draft; keep what it was
            status: editing?.status ?? .draft,
            days: billable,
            customExpenseEntries: parsedExpenses.enumerated().map { index, e in
                InvoicePayload.Expense(
                    id: "new-\(index)", description: e.description, quantity: e.quantity, unitPrice: e.unitPrice,
                    cost: (Double(e.quantity) * e.unitPrice * 100).rounded() / 100)
            })
    }
}
