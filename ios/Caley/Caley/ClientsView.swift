import SwiftUI

struct ClientsView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(ClientStore.self) private var store
    @State private var editing: Client?
    @State private var creating = false
    @State private var pendingDelete: Client?

    var body: some View {
        NavigationStack {
            Group {
                if !store.loaded && store.error == nil {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = store.error, !store.loaded {
                    EmptyState(title: "Couldn't load clients", message: error, symbol: "wifi.exclamationmark")
                } else if store.clients.isEmpty {
                    EmptyState(
                        title: "No clients yet",
                        message: "A client's rates price every invoice you make for them. Add one to get started.",
                        symbol: "person.2")
                } else {
                    List(store.clients) { client in
                        Button { editing = client } label: { ClientRow(client: client, currency: store.currency) }
                            .buttonStyle(RowPressStyle())
                            .listRowBackground(Color.clear)
                            .swipeActions(edge: .trailing) {
                                // The app's tint would otherwise turn the destructive action blue
                                Button("Delete", systemImage: "trash", role: .destructive) { pendingDelete = client }
                                    .tint(.red)
                            }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(Color.canvas)
            .navigationTitle("Clients")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { creating = true } label: { Image(systemName: "plus") }
                        .accessibilityLabel("New client")
                }
            }
            .refreshable { await store.load(auth: auth) }
            .task { if !store.loaded { await store.load(auth: auth) } }
            .sheet(isPresented: $creating) {
                ClientEditorView(editing: nil, currency: store.currency) { Task { await store.load(auth: auth) } }
            }
            .sheet(item: $editing) { client in
                ClientEditorView(editing: client, currency: store.currency) { Task { await store.load(auth: auth) } }
            }
            .confirmationDialog(
                pendingDelete.map { "Delete \($0.name)?" } ?? "",
                isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } }),
                titleVisibility: .visible
            ) {
                Button("Delete client", role: .destructive) {
                    if let client = pendingDelete { Task { await store.delete(client, auth: auth) } }
                    pendingDelete = nil
                }
            } message: {
                Text("Invoices you've already made keep their own copy of the client's details and prices.")
            }
            .alert("Couldn't delete", isPresented: Binding(
                get: { store.error != nil && store.loaded }, set: { if !$0 { store.error = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(store.error ?? "")
            }
        }
    }
}

private struct ClientRow: View {
    let client: Client
    let currency: String

    private var summary: String {
        guard client.canBill, let day = client.dayRate else { return "No day rate: can't bill days yet" }
        var parts = ["\(day.money(currency)) a day"]
        if let work = client.perDiemWork?.value, work > 0 { parts.append("\(work.money(currency)) per diem") }
        if client.overtimeTierHours != nil, client.overtimeAfterRate != nil { parts.append("tiered overtime") }
        return parts.joined(separator: " · ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(client.name).font(.subheadline.weight(.semibold))
            Text(summary)
                .font(.caption)
                .foregroundStyle(client.canBill ? Color.secondary : Color.orange)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 6)
        .contentShape(Rectangle())
    }
}
