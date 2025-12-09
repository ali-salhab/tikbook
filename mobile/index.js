import { registerRootComponent } from "expo";
import { setBackgroundMessageHandler } from "./src/services/notificationService";

import App from "./App";

// Register background handler
setBackgroundMessageHandler();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
