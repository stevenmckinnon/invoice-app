import SwiftUI

/// Pencils and the jobs they became, by month: the web's Diary. A pencil can be edited, released
/// (a 1st moves the 2nds on its dates up) or confirmed, which opens the invoice editor with its dates
/// painted as work days; saving that invoice links the two. Pencils never count as money.
struct DiaryView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(InvoiceStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var holds: [Hold] = []
    @State private var loaded = false
    @State private var error: String?
    @State private var editing: PencilTarget?
    @State private var confirming: Hold?
    @State private var releasing: Hold?
    @State private var notice: String?

    /// The pencil form's subject: a new one, or one being changed
    struct PencilTarget: Identifiable {
        let hold: Hold?
        var id: String { hold?.id ?? "new" }
    }

    private var clashes: [String: [Hold]] { HoldRules.clashes(holds) }

    /// By the month each starts in, soonest first; jobs that have ended drop to the bottom
    private var months: [(title: String, holds: [Hold])] {
        let today = DateOnly.isoLocal(.now)
        let current = holds.filter { ($0.dates.last ?? "") >= today }
        let past = holds.filter { ($0.dates.last ?? "") < today }
        var groups: [(String, [Hold])] = []
        for hold in current {
            let title = DateOnly.parse(hold.dates.first ?? "")
                .map { DateOnly.format($0, .dateTime.month(.wide).year()) } ?? ""
            if groups.last?.0 == title { groups[groups.count - 1].1.append(hold) } else { groups.append((title, [hold])) }
        }
        if !past.isEmpty { groups.append(("Done", past.reversed())) }
        return groups.map { (title: $0.0, holds: $0.1) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if !loaded && error == nil {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error, !loaded {
                    EmptyState(title: "Couldn't load your diary", message: error, symbol: "wifi.exclamationmark")
                } else if holds.isEmpty {
                    EmptyState(title: "Nothing pencilled",
                               message: "Pencil a job when you're asked to hold dates, and confirm it into an invoice once it's yours.",
                               symbol: "calendar")
                } else {
                    list
                }
            }
            .background(Color.canvas)
            .navigationTitle("Diary")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: String.self) { InvoiceDetailView(id: $0) }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
                ToolbarItem(placement: .primaryAction) {
                    Button { editing = PencilTarget(hold: nil) } label: { Image(systemName: "plus") }
                        .accessibilityLabel("New pencil")
                }
            }
            .safeAreaInset(edge: .bottom) {
                if let notice {
                    Text(notice)
                        .font(.footnote.weight(.medium))
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .background(.regularMaterial, in: Capsule())
                        .padding(.bottom, 8)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                        .accessibilityAddTraits(.updatesFrequently)
                }
            }
            .refreshable { await load() }
            .task { await load() }
            .sheet(item: $editing) { target in
                PencilEditorView(editing: target.hold, holds: holds) { Task { await load() } }
            }
            .sheet(item: $confirming) { hold in
                InvoiceEditorView(editing: nil, fromHold: hold) {
                    Task {
                        await load()
                        await store.load(auth: auth)
                    }
                }
            }
            .confirmationDialog(releasing.map { "Release \($0.showName)?" } ?? "", isPresented: Binding(
                get: { releasing != nil }, set: { if !$0 { releasing = nil } }
            ), titleVisibility: .visible, presenting: releasing) { hold in
                Button("Release", role: .destructive) { Task { await release(hold) } }
                Button("Keep it", role: .cancel) {}
            } message: { hold in
                let moves = HoldRules.promoted(byReleasing: hold, in: holds).map(\.showName)
                Text("Its dates (\(HoldRules.rangeLabel(hold.dates))) are free again."
                     + (moves.isEmpty ? "" : " \(moves.joined(separator: " and ")) \(moves.count == 1 ? "moves" : "move") up to 1st pencil."))
            }
        }
    }

    private var list: some View {
        List {
            ForEach(months, id: \.title) { month in
                Section(month.title) {
                    ForEach(month.holds) { hold in row(hold) }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
    }

    @ViewBuilder
    private func row(_ hold: Hold) -> some View {
        let clashWith = clashes[hold.id]
        let detail = VStack(alignment: .leading, spacing: 3) {
            Text(hold.showName).font(.body.weight(.semibold))
            Text("\(hold.client.name) · \(HoldRules.rangeLabel(hold.dates)) · \(hold.dates.count) day\(hold.dates.count == 1 ? "" : "s")")
                .font(.subheadline).foregroundStyle(.secondary)
            if let clashWith {
                Text("Clashes with " + clashWith.map { $0.showName + ($0.isPencilled ? "" : " (confirmed)") }.joined(separator: " and "))
                    .font(.footnote.weight(.medium)).foregroundStyle(.orange)
            }
        }
        if hold.isPencilled {
            HStack(alignment: .center, spacing: 12) {
                Button { editing = PencilTarget(hold: hold) } label: {
                    detail.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityHint("Edits the pencil")
                VStack(alignment: .trailing, spacing: 8) {
                    Text(hold.rank == 1 ? "1st" : "2nd")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .foregroundStyle(clashWith == nil ? Color.secondary : Color.orange)
                        .background((clashWith == nil ? Color.primary : Color.orange).opacity(0.1), in: Capsule())
                        .accessibilityLabel(hold.rank == 1 ? "1st pencil" : "2nd pencil")
                    Button("Confirm") { confirming = hold }
                        .font(.subheadline.weight(.semibold))
                        .buttonStyle(.borderedProminent)
                        .tint(.brand)
                }
            }
            .swipeActions {
                Button("Release", role: .destructive) { releasing = hold }
            }
        } else if let invoice = hold.invoice {
            NavigationLink(value: invoice.id) {
                HStack {
                    detail
                    Spacer()
                    Text(invoice.invoiceNumber).font(.subheadline.monospaced()).foregroundStyle(.secondary)
                }
            }
        }
    }

    private func load() async {
        do {
            holds = try await auth.api.holds()
            error = nil
            loaded = true
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func release(_ hold: Hold) async {
        let moves = HoldRules.promoted(byReleasing: hold, in: holds).map(\.showName)
        do {
            _ = try await auth.api.releaseHold(id: hold.id)
            Haptics.success()
            await load()
            show(moves.isEmpty
                 ? "\(hold.showName) released."
                 : "\(hold.showName) released. \(moves.joined(separator: " and ")) moved up to 1st.")
        } catch {
            Haptics.failure()
            show(error.localizedDescription)
        }
    }

    private func show(_ text: String) {
        withAnimation { notice = text }
        Task {
            try? await Task.sleep(for: .seconds(4))
            withAnimation { if notice == text { notice = nil } }
        }
    }
}

/// New pencil or edit one: client, job, 1st or 2nd, and the dates (the system's multi-date picker)
struct PencilEditorView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(ClientStore.self) private var clientStore
    @Environment(\.dismiss) private var dismiss
    let editing: Hold?
    let holds: [Hold]
    let onSaved: () -> Void

    @State private var clientId: String?
    @State private var showName: String
    @State private var rank: Int
    @State private var dates: Set<DateComponents>
    @State private var attempted = false
    @State private var saving = false
    @State private var error: String?

    init(editing: Hold?, holds: [Hold], onSaved: @escaping () -> Void) {
        self.editing = editing
        self.holds = holds
        self.onSaved = onSaved
        _clientId = State(initialValue: editing?.client.id)
        _showName = State(initialValue: editing?.showName ?? "")
        _rank = State(initialValue: editing?.rank ?? 1)
        _dates = State(initialValue: Set((editing?.dates ?? []).compactMap(Self.components)))
    }

    /// A calendar date as the picker holds it: year, month and day in the Gregorian calendar
    private static func components(_ iso: String) -> DateComponents? {
        let n = iso.split(separator: "-").compactMap { Int($0) }
        guard n.count == 3 else { return nil }
        return DateComponents(calendar: Calendar(identifier: .gregorian), year: n[0], month: n[1], day: n[2])
    }

    private var isoDates: [String] {
        dates.compactMap { c in
            guard let y = c.year, let m = c.month, let d = c.day else { return nil }
            return String(format: "%04d-%02d-%02d", y, m, d)
        }.sorted()
    }

    /// Dates another hold already has, said under the picker so a clash is no surprise
    private var overlap: [String] {
        let others = Set(holds.filter { $0.id != editing?.id }.flatMap(\.dates))
        return isoDates.filter(others.contains)
    }

    private var problems: [String] {
        var list: [String] = []
        if clientId == nil { list.append("Pick a client.") }
        if showName.trimmingCharacters(in: .whitespaces).isEmpty { list.append("Name the job.") }
        if dates.isEmpty { list.append("Pick at least one date.") }
        return list
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    if attempted, !problems.isEmpty {
                        Text(problems.joined(separator: " ")).font(.subheadline).foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if let error {
                        Text(error).font(.subheadline).foregroundStyle(.red).frame(maxWidth: .infinity, alignment: .leading)
                    }
                    CardSection(title: "Job") {
                        // Labelled like the job name field below it
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Client").font(.caption).foregroundStyle(.secondary)
                            Picker("Client", selection: $clientId) {
                                Text("Choose a client").tag(String?.none)
                                ForEach(clientStore.clients) { Text($0.name).tag(String?.some($0.id)) }
                            }
                            .pickerStyle(.menu)
                            .labelsHidden()
                        }
                        LabeledField(label: "Job name", text: $showName, prompt: "Triplemania 35")
                    }
                    CardSection(title: "Pencil", footnote: rank == 1
                                ? "You have first refusal on these dates."
                                : "Next in line: someone else holds a 1st. It moves up if theirs is released.") {
                        Picker("Pencil", selection: $rank) {
                            Text("1st pencil").tag(1)
                            Text("2nd pencil").tag(2)
                        }
                        .pickerStyle(.segmented)
                    }
                    CardSection(title: "Dates", footnote: datesFootnote) {
                        MultiDatePicker("Dates", selection: $dates)
                            .tint(.brand)
                    }
                }
                .padding(16)
                .readableWidth()
            }
            .background(Color.canvas)
            .navigationTitle(editing == nil ? "New pencil" : "Edit pencil")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .safeAreaInset(edge: .bottom) {
                SaveBar(title: editing == nil ? "Pencil in" : "Save pencil", busy: saving) { Task { await save() } }
            }
            .task { if !clientStore.loaded { await clientStore.load(auth: auth) } }
        }
    }

    private var datesFootnote: String {
        guard !dates.isEmpty else { return "Tap each date the job holds." }
        let base = "\(dates.count) date\(dates.count == 1 ? "" : "s"): \(HoldRules.rangeLabel(isoDates))."
        return overlap.isEmpty ? base : base + " Another pencil has \(HoldRules.rangeLabel(overlap))."
    }

    private func save() async {
        attempted = true
        guard problems.isEmpty, let clientId else { return }
        saving = true
        defer { saving = false }
        let payload = HoldPayload(clientId: clientId, showName: showName.trimmingCharacters(in: .whitespaces),
                                  dates: isoDates, rank: rank)
        do {
            if let editing { try await auth.api.updateHold(id: editing.id, payload) } else { try await auth.api.createHold(payload) }
            Haptics.success()
            onSaved()
            dismiss()
        } catch {
            Haptics.failure()
            self.error = error.localizedDescription
        }
    }
}
