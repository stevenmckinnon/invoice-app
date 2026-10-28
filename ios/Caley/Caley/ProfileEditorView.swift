import SwiftUI

/// Your own details: they go on every new invoice (an existing invoice keeps its own copy).
struct ProfileEditorView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss

    private static let currencies = [("GBP", "GBP (£)"), ("USD", "USD ($)"), ("EUR", "EUR (€)"), ("CAD", "CAD ($)"), ("AUD", "AUD ($)")]

    @State private var loaded = false
    @State private var loadError: String?
    @State private var email = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var addressLine1 = ""
    @State private var addressLine2 = ""
    @State private var city = ""
    @State private var state = ""
    @State private var postalCode = ""
    @State private var country = ""
    @State private var hasBirthDate = false
    @State private var birthDate = Calendar.current.date(byAdding: .year, value: -30, to: .now) ?? .now
    @State private var iban = ""
    @State private var swiftBic = ""
    @State private var accountNumber = ""
    @State private var sortCode = ""
    @State private var bankAddress = ""
    @State private var currency = "GBP"

    @State private var saving = false
    @State private var attempted = false
    @State private var error: String?

    private var problems: [String] {
        let required = [("first name", firstName), ("last name", lastName), ("address", addressLine1), ("city", city),
                        ("postal code", postalCode), ("country", country), ("IBAN", iban), ("SWIFT / BIC", swiftBic)]
        return required.filter { $0.1.trimmingCharacters(in: .whitespaces).isEmpty }.map { "Add your \($0.0)." }
    }

    var body: some View {
        ScrollView {
            if let loadError {
                EmptyState(title: "Couldn't load your details", message: loadError, symbol: "wifi.exclamationmark")
            } else if !loaded {
                ProgressView().frame(maxWidth: .infinity).padding(.top, 80)
            } else {
                form.readableWidth()
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color.canvas)
        .navigationTitle("Your details")
        .navigationBarTitleDisplayMode(.inline)
        // The save bar takes the bottom edge, so the floating tab bar steps aside
        .toolbar(.hidden, for: .tabBar)
        .safeAreaInset(edge: .bottom) {
            if loaded { SaveBar(title: "Save", busy: saving, action: save) }
        }
        .task { await load() }
    }

    private var form: some View {
        VStack(spacing: 12) {
            CardSection(title: "You", footnote: "Shown on your invoices as the sender. Email is your sign-in.") {
                AdaptiveRow {
                    LabeledField(label: "First name", text: $firstName)
                    LabeledField(label: "Last name", text: $lastName)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Email").font(.caption).foregroundStyle(.secondary)
                    Text(email).foregroundStyle(.secondary)
                }
                Toggle("Add date of birth", isOn: $hasBirthDate)
                if hasBirthDate {
                    DatePicker("Date of birth", selection: $birthDate, in: ...Date.now, displayedComponents: .date)
                }
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

            CardSection(title: "Bank details", footnote: "Printed on every invoice so you can be paid.") {
                LabeledField(label: "IBAN", text: $iban, keyboard: .asciiCapable, capitalization: .characters, monospaced: true)
                LabeledField(label: "SWIFT / BIC", text: $swiftBic, keyboard: .asciiCapable, capitalization: .characters, monospaced: true)
                AdaptiveRow {
                    LabeledField(label: "Account number", text: $accountNumber, keyboard: .numbersAndPunctuation, monospaced: true)
                    LabeledField(label: "Sort code", text: $sortCode, keyboard: .numbersAndPunctuation, monospaced: true)
                }
                LabeledField(label: "Bank address", text: $bankAddress)
            }

            CardSection(title: "Currency", footnote: "New invoices are made in this currency.") {
                Picker("Currency", selection: $currency) {
                    ForEach(Self.currencies, id: \.0) { Text($0.1).tag($0.0) }
                }
                .pickerStyle(.menu)
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

    private func load() async {
        guard !loaded else { return }
        do {
            let p = try await auth.api.profile()
            email = p.email
            firstName = p.firstName ?? ""
            lastName = p.lastName ?? ""
            addressLine1 = p.addressLine1 ?? ""
            addressLine2 = p.addressLine2 ?? ""
            city = p.city ?? ""
            state = p.state ?? ""
            postalCode = p.postalCode ?? ""
            country = p.country ?? ""
            if let dob = p.dateOfBirth { hasBirthDate = true; birthDate = DateOnly.localDate(dob) }
            iban = p.iban ?? ""
            swiftBic = p.swiftBic ?? ""
            accountNumber = p.accountNumber ?? ""
            sortCode = p.sortCode ?? ""
            bankAddress = p.bankAddress ?? ""
            currency = p.currency ?? "GBP"
            loaded = true
        } catch APIError.unauthorized {
            auth.sessionExpired()
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func save() {
        attempted = true
        guard problems.isEmpty else { return }
        saving = true
        error = nil
        let payload = ProfilePayload(
            firstName: firstName.trimmingCharacters(in: .whitespaces), lastName: lastName.trimmingCharacters(in: .whitespaces),
            addressLine1: addressLine1, addressLine2: addressLine2, city: city, state: state, postalCode: postalCode,
            country: country, dateOfBirth: hasBirthDate ? DateOnly.isoLocal(birthDate) : nil,
            iban: iban.trimmingCharacters(in: .whitespaces), swiftBic: swiftBic.trimmingCharacters(in: .whitespaces),
            accountNumber: accountNumber, sortCode: sortCode, bankAddress: bankAddress, currency: currency)
        Task {
            defer { saving = false }
            do {
                try await auth.api.updateProfile(payload)
                Haptics.success()
                dismiss()
            } catch APIError.unauthorized {
                auth.sessionExpired()
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}
