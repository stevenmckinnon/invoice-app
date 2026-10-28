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

    var problems: [String] {
        var list: [String] = []
        if clientId == nil { list.append("Pick a client: their rates price the invoice.") }
        else if let client, !client.canBill, !sameClient { list.append("This client has no day rate yet.") }
        if showName.trimmingCharacters(in: .whitespaces).isEmpty { list.append("Name the job.") }
        if invoiceNumber.trimmingCharacters(in: .whitespaces).isEmpty { list.append("Give it an invoice number.") }
        if billable.isEmpty && parsedExpenses.isEmpty { list.append("Paint at least one day.") }
        if let previewError { list.append(previewError) }
        if editing == nil, let profile,
           profile.displayName.isEmpty || (profile.addressLine1 ?? "").isEmpty
            || (profile.iban ?? "").isEmpty || (profile.swiftBic ?? "").isEmpty {
            list.append("Your profile is missing your address or bank details. Add them on the web first.")
        }
        return list
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

    func addWorkDays(_ dates: [String]) {
        painted = CalendarImport.filling(painted, dates: dates)
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
