import { registerRootComponent } from "expo";
import { setBackgroundMessageHandler } from "./src/services/notificationService";
import { I18nManager } from "react-native";
import { registerGlobals } from "livekit-react-native";

// Force RTL
try {
    if (!I18nManager.isRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
    }
} catch (e) {
    console.warn("RTL Error", e);
}

import App from "./App";

// LiveKit WebRTC globals
registerGlobals();

// Register background handler
setBackgroundMessageHandler();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
