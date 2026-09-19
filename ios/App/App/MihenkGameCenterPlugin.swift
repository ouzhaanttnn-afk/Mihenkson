import Capacitor
import GameKit

@objc(MihenkGameCenterPlugin)
public class MihenkGameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MihenkGameCenterPlugin"
    public let jsName = "MihenkGameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submit", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "entries", returnType: CAPPluginReturnPromise)
    ]
    private var authenticationPending = false

    @objc func authenticate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if GKLocalPlayer.local.isAuthenticated {
                call.resolve(["authenticated": true]); return
            }
            guard !self.authenticationPending else { call.reject("Authentication in progress"); return }
            self.authenticationPending = true
            GKLocalPlayer.local.authenticateHandler = { [weak self] controller, error in
                DispatchQueue.main.async {
                    if let controller = controller {
                        guard let view = self?.bridge?.viewController else {
                            self?.authenticationPending = false
                            call.reject("View unavailable"); return
                        }
                        view.present(controller, animated: true)
                        return
                    }
                    self?.authenticationPending = false
                    GKLocalPlayer.local.authenticateHandler = nil
                    if let error = error { call.reject(error.localizedDescription); return }
                    call.resolve(["authenticated": GKLocalPlayer.local.isAuthenticated])
                }
            }
        }
    }

    @objc func submit(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated, let id = call.getString("id"), !id.isEmpty,
              let score = call.getInt("score") else { call.reject("Invalid score or player"); return }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [id]) { error in
            if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
        }
    }

    @objc func entries(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated, let id = call.getString("id"), !id.isEmpty else {
            call.reject("Invalid board or player"); return
        }
        GKLeaderboard.loadLeaderboards(IDs: [id]) { boards, error in
            if let error = error { call.reject(error.localizedDescription); return }
            guard let board = boards?.first else { call.reject("Season not configured"); return }
            board.loadEntries(for: .global, timeScope: .allTime, range: NSRange(location: 1, length: 100)) { own, entries, _, error in
                if let error = error { call.reject(error.localizedDescription); return }
                func row(_ entry: GKLeaderboard.Entry) -> [String: Any] {
                    return ["rank": entry.rank, "name": entry.player.displayName, "score": entry.score]
                }
                var result: [String: Any] = ["entries": (entries ?? []).map(row)]
                if let own = own { result["own"] = row(own) } else { result["own"] = NSNull() }
                call.resolve(result)
            }
        }
    }
}

@objc(MihenkBridgeViewController)
class MihenkBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MihenkGameCenterPlugin())
    }
}
