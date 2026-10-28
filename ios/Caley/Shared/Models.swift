import Foundation

/// Prisma serialises `Decimal` columns as strings; plain numbers can show up too.
struct Amount: Decodable, Hashable {
    let value: Decimal

    init(_ value: Decimal) { self.value = value }

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let s = try? c.decode(String.self), let d = Decimal(string: s, locale: Locale(identifier: "en_US_POSIX")) {
            value = d
        } else if let d = try? c.decode(Double.self) {
            value = Decimal(d)
        } else {
            throw DecodingError.dataCorruptedError(in: c, debugDescription: "Not an amount")
        }
    }

    var double: Double { NSDecimalNumber(decimal: value).doubleValue }
}

enum InvoiceStatus: String, Codable, CaseIterable, Identifiable {
    case draft, sent, paid, overdue
    var id: String { rawValue }
    var label: String { rawValue.capitalized }
}

/// A row from `GET /api/invoices`.
struct InvoiceListItem: Decodable, Identifiable, Hashable {
    let id: String
    let invoiceNumber: String
    let invoiceDate: String
    let showName: String
    let clientName: String?
    let totalAmount: Amount
    let currency: String?
    var status: InvoiceStatus

    var currencyCode: String { currency ?? "GBP" }
    var date: Date? { DateOnly.parse(invoiceDate) }
}

struct LineItem: Decodable, Hashable {
    let description: String
    let quantity: Int
    let unitPrice: Amount
    let cost: Amount
}

struct OvertimeEntry: Decodable, Hashable {
    let date: String
    let hours: Amount
    let rateType: String
}

struct InvoiceDay: Decodable, Identifiable, Hashable {
    let id: String
    let date: String
    let type: String
    let alsoTravel: String?
    let direction: String?
    let overtimeHours: Amount?
}

/// `GET /api/invoices/[id]`.
struct InvoiceDetail: Decodable, Identifiable {
    let id: String
    let clientId: String?
    /// The terms the invoice was priced under; null on invoices made before days existed
    let terms: Terms?
    let addressLine1: String
    let addressLine2: String?
    let city: String
    let state: String?
    let postalCode: String
    let country: String
    let bankAddress: String?
    let dateOfBirth: String?
    let clientState: String?
    let invoiceNumber: String
    let invoiceDate: String
    let showName: String
    let fullName: String
    let email: String
    let clientName: String?
    let clientAddress1: String?
    let clientAddress2: String?
    let clientCity: String?
    let clientPostalCode: String?
    let clientCountry: String?
    let attentionTo: String?
    let iban: String
    let swiftBic: String
    let accountNumber: String?
    let sortCode: String?
    let currency: String?
    let totalAmount: Amount
    var status: InvoiceStatus
    let notes: String?
    let items: [LineItem]
    let overtimeEntries: [OvertimeEntry]
    let customExpenseEntries: [LineItem]
    let days: [InvoiceDay]

    var currencyCode: String { currency ?? "GBP" }
    var date: Date? { DateOnly.parse(invoiceDate) }
    /// Only invoices built from days can be edited; the rest are locked for life
    var isEditable: Bool { terms != nil }
}

struct Session: Decodable {
    let user: SessionUser
}

struct SessionUser: Decodable {
    let name: String
    let email: String
}


// MARK: Billing terms

struct Terms: Decodable, Hashable {
    struct PerDiem: Decodable, Hashable { let work: Double; let travel: Double }
    struct OvertimeTier: Decodable, Hashable { let tierHours: Double; let firstRate: String; let afterRate: String }
    struct TravelWork: Decodable, Hashable { let bill: String; let perDiem: String }

    let dayRate: Double
    let perDiem: PerDiem
    let overtimeTier: OvertimeTier?
    let travelWork: TravelWork

    /// One line describing how the invoice is priced, shown under the client
    func ruleLine(_ currency: String) -> String {
        func money(_ n: Double) -> String { Decimal(n).money(currency) }
        let tier = overtimeTier.map { "\($0.afterRate.replacingOccurrences(of: "x", with: "×")) after \(Int($0.tierHours))h overtime" }
            ?? "overtime at 1.5×"
        let bill = travelWork.bill == "both" ? "both" : "a \(travelWork.bill) day"
        return [
            "\(money(dayRate)) a day",
            "per diems \(money(perDiem.travel)) travel, \(money(perDiem.work)) work",
            tier,
            "travel + work days bill as \(bill), \(travelWork.perDiem) per diem",
        ].joined(separator: " · ")
    }
}

// MARK: Clients and profile

struct Client: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let addressLine1: String?
    let addressLine2: String?
    let city: String?
    let state: String?
    let postalCode: String?
    let country: String?
    let attentionTo: String?
    let dayRate: Amount?
    let perDiemWork: Amount?
    let perDiemTravel: Amount?
    let overtimeTierHours: Amount?
    let overtimeFirstRate: String?
    let overtimeAfterRate: String?
    let travelWorkBill: String?
    let travelWorkPerDiem: String?

    /// A client prices days only once it has a day rate
    var canBill: Bool { (dayRate?.double ?? 0) > 0 }
}

struct Profile: Decodable {
    let firstName: String?
    let lastName: String?
    let fullName: String?
    let email: String
    let addressLine1: String?
    let addressLine2: String?
    let city: String?
    let state: String?
    let postalCode: String?
    let country: String?
    let dateOfBirth: String?
    let iban: String?
    let swiftBic: String?
    let accountNumber: String?
    let sortCode: String?
    let bankAddress: String?
    let currency: String?

    var displayName: String {
        if let fullName, !fullName.isEmpty { return fullName }
        return [firstName, lastName].compactMap { $0 }.joined(separator: " ").trimmingCharacters(in: .whitespaces)
    }
}

// MARK: Editing

/// A day as the API takes it. `type` is work | travel | dark.
struct BillableDay: Codable, Hashable {
    let date: String
    let type: String
    var alsoTravel: String?
    var direction: String?
    var overtimeHours: Double?
}

struct ExpensePayload: Codable, Hashable {
    let description: String
    let quantity: Int
    let unitPrice: Double
}

struct PreviewRequest: Encodable {
    let clientId: String
    let invoiceId: String?
    let days: [BillableDay]
    let expenses: [ExpensePayload]
}

/// What the server prices a set of days at; the editor shows it and never re-bills.
struct PreviewResult: Decodable {
    let items: [LineItem]
    let overtimeEntries: [OvertimeEntry]
    let customExpenseEntries: [LineItem]
    let totalAmount: Amount
    let terms: Terms
}

struct InvoicePayload: Encodable {
    struct Expense: Encodable {
        let id: String
        let description: String
        let quantity: Int
        let unitPrice: Double
        let cost: Double
    }

    let invoiceNumber: String
    let invoiceDate: String
    let showName: String
    let fullName: String
    let email: String
    let addressLine1: String
    let addressLine2: String?
    let city: String
    let state: String?
    let postalCode: String
    let country: String
    let iban: String
    let swiftBic: String
    let accountNumber: String?
    let sortCode: String?
    let bankAddress: String?
    let dateOfBirth: String?
    let currency: String
    let clientId: String
    let clientName: String?
    let clientAddress1: String?
    let clientAddress2: String?
    let clientCity: String?
    let clientState: String?
    let clientPostalCode: String?
    let clientCountry: String?
    let attentionTo: String?
    let notes: String?
    let status: InvoiceStatus
    let days: [BillableDay]
    let customExpenseEntries: [Expense]
}


/// What the client routes take. Rates go as strings: PUT only accepts strings, and an empty one clears the rate.
struct ClientPayload: Encodable {
    let name: String
    let attentionTo: String
    let addressLine1: String
    let addressLine2: String
    let city: String
    let state: String
    let postalCode: String
    let country: String
    let dayRate: String
    let perDiemWork: String
    let perDiemTravel: String
    /// All three overtime fields or none: a part-filled rule is stored as no rule
    let overtimeTierHours: String
    let overtimeFirstRate: String
    let overtimeAfterRate: String
    let travelWorkBill: String
    let travelWorkPerDiem: String
}

struct ProfilePayload: Encodable {
    let firstName: String
    let lastName: String
    let addressLine1: String
    let addressLine2: String
    let city: String
    let state: String
    let postalCode: String
    let country: String
    /// yyyy-mm-dd; omitted clears it
    let dateOfBirth: String?
    let iban: String
    let swiftBic: String
    let accountNumber: String
    let sortCode: String
    let bankAddress: String
    let currency: String
}
