import SwiftUI

/// The sign-in screen is always dark: the crew photo and the web app's brand panel
/// are dark, and a light form under a dark photo reads as two screens.
struct SignInView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @ScaledMetric(relativeTo: .title2) private var wordmarkSize: CGFloat = 24
    @ScaledMetric(relativeTo: .largeTitle) private var headlineSize: CGFloat = 32
    #if DEBUG
    @State private var showingServer = false
    #endif
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?
    // Each piece enters once, via withAnimation, so no implicit animation stays attached to the
    // layout (a standing `.animation(value:)` would also animate the keyboard's relayout)
    @State private var heroIn = false
    @State private var brandIn = false
    @State private var pitchIn = false
    @State private var cardIn = false
    @State private var drift = false
    @FocusState private var focus: Field?

    private enum Field { case email, password }

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .top) {
                Color.black.ignoresSafeArea()
                hero(height: proxy.size.height * 0.62)

                ScrollView {
                    VStack(spacing: 0) {
                        brand
                            .padding(.top, proxy.safeAreaInsets.top + 20)
                        Spacer(minLength: 0)
                        pitch
                            .padding(.bottom, 24)
                        formCard(bottomInset: proxy.safeAreaInsets.bottom)
                    }
                    // The scroll view ignores the safe area, so its content must cover it too
                    .frame(
                        width: proxy.size.width,
                        height: nil,
                        alignment: .top
                    )
                    .frame(
                        minHeight: proxy.size.height + proxy.safeAreaInsets.top + proxy.safeAreaInsets.bottom,
                        alignment: .top
                    )
                }
                .onTapGesture { focus = nil }
                .scrollBounceBehavior(.basedOnSize)
                .scrollDismissesKeyboard(.interactively)
                .ignoresSafeArea()
            }
        }
        .preferredColorScheme(.dark)
        #if DEBUG
        .sheet(isPresented: $showingServer) { DevServerView() }
        #endif
        .task {
            guard !reduceMotion else {
                heroIn = true; brandIn = true; pitchIn = true; cardIn = true
                return
            }
            withAnimation(.easeOut(duration: 1.1)) { heroIn = true }
            withAnimation(.spring(response: 0.7, dampingFraction: 0.6).delay(0.15)) { brandIn = true }
            withAnimation(.easeOut(duration: 0.7).delay(0.5)) { pitchIn = true }
            withAnimation(.spring(response: 0.7, dampingFraction: 0.85).delay(0.65)) { cardIn = true }
            drift = true
        }
    }

    // MARK: Hero

    private func hero(height: CGFloat) -> some View {
        // The photo sits in an overlay so its fill size can't widen the layout
        Color.clear
            .frame(maxWidth: .infinity)
            .frame(height: height)
            .overlay {
                Image("CrewHero")
                    .resizable()
                    .scaledToFill()
                    // A slow drift keeps the still photo alive without pulling attention from the form
                    .scaleEffect(drift ? 1.1 : 1.0, anchor: .topTrailing)
                    .animation(.easeInOut(duration: 16).repeatForever(autoreverses: true), value: drift)
            }
            .clipped()
            .overlay {
                LinearGradient(
                    stops: [
                        .init(color: .black.opacity(0.55), location: 0),
                        .init(color: .black.opacity(0.1), location: 0.28),
                        .init(color: .black.opacity(0.7), location: 0.72),
                        .init(color: .black, location: 1),
                    ],
                    startPoint: .top, endPoint: .bottom)
            }
            .ignoresSafeArea()
            .opacity(heroIn ? 1 : 0)
            .accessibilityHidden(true)
    }

    private var brand: some View {
        HStack(spacing: 10) {
            Image("CaleyMark")
                .resizable()
                .scaledToFit()
                .frame(width: 34, height: 34)
                .foregroundStyle(.white)
                .scaleEffect(brandIn ? 1 : 0.8)
                .rotationEffect(.degrees(brandIn ? 0 : -8))
                .opacity(brandIn ? 1 : 0)
            Text("Caley")
                .font(.system(size: wordmarkSize, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .opacity(brandIn ? 1 : 0)
                .offset(x: brandIn ? 0 : -6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 24)
        .accessibilityElement(children: .combine)
        #if DEBUG
        // Developer shortcut, deliberately not a visible control
        .onLongPressGesture(minimumDuration: 1) { showingServer = true }
        #endif
    }

    private var pitch: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Invoicing, built for\nfilm and TV crew.")
                .font(.system(size: headlineSize, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)
            VStack(alignment: .leading, spacing: 8) {
                point("Day rates, overtime and per diems, tracked")
                point("A branded PDF in under a minute")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 24)
        .opacity(pitchIn ? 1 : 0)
        .offset(y: pitchIn ? 0 : 14)
    }

    private func point(_ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Image(systemName: "checkmark").font(.caption.weight(.bold))
            Text(text).font(.subheadline.weight(.medium))
        }
        .foregroundStyle(.white.opacity(0.78))
    }

    // MARK: Form

    private func formCard(bottomInset: CGFloat) -> some View {
        VStack(spacing: 12) {
            TextField("Email", text: $email)
                .textContentType(.username)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focus, equals: .email)
                .submitLabel(.next)
                .onSubmit { focus = .password }
                .fieldStyle(focused: focus == .email)
            SecureField("Password", text: $password)
                .textContentType(.password)
                .focused($focus, equals: .password)
                .submitLabel(.go)
                .onSubmit(submit)
                .fieldStyle(focused: focus == .password)

            if let error {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(Color(red: 1, green: 0.45, blue: 0.42))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                    .accessibilityIdentifier("sign-in-error")
            }

            Button(action: submit) {
                HStack(spacing: 8) {
                    if busy { ProgressView().tint(.white) }
                    Text(busy ? "Signing in…" : "Sign in").fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity, minHeight: 52)
                .foregroundStyle(.white)
                .background(Color.brand.opacity(canSubmit ? 1 : 0.4), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(PressableStyle())
            .disabled(!canSubmit)
            .padding(.top, 4)

            Link("Forgot password?", destination: Config.baseURL.appending(path: "auth/forgot-password"))
                .font(.footnote.weight(.medium))
                .foregroundStyle(.white.opacity(0.7))
                .padding(.top, 4)
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
        .padding(.bottom, max(bottomInset, 16) + 8)
        .frame(maxWidth: .infinity)
        .background(
            UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28, style: .continuous)
                .fill(Color(white: 0.09))
                .overlay(alignment: .top) {
                    UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28, style: .continuous)
                        .strokeBorder(.white.opacity(0.08))
                }
        )
        .offset(y: cardIn ? 0 : 60)
        .opacity(cardIn ? 1 : 0)
    }

    private var canSubmit: Bool { !busy && !email.isEmpty && !password.isEmpty }

    private func submit() {
        guard canSubmit else { return }
        busy = true
        withAnimation(.easeOut(duration: 0.2)) { error = nil }
        focus = nil
        Task {
            defer { busy = false }
            do {
                try await auth.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
            } catch {
                let message = (error as? APIError)?.errorDescription ?? error.localizedDescription
                withAnimation(.easeOut(duration: 0.2)) { self.error = message }
            }
        }
    }
}

private extension View {
    func fieldStyle(focused: Bool) -> some View {
        padding(.horizontal, 16)
            .frame(minHeight: 52)
            .background(.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(focused ? Color.brand : .white.opacity(0.08), lineWidth: focused ? 1.5 : 1)
            }
            .animation(.easeOut(duration: 0.15), value: focused)
    }
}
