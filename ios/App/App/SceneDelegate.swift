import UIKit
import Capacitor

final class FullScreenBridgeViewController: CAPBridgeViewController {
    // Tam ekran oyunlarda iOS'un altındaki ayrı sistem bandı görünmesin;
    // home indicator gerektiğinde dokunuşla geri gelir.
    override var prefersHomeIndicatorAutoHidden: Bool {
        return true
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let shellColor = UIColor(red: 11.0 / 255.0, green: 15.0 / 255.0, blue: 20.0 / 255.0, alpha: 1.0)
        let bridgeViewController = FullScreenBridgeViewController()
        bridgeViewController.view.backgroundColor = shellColor

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = shellColor
        window?.rootViewController = bridgeViewController
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
