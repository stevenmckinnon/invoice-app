import SwiftUI

/// Create or edit a client. A client's rates never vary by job, so there are no rate fields on an
/// invoice: everything is priced from what's set here.
struct ClientEditorView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss

    let editing: Client?
    let currency: String
    let onSaved: () -> Void

    @State private var name: String
    @State private var attentionTo: String
    @State private var addressLine1: String
    @State private var addressLine2: String
    @State private var city: String
    @State private var state: String
    @State private var postalCode: String
    @State private var country: String
    @State private var dayRate: String
    @State private var perDiemWork: String
    @State private var perDiemTravel: String
    @State private var tiered: Bool
    @State private var tierHours: String
    @State private var firstRate: String
    @State private var afterRate: String
    @State private var travelWorkBill: String
    @State private var travelWorkPerDiem: String

    @State private var saving = false
    @State private var attempted = false
    @State private var error: String?

    init(editing: Client?, currency: String, onSaved: @escaping () -> Void) {
        self.editing = editing
        self.currency = currency
        self.onSaved = onSaved
        func text(_ amount: Amount?) -> String { amount.map { "\($0.value)" } ?? "" }
        _name = State(initialValue: editing?.name ?? "")
        _attentionTo = State(initialValue: editing?.attentionTo ?? "")
        _addressLine1 = State(initialValue: editing?.addressLine1 ?? "")
        _addressLine2 = State(initialValue: editing?.addressLine2 ?? "")
        _city = State(initialValue: editing?.city ?? "")
        _state = State(initialValue: editing?.state ?? "")
        _postalCode = State(initialValue: editing?.postalCode ?? "")
        _country = State(initialValue: editing?.country ?? "")
        _dayRate = State(initialValue: text(editing?.dayRate))
        _perDiemWork = State(initialValue: text(editing?.perDiemWork))
        _perDiemTravel = State(initialValue: text(editing?.perDiemTravel))
        // A rule only exists with all three parts, as the server reads it
        let hasTier = editing?.overtimeTierHours != nil && editing?.overtimeFirstRate != nil && editing?.overtimeAfterRate != nil
        _tiered = State(initialValue: hasTier)
        _tierHours = State(initialValue: hasTier ? text(editing?.overtimeTierHours) : "2")
        _firstRate = State(initialValue: editing?.overtimeFirstRate ?? "1.5x")
        _afterRate = State(initialValue: editing?.overtimeAfterRate ?? "2x")
        _travelWorkBill = State(initialValue: editing?.travelWorkBill ?? "both")
        _travelWorkPerDiem = State(initialValue: editing?.travelWorkPerDiem ?? "travel")
    }

    private var symbol: String {
        Decimal(0).money(currency).replacingOccurrences(of: "[0-9.,\\s]", with: "", options: .regularExpression)
    }

    private func number(_ s: String) -> Double? { Double(s.replacingOccurrences(of: ",", with: ".")) }

    private var problems: [String] {
        var list: [String] = []
        if name.trimmingCharacters(in: .whitespaces).isEmpty { list.append("Give the client a name.") }
        for (label, value) in [("day rate", dayRate), ("work per diem", perDiemWork), ("travel per diem", perDiemTravel)]
        where !value.isEmpty && (number(value) ?? -1) < 0 {
            list.append("The \(label) isn't a number.")
        }
        if tiered, (number(tierHours) ?? 0) <= 0 { list.append("Set how many overtime hours a day the first rate covers.") }
        return list
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    CardSection(title: "Client") {
                        LabeledField(label: "Name", text: $name, prompt: "e.g. Mallard Productions")
                        LabeledField(label: "Attention to", text: $attentionTo, prompt: "Optional")
                    }

                    CardSection(title: "Address") {
                        LabeledField(label: "Address line 1", text: $addressLine1)
                        LabeledField(label: "Address line 2", text: $addressLine2)
                        AdaptiveRow {
                            LabeledField(label: "City", text: $city)
                            LabeledField(label: "State / county", text: $state)
                        }
                        AdaptiveRow {
                            LabeledField(label: "Postal code", text: $postalCode, capitalization: .characters)
                            LabeledField(label: "Country", text: $country)
                        }
                    }

                    CardSection(
                        title: "Rates",
                        footnote: "Every invoice for this client is priced from these. Changing them later doesn't re-price invoices you've already made."
                    ) {
                        LabeledField(label: "Day rate (\(symbol))", text: $dayRate, prompt: "0.00", keyboard: .decimalPad)
                        AdaptiveRow {
                            LabeledField(label: "Work per diem", text: $perDiemWork, prompt: "0.00", keyboard: .decimalPad)
                            LabeledField(label: "Travel per diem", text: $perDiemTravel, prompt: "0.00", keyboard: .decimalPad)
                        }
                    }

                    CardSection(
                        title: "Overtime",
                        footnote: tiered
                            ? "Overtime is a tenth of the day rate an hour. The tier applies per day, not per job."
                            : "Without a tier, all overtime bills at 1.5×."
                    ) {
                        Toggle("Higher rate after some hours", isOn: $tiered)
                        if tiered {
                            LabeledField(label: "Hours a day at the first rate", text: $tierHours, prompt: "2", keyboard: .decimalPad)
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Those hours at").font(.caption).foregroundStyle(.secondary)
                                Picker("First rate", selection: $firstRate) {
                                    Text("1.5×").tag("1.5x"); Text("2×").tag("2x")
                                }.pickerStyle(.segmented)
                            }
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Hours after that at").font(.caption).foregroundStyle(.secondary)
                                Picker("After rate", selection: $afterRate) {
                                    Text("1.5×").tag("1.5x"); Text("2×").tag("2x")
                                }.pickerStyle(.segmented)
                            }
                        }
                    }

                    CardSection(title: "A day with work and travel", footnote: "For days you flew in and worked, or wrapped and flew home.") {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Bills as").font(.caption).foregroundStyle(.secondary)
                            Picker("Bills as", selection: $travelWorkBill) {
                                Text("Work + travel").tag("both"); Text("Work only").tag("work"); Text("Travel only").tag("travel")
                            }.pickerStyle(.segmented)
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            Text("With a").font(.caption).foregroundStyle(.secondary)
                            Picker("Per diem", selection: $travelWorkPerDiem) {
                                Text("Travel per diem").tag("travel"); Text("Work per diem").tag("work")
                            }.pickerStyle(.segmented)
                        }
                    }

                    if attempted, !problems.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(problems, id: \.self) { Text("• \($0)").font(.subheadline) }
                        }
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if let error { Text(error).font(.footnote).foregroundStyle(.red).frame(maxWidth: .infinity, alignment: .leading) }
                }
                .padding(16)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color.canvas)
            .navigationTitle(editing == nil ? "New client" : "Edit client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .safeAreaInset(edge: .bottom) { SaveBar(title: editing == nil ? "Add client" : "Save changes", busy: saving, action: save) }
        }
        .interactiveDismissDisabled(saving)
    }

    private func save() {
        attempted = true
        guard problems.isEmpty else { return }
        saving = true
        error = nil
        let payload = ClientPayload(
            name: name.trimmingCharacters(in: .whitespaces), attentionTo: attentionTo, addressLine1: addressLine1,
            addressLine2: addressLine2, city: city, state: state, postalCode: postalCode, country: country,
            dayRate: dayRate.replacingOccurrences(of: ",", with: "."),
            perDiemWork: perDiemWork.replacingOccurrences(of: ",", with: "."),
            perDiemTravel: perDiemTravel.replacingOccurrences(of: ",", with: "."),
            overtimeTierHours: tiered ? tierHours.replacingOccurrences(of: ",", with: ".") : "",
            overtimeFirstRate: tiered ? firstRate : "", overtimeAfterRate: tiered ? afterRate : "",
            travelWorkBill: travelWorkBill, travelWorkPerDiem: travelWorkPerDiem)
        Task {
            defer { saving = false }
            do {
                if let editing { try await auth.api.updateClient(id: editing.id, payload) }
                else { try await auth.api.createClient(payload) }
                Haptics.success()
                onSaved()
                dismiss()
            } catch APIError.unauthorized {
                auth.sessionExpired()
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}
