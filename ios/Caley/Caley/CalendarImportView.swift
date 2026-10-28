import SwiftUI

/// Pick dates from the phone's calendar to paint as work days. Shows the events in a date range,
/// lets you narrow them by title, and adds the ticked dates that aren't painted yet.
struct CalendarImportView: View {
    let painted: Painted
    let initialStart: Date
    let initialEnd: Date
    let onAdd: (_ dates: [String], _ suggestedName: String?) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var reader = CalendarReader()
    @State private var allowed = false
    @State private var asked = false
    @State private var start: Date
    @State private var end: Date
    @State private var filter = ""
    @State private var events: [CalendarEvent] = []
    @State private var chosen: Set<String> = []
    @State private var choices: [CalendarChoice] = []
    /// Calendars to read; empty means all of them. Remembered, since you usually keep work in one.
    @State private var calendarIDs: Set<String> = Set(UserDefaults.standard.stringArray(forKey: "importCalendarIDs") ?? [])

    init(painted: Painted, start: Date, end: Date, onAdd: @escaping ([String], String?) -> Void) {
        self.painted = painted
        initialStart = start
        initialEnd = end
        self.onAdd = onAdd
        _start = State(initialValue: start)
        _end = State(initialValue: end)
    }

    private var days: [CalendarDay] { CalendarImport.days(from: events, matching: filter) }
    private var fresh: [CalendarDay] { days.filter { painted[$0.date] == nil } }
    private var toAdd: [String] { fresh.map(\.date).filter(chosen.contains) }

    var body: some View {
        NavigationStack {
            Group {
                if allowed { list } else { permission }
            }
            .background(Color.canvas)
            .navigationTitle("Add from calendar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .safeAreaInset(edge: .bottom) { if allowed { addBar } }
        }
        .task {
            allowed = reader.authorized
            if allowed { load() }
        }
        .onChange(of: start) { reload() }
        .onChange(of: end) { reload() }
        .onChange(of: filter) { selectAll() }
    }

    // MARK: Permission

    private var permission: some View {
        VStack(spacing: 14) {
            Image(systemName: "calendar.badge.clock")
                .font(.system(size: 34))
                .foregroundStyle(Color.brand)
                .accessibilityHidden(true)
            Text("Pick work days from your calendar").font(.title3.weight(.semibold))
            Text("Caley reads your events to suggest dates. It never changes your calendar, and nothing leaves your phone except the days you choose.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            if reader.denied {
                Text("Calendar access is off for Caley.").font(.footnote).foregroundStyle(.secondary)
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                }
                .buttonStyle(.borderedProminent)
            } else {
                Button("Allow calendar access") {
                    Task {
                        allowed = await reader.requestAccess()
                        asked = true
                        if allowed { load() }
                    }
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(28)
        .frame(maxWidth: 460)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: List

    private var list: some View {
        List {
            Section {
                if choices.count > 1 { calendarsRow }
                DatePicker("From", selection: $start, in: ...end, displayedComponents: .date)
                DatePicker("To", selection: $end, in: start..., displayedComponents: .date)
                TextField("Only events containing…", text: $filter)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            } footer: {
                Text("Narrow by the job's name to skip dentist appointments and birthdays.")
            }

            Section {
                if days.isEmpty {
                    Text(filter.isEmpty ? "No events in this range." : "No events match.")
                        .foregroundStyle(.secondary)
                }
                ForEach(days) { day in row(day) }
            } header: {
                if !days.isEmpty {
                    HStack {
                        Text("\(days.count) \(days.count == 1 ? "day" : "days") with events")
                        Spacer()
                        if !fresh.isEmpty {
                            Button(toAdd.count == fresh.count ? "Select none" : "Select all") {
                                if toAdd.count == fresh.count { chosen = [] } else { selectAll() }
                            }
                            .textCase(nil)
                        }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
    }

    private func row(_ day: CalendarDay) -> some View {
        let already = painted[day.date] != nil
        let on = chosen.contains(day.date)
        return Button {
            if on { chosen.remove(day.date) } else { chosen.insert(day.date) }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: already ? "checkmark.circle.fill" : on ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(already ? Color.secondary : on ? Color.brand : Color.secondary.opacity(0.5))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(label(day.date)).foregroundStyle(.primary)
                    if !day.titles.isEmpty {
                        Text(day.titles.joined(separator: ", "))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }
                Spacer(minLength: 8)
                if already { Text("Painted").font(.footnote).foregroundStyle(.secondary) }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(already)
        .accessibilityAddTraits(on ? .isSelected : [])
    }

    private var addBar: some View {
        Button {
            let titles = fresh.filter { chosen.contains($0.date) }.flatMap(\.titles)
            onAdd(toAdd, CalendarImport.suggestedName(from: titles))
            dismiss()
        } label: {
            Text(toAdd.isEmpty ? "Add work days" : "Add \(toAdd.count) work \(toAdd.count == 1 ? "day" : "days")")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(toAdd.isEmpty)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.bar)
    }

    // MARK: Helpers

    private func label(_ date: String) -> String {
        DateOnly.parse(date).map { DateOnly.format($0, .dateTime.weekday(.abbreviated).day().month(.abbreviated)) } ?? date
    }

    private func load() {
        choices = reader.calendars()
        // A remembered calendar that has since gone shouldn't leave you reading nothing
        calendarIDs = calendarIDs.intersection(choices.map(\.id))
        reload()
    }

    private func reload() {
        events = reader.events(from: start, to: end, only: calendarIDs)
        selectAll()
    }

    /// Which calendars to read. Keeping work in one calendar makes the list only your work.
    private var calendarsRow: some View {
        Menu {
            Button { setCalendars([]) } label: {
                Label("All calendars", systemImage: calendarIDs.isEmpty ? "checkmark" : "")
            }
            Divider()
            ForEach(choices) { choice in
                Button { toggle(choice.id) } label: {
                    Label(choice.account.isEmpty || choice.account == choice.title ? choice.title : "\(choice.title) · \(choice.account)",
                          systemImage: calendarIDs.contains(choice.id) ? "checkmark" : "")
                }
            }
        } label: {
            HStack {
                Text("Calendars").foregroundStyle(.primary)
                Spacer()
                Text(calendarSummary).foregroundStyle(.secondary).lineLimit(1)
                Image(systemName: "chevron.up.chevron.down").font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private var calendarSummary: String {
        if calendarIDs.isEmpty { return "All" }
        let names = choices.filter { calendarIDs.contains($0.id) }.map(\.title)
        return names.count == 1 ? names[0] : "\(names.count) calendars"
    }

    private func toggle(_ id: String) {
        var next = calendarIDs
        if next.contains(id) { next.remove(id) } else { next.insert(id) }
        setCalendars(next)
    }

    private func setCalendars(_ ids: Set<String>) {
        calendarIDs = ids
        UserDefaults.standard.set(Array(ids), forKey: "importCalendarIDs")
        reload()
    }

    private func selectAll() {
        chosen = Set(fresh.map(\.date))
    }
}
