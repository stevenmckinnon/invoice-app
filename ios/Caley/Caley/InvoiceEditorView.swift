import SwiftUI

/// Builds or edits a day-based invoice: pick a client (their rates price it), name the job, paint
/// the days on a calendar, add expenses. The total comes from the server's `billDays`, so it is
/// what the save stores.
struct InvoiceEditorView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var model: InvoiceEditorModel
    @State private var pickingDate = false
    let onSaved: () -> Void

    init(editing: InvoiceDetail?, copying: InvoiceDetail? = nil, onSaved: @escaping () -> Void) {
        _model = State(initialValue: InvoiceEditorModel(editing: editing, copying: copying))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    if let error = model.loadError {
                        Text(error).font(.footnote).foregroundStyle(.red).frame(maxWidth: .infinity, alignment: .leading)
                    }
                    jobCard
                    daysCard
                    expensesCard
                    notesCard
                    billCard
                    if model.attempted, !model.problems.isEmpty { problemsCard }
                    if let error = model.saveError {
                        Text(error).font(.footnote).foregroundStyle(.red).frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(16)
                .padding(.bottom, 8)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color.canvas)
            .navigationTitle(model.editing.map { "Edit \($0.invoiceNumber)" } ?? "New invoice")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .safeAreaInset(edge: .bottom) { saveBar }
            .sheet(isPresented: $pickingDate) { datePickerSheet }
            .task { await model.load(auth: auth) }
            .task(id: model.previewKey) { await model.refreshPreview(auth: auth) }
        }
        .interactiveDismissDisabled(model.saving)
    }

    // MARK: Cards

    private var jobCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            cardTitle("Job")

            Menu {
                Picker("Client", selection: Binding(get: { model.clientId }, set: { model.clientId = $0 })) {
                    ForEach(model.clients) { client in
                        Text(client.canBill ? client.name : "\(client.name) (no day rate)")
                            .tag(Optional(client.id))
                            .selectionDisabled(!client.canBill)
                    }
                }
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Client").font(.caption).foregroundStyle(.secondary)
                        Text(clientName).foregroundStyle(model.clientId == nil ? .secondary : .primary)
                    }
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down").font(.caption).foregroundStyle(.secondary)
                }
                .padding(12)
                .frame(maxWidth: .infinity)
                .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .tint(.primary)

            if let terms = model.preview?.terms ?? (model.sameClient ? model.editing?.terms : nil) {
                Text(terms.ruleLine(model.currency)).font(.caption).foregroundStyle(.secondary)
            }

            field("Job name", text: $model.showName, prompt: "e.g. WWE: Clash at the Castle")
            AdaptiveRow {
                field("Invoice number", text: $model.invoiceNumber, prompt: "INV-0001")
                dateField
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private var invoiceDateText: String {
        var style = Date.FormatStyle.dateTime.day().month(.abbreviated).year()
        style.locale = Locale(identifier: "en_GB")
        return model.invoiceDate.formatted(style)
    }

    /// Same shape as the text fields; the system's compact picker draws its own grey pill, which
    /// looked out of place beside them. The picker opens in a sheet instead.
    private var dateField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Date").font(.caption).foregroundStyle(.secondary)
            Button { pickingDate = true } label: {
                HStack {
                    Text(invoiceDateText).foregroundStyle(.primary)
                    Spacer(minLength: 8)
                    Image(systemName: "calendar").foregroundStyle(.secondary)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(RowPressStyle())
            .accessibilityLabel("Invoice date, \(invoiceDateText)")
            .accessibilityHint("Opens a calendar")
        }
    }

    private var datePickerSheet: some View {
        NavigationStack {
            DatePicker("Invoice date", selection: $model.invoiceDate, displayedComponents: .date)
                .datePickerStyle(.graphical)
                .labelsHidden()
                .padding(.horizontal)
                .frame(maxHeight: .infinity, alignment: .top)
                .navigationTitle("Invoice date")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { pickingDate = false } } }
        }
        .presentationDetents([.medium])
    }

    private var clientName: String {
        model.client?.name ?? (model.sameClient ? model.editing?.clientName : nil) ?? "Choose a client"
    }

    private var daysCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            cardTitle("Days")

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Brush.allCases) { brush in
                        BrushChip(brush: brush, isSelected: model.brush == brush) { model.brush = brush }
                    }
                }
            }

            DayCalendarView(
                painted: $model.painted, selected: $model.selected,
                brush: model.brush, initialMonth: model.initialMonth)

            Text("Tap a date to paint it. Touch and hold, then drag, to paint a run.")
                .font(.caption).foregroundStyle(.secondary)

            dayDetail

            if !countsSummary.isEmpty {
                Text(countsSummary).font(.subheadline.weight(.medium))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private var countsSummary: String {
        let counts = model.counts
        var parts: [String] = []
        if counts.work > 0 { parts.append("\(counts.work) work") }
        if counts.travel > 0 { parts.append("\(counts.travel) travel") }
        if counts.dark > 0 { parts.append("\(counts.dark) dark") }
        return parts.joined(separator: " · ")
    }

    @ViewBuilder
    private var dayDetail: some View {
        if let date = model.selected, let day = model.painted[date], day.kind == .work {
            VStack(alignment: .leading, spacing: 10) {
                Text(DateOnly.parse(date).map { DateOnly.format($0, .dateTime.weekday(.wide).day().month(.wide)) } ?? date)
                    .font(.subheadline.weight(.semibold))
                Stepper(value: Binding(
                    get: { model.painted[date]?.overtimeHours ?? 0 },
                    set: { model.painted[date]?.overtimeHours = $0 > 0 ? $0 : nil }
                ), in: 0...12, step: 0.5) {
                    Text("Overtime: \((day.overtimeHours ?? 0).formatted()) h").monospacedDigit()
                }
                if day.alsoTravel != nil {
                    Picker("Travel", selection: Binding(
                        get: { model.painted[date]?.alsoTravel ?? .auto },
                        set: { model.painted[date]?.alsoTravel = $0 }
                    )) {
                        Text("Auto").tag(AlsoTravel.auto)
                        Text("Flew in").tag(AlsoTravel.set(.out))
                        Text("Flew home").tag(AlsoTravel.set(.home))
                    }
                    .pickerStyle(.segmented)
                }
            }
            .padding(12)
            .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private var expensesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            cardTitle("Expenses")
            ForEach($model.expenses) { $expense in
                VStack(spacing: 8) {
                    HStack {
                        TextField("What for", text: $expense.description)
                        Button {
                            model.expenses.removeAll { $0.id == expense.id }
                        } label: { Image(systemName: "minus.circle.fill").foregroundStyle(.secondary) }
                            .buttonStyle(PressableStyle())
                            .accessibilityLabel("Remove expense")
                    }
                    AdaptiveRow(alignment: .center) {
                        Stepper("Qty \(expense.quantity)", value: $expense.quantity, in: 1...99)
                            .monospacedDigit()
                        TextField("Price", text: $expense.unitPrice)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(minWidth: 90, minHeight: 44)
                            .accessibilityLabel("Price")
                    }
                    .font(.subheadline)
                }
                .padding(12)
                .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            Button {
                model.expenses.append(.init())
            } label: { Label("Add expense", systemImage: "plus") }
                .font(.subheadline.weight(.medium))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            cardTitle("Notes")
            TextField("Anything the client should know", text: $model.notes, axis: .vertical)
                .lineLimit(2...6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    @ViewBuilder
    private var billCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                cardTitle("Billing")
                if model.previewing { ProgressView().controlSize(.small) }
            }
            if let result = model.preview {
                BillingBreakdown(
                    groups: BillingLines.groups(
                        items: result.items, overtime: result.overtimeEntries,
                        expenses: result.customExpenseEntries, currency: model.currency),
                    total: result.totalAmount.value, currency: model.currency)
            } else if let error = model.previewError {
                Text(error).font(.subheadline).foregroundStyle(.red)
            } else {
                Text(model.clientId == nil ? "Pick a client to price the days." : "Paint some days to see the bill.")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private var problemsCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Before you can save", systemImage: "exclamationmark.circle").font(.subheadline.weight(.semibold))
            ForEach(model.problems, id: \.self) { Text("• \($0)").font(.subheadline) }
        }
        .foregroundStyle(.red)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.red.opacity(0.1), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var saveBar: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 0) {
                Text("Total").font(.caption).foregroundStyle(.secondary)
                Text((model.preview?.totalAmount.value ?? 0).money(model.currency))
                    .font(.title3.weight(.bold)).monospacedDigit()
            }
            Spacer()
            Button {
                Task {
                    if await model.save(auth: auth) != nil {
                        Haptics.success()
                        onSaved()
                        dismiss()
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    if model.saving { ProgressView().tint(.white) }
                    Text(model.editing == nil ? "Save invoice" : "Save changes")
                        .fontWeight(.semibold)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .padding(.horizontal, 22).frame(minHeight: 48)
                .foregroundStyle(.white)
                .background(Color.brand, in: Capsule())
            }
            .buttonStyle(PressableStyle())
            .disabled(model.saving)
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
        .background(.bar)
    }

    // MARK: Pieces

    private func cardTitle(_ text: String) -> some View {
        Text(text).font(.subheadline.weight(.semibold))
    }

    private func field(_ label: String, text: Binding<String>, prompt: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            TextField(prompt, text: text)
                .padding(12)
                .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

private struct BrushChip: View {
    let brush: Brush
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        let fill: Color = isSelected ? brush.tint : Color.primary.opacity(0.06)
        let text: Color = isSelected ? .white : .primary
        Button(action: action) {
            Text(brush.label)
                .font(.subheadline.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .foregroundStyle(text)
                .background(fill, in: Capsule())
        }
        .buttonStyle(PressableStyle())
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
