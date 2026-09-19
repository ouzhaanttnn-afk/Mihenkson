import Capacitor
import StoreKit

/// StoreKit is the only entitlement authority. No save-file/UserDefaults unlock.
@objc(PremiumPlugin)
public class PremiumPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PremiumPlugin"
    public let jsName = "MihenkPremium"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]
    private let productID = "com.mihenkaynak.app.premium.lifetime"
    private var updates: Task<Void, Never>?
    private var busy = false

    public override func load() {
        updates = Task { @MainActor [weak self] in
            for await result in Transaction.updates {
                guard let self = self else { return }
                guard case .verified(let transaction) = result,
                      transaction.productID == self.productID else { continue }
                // Refresh before finishing; revocations remove access too.
                let status = await self.entitlement()
                self.notifyListeners("entitlementChanged", data: status)
                await transaction.finish()
            }
        }
    }

    deinit { updates?.cancel() }

    @MainActor private func entitlement() async -> [String: Any] {
        for await result in Transaction.currentEntitlements {
            if case .unverified(let transaction, _) = result,
               transaction.productID == productID {
                // Neither grant rewards nor serve ads if ownership is unverifiable.
                return ["active": NSNull()]
            }
            if case .verified(let transaction) = result,
               transaction.productID == productID,
               transaction.productType == .nonConsumable,
               transaction.revocationDate == nil {
                return ["active": true]
            }
        }
        return ["active": false]
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        Task { @MainActor in call.resolve(await entitlement()) }
    }

    @objc func getProduct(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [productID]).first,
                      product.type == .nonConsumable else {
                    call.reject("Product unavailable", "UNAVAILABLE"); return
                }
                call.resolve(["id": product.id, "displayPrice": product.displayPrice,
                              "canPurchase": AppStore.canMakePayments])
            } catch { call.reject("Store unavailable", "UNAVAILABLE") }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !busy else { call.reject("Purchase in progress", "BUSY"); return }
            busy = true
            defer { busy = false }
            if (await entitlement())["active"] as? Bool == true {
                call.resolve(["status": "purchased", "active": true]); return
            }
            guard AppStore.canMakePayments else { call.reject("Payments restricted", "RESTRICTED"); return }
            do {
                guard let product = try await Product.products(for: [productID]).first,
                      product.type == .nonConsumable else {
                    call.reject("Product unavailable", "UNAVAILABLE"); return
                }
                switch try await product.purchase() {
                case .success(let verification):
                    guard case .verified(let transaction) = verification,
                          transaction.productID == productID,
                          transaction.revocationDate == nil else {
                        call.reject("Purchase could not be verified", "UNVERIFIED"); return
                    }
                    var status = await entitlement()
                    status["status"] = "purchased"
                    notifyListeners("entitlementChanged", data: status)
                    await transaction.finish()
                    call.resolve(status)
                case .userCancelled: call.resolve(["status": "cancelled"])
                case .pending: call.resolve(["status": "pending"])
                @unknown default: call.reject("Unknown purchase result", "UNAVAILABLE")
                }
            } catch { call.reject("Purchase failed", "PURCHASE_FAILED") }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !busy else { call.reject("Purchase in progress", "BUSY"); return }
            busy = true
            defer { busy = false }
            do {
                // Authentication prompt only after the player presses Restore.
                try await AppStore.sync()
                let status = await entitlement()
                notifyListeners("entitlementChanged", data: status)
                call.resolve(status)
            } catch { call.reject("Restore failed", "RESTORE_FAILED") }
        }
    }
}

class MihenkBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PremiumPlugin())
    }
}
