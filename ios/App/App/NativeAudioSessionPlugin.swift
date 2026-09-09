import AVFoundation
import Capacitor

/**
 * Local Capacitor plugin: native audio session is the source of truth for
 * category, activation, interruptions, and route changes. Web Audio (Tone.js)
 * stays in the WKWebView; JS must not fight this session from iosMediaChannel.
 */
@objc(NativeAudioSessionPlugin)
public class NativeAudioSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeAudioSessionPlugin"
    public let jsName = "NativeAudioSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise)
    ]

    public override func load() {
        activatePlaybackSession()
        observeSessionNotifications()
    }

    @objc func configure(_ call: CAPPluginCall) {
        let active = activatePlaybackSession()
        call.resolve(["active": active])
    }

    @discardableResult
    private func activatePlaybackSession() -> Bool {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
            return true
        } catch {
            return false
        }
    }

    private func observeSessionNotifications() {
        let center = NotificationCenter.default
        center.addObserver(
            self,
            selector: #selector(handleInterruption),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
        center.addObserver(
            self,
            selector: #selector(handleRouteChange),
            name: AVAudioSession.routeChangeNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            notifyListeners("audioSessionEvent", data: [
                "type": "interruption",
                "state": "began"
            ])
        case .ended:
            let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            let shouldResume = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                .contains(.shouldResume)
            _ = activatePlaybackSession()
            notifyListeners("audioSessionEvent", data: [
                "type": "interruption",
                "state": "ended",
                "shouldResume": shouldResume
            ])
        @unknown default:
            break
        }
    }

    @objc private func handleRouteChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

        var reasonName = "other"
        switch reason {
        case .oldDeviceUnavailable:
            reasonName = "oldDeviceUnavailable"
        case .newDeviceAvailable:
            reasonName = "newDeviceAvailable"
        case .categoryChange:
            reasonName = "categoryChange"
        default:
            break
        }

        notifyListeners("audioSessionEvent", data: [
            "type": "routeChange",
            "reason": reasonName
        ])
    }
}
