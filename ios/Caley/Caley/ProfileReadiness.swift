import Foundation

/// What an invoice needs from your details: your name, an address, and the bank details it asks the
/// client to pay into. The server refuses an invoice without them, so the editor says so up front
/// (the web editor does the same, with the same list).
enum ProfileGap: CaseIterable {
    case name, address, bank

    fileprivate var phrase: String {
        switch self {
        case .name: "your name"
        case .address: "your address"
        case .bank: "your bank details (IBAN and SWIFT)"
        }
    }

    /// "your address and your bank details (IBAN and SWIFT)"
    static func describe(_ gaps: [ProfileGap]) -> String {
        let parts = gaps.map(\.phrase)
        guard parts.count > 1 else { return parts.first ?? "" }
        return parts.dropLast().joined(separator: ", ") + " and " + parts[parts.count - 1]
    }
}

extension Profile {
    /// Which of the three groups still has something missing
    var gaps: [ProfileGap] {
        func blank(_ value: String?) -> Bool { (value ?? "").trimmingCharacters(in: .whitespaces).isEmpty }
        var gaps: [ProfileGap] = []
        if displayName.isEmpty { gaps.append(.name) }
        // The invoice carries the whole address, so any missing part counts
        if [addressLine1, city, postalCode, country].contains(where: blank) { gaps.append(.address) }
        if [iban, swiftBic].contains(where: blank) { gaps.append(.bank) }
        return gaps
    }
}
