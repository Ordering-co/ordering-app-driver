import Foundation

/// What happens to a position the platform says is simulated (`isSimulatedBySoftware`).
///
/// - Release builds always drop it, whatever `rejectMock` says (the owner's rule; not configurable).
/// - Debug builds, `rejectMock == false` (the default): it is accepted and sent **as a real one**
///   (the body has no `mock` key at all, so nothing tells the server it was simulated; otherwise a developer
///   could not see simulator positions); the accepted-location event keeps telling the truth (`mock == true`).
/// - Debug builds, `rejectMock == true`: dropped like release, so the production behaviour can be tried in debug.
/// - A position that is not simulated is never affected.
public struct MockPolicy: Equatable {
    public enum Decision: Equatable {
        /// Queue and send it exactly as it is (not simulated).
        case accept(LocationFix)
        /// Simulated, debug build, `rejectMock == false`: queue and send it with `mock == false`; the associated
        /// fix is the original (`mock == true`) that the event reports.
        case acceptAsReal(LocationFix)
        /// Drop it before the queue and report `mock_rejected`.
        case reject
    }

    public let isReleaseBuild: Bool

    /// - Parameter isReleaseBuild: injected by the caller (`#if DEBUG` in the app target).
    public init(isReleaseBuild: Bool) {
        self.isReleaseBuild = isReleaseBuild
    }

    /// - Parameter rejectMock: `Config.rejectMock` (only matters in debug builds).
    public func evaluate(_ fix: LocationFix, rejectMock: Bool = false) -> Decision {
        guard fix.mock else { return .accept(fix) }
        if isReleaseBuild || rejectMock { return .reject }
        return .acceptAsReal(fix)
    }
}
