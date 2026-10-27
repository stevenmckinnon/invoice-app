import SwiftUI

/// A Monday-first month grid you paint with a brush. Tap a date to paint it (tap a date the brush
/// already matches to erase it); touch and hold, then drag, to paint a run. A plain swipe still
/// scrolls the page.
struct DayCalendarView: View {
    @Binding var painted: Painted
    @Binding var selected: String?
    let brush: Brush

    @State private var year: Int
    @State private var month: Int // 0-based
    @State private var erasing: Bool?
    @State private var lastStroked: String?

    @ScaledMetric(relativeTo: .subheadline) private var cellHeight: CGFloat = 46
    private let spacing: CGFloat = 4
    private let weekdays = ["M", "T", "W", "T", "F", "S", "S"]

    init(painted: Binding<Painted>, selected: Binding<String?>, brush: Brush, initialMonth: String) {
        _painted = painted
        _selected = selected
        self.brush = brush
        let parts = initialMonth.prefix(10).split(separator: "-").compactMap { Int($0) }
        _year = State(initialValue: parts.first ?? 2026)
        _month = State(initialValue: parts.count > 1 ? parts[1] - 1 : 0)
    }

    private var cells: [String] { DateOnly.monthGrid(year: year, month: month) }
    private var rows: Int { cells.count / 7 }
    private var gridHeight: CGFloat { CGFloat(rows) * cellHeight + CGFloat(max(rows - 1, 0)) * spacing }
    private var monthTitle: String {
        DateOnly.parse(String(format: "%04d-%02d-01", year, month + 1))
            .map { DateOnly.format($0, .dateTime.month(.wide).year()) } ?? ""
    }

    var body: some View {
        VStack(spacing: 10) {
            HStack {
                Button { step(-1) } label: { Image(systemName: "chevron.left").frame(width: 44, height: 44).contentShape(Rectangle()) }
                    .accessibilityLabel("Previous month")
                Spacer()
                Text(monthTitle).font(.headline)
                Spacer()
                Button { step(1) } label: { Image(systemName: "chevron.right").frame(width: 44, height: 44).contentShape(Rectangle()) }
                    .accessibilityLabel("Next month")
            }

            HStack(spacing: spacing) {
                ForEach(Array(weekdays.enumerated()), id: \.offset) { _, d in
                    Text(d).font(.caption2.weight(.semibold)).foregroundStyle(.secondary).frame(maxWidth: .infinity)
                }
            }

            GeometryReader { proxy in
                let cellWidth = (proxy.size.width - spacing * 6) / 7
                VStack(spacing: spacing) {
                    ForEach(0..<rows, id: \.self) { row in
                        HStack(spacing: spacing) {
                            ForEach(0..<7, id: \.self) { col in
                                let date = cells[row * 7 + col]
                                DayCell(
                                    date: date, day: painted[date],
                                    inMonth: Int(date.dropFirst(5).prefix(2)) == month + 1,
                                    isSelected: selected == date
                                )
                                .frame(width: cellWidth, height: cellHeight)
                                .onTapGesture { tap(date) }
                            }
                        }
                    }
                }
                .contentShape(Rectangle())
                .gesture(
                    LongPressGesture(minimumDuration: 0.25)
                        .sequenced(before: DragGesture(minimumDistance: 0))
                        .onChanged { value in
                            guard case .second(true, let drag?) = value else { return }
                            stroke(at: drag.location, cellWidth: cellWidth)
                        }
                        .onEnded { _ in
                            erasing = nil
                            lastStroked = nil
                        }
                )
            }
            .frame(height: gridHeight)
        }
        // Seven columns have a fixed width, so the grid stops growing before dates stop fitting
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    }

    private func step(_ delta: Int) {
        var m = month + delta, y = year
        if m < 0 { m = 11; y -= 1 } else if m > 11 { m = 0; y += 1 }
        month = m
        year = y
    }

    private func tap(_ date: String) {
        painted = DayEditor.applyStroke(painted, date: date, brush: brush, erasing: DayEditor.matches(painted[date], brush))
        selected = date
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func stroke(at point: CGPoint, cellWidth: CGFloat) {
        let col = Int(point.x / (cellWidth + spacing))
        let row = Int(point.y / (cellHeight + spacing))
        guard (0..<7).contains(col), (0..<rows).contains(row) else { return }
        let date = cells[row * 7 + col]
        guard date != lastStroked else { return }
        lastStroked = date
        // The first date decides whether this stroke paints or erases
        let isErasing = erasing ?? DayEditor.matches(painted[date], brush)
        erasing = isErasing
        let next = DayEditor.applyStroke(painted, date: date, brush: brush, erasing: isErasing)
        if next != painted {
            painted = next
            UISelectionFeedbackGenerator().selectionChanged()
        }
        selected = date
    }
}

extension PaintKind {
    var tint: Color {
        switch self {
        case .work: .brand
        case .travel: .orange
        case .dark: .indigo
        case .off: .gray
        }
    }
}

private struct DayCell: View {
    let date: String
    let day: PaintedDay?
    let inMonth: Bool
    let isSelected: Bool

    private var isToday: Bool { date == DateOnly.isoLocal(.now) }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10, style: .continuous).fill(fill)
            if day?.kind == .off {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .strokeBorder(.secondary.opacity(0.5), style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
            }
            Text(String(Int(date.suffix(2)) ?? 0))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(textColor)
                .monospacedDigit()
            if day?.alsoTravel != nil {
                Image(systemName: "airplane")
                    .font(.system(size: 8, weight: .bold).leading(.tight))
                    .foregroundStyle(.white.opacity(0.9))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                    .padding(4)
            }
            if let hours = day?.overtimeHours, hours > 0 {
                Text("+\(hours.formatted())h")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.white.opacity(0.9))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                    .padding(.bottom, 3)
            }
            if isToday && day == nil {
                Circle().fill(Color.brand).frame(width: 4, height: 4)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom).padding(.bottom, 4)
            }
        }
        .overlay {
            if isSelected {
                RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color.primary, lineWidth: 2)
            }
        }
        .opacity(inMonth ? 1 : 0.35)
        .contentShape(Rectangle())
        .accessibilityElement()
        .accessibilityLabel(accessibilityLabel)
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
    }

    private var fill: Color {
        guard let day, day.kind != .off else { return Color.primary.opacity(0.05) }
        return day.kind.tint
    }

    private var textColor: Color {
        guard let day, day.kind != .off else { return .primary }
        return .white
    }

    private var accessibilityLabel: String {
        let when = DateOnly.parse(date).map { DateOnly.format($0, .dateTime.weekday(.wide).day().month(.wide)) } ?? date
        guard let day else { return "\(when), no day" }
        let what: String = switch day.kind {
        case .work: day.alsoTravel != nil ? "work and travel" : "work"
        case .travel: "travel"
        case .dark: "dark day"
        case .off: "off"
        }
        return "\(when), \(what)"
    }
}
