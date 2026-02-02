# OpenStreetMap Integration for TikBook

## What has been added:

### 1. **react-native-maps** package installed

- Works with OpenStreetMap by default (no Google Maps API key needed)
- Fully functional in Syria and regions where Google Maps is blocked

### 2. **MapView Component** (`src/components/MapView.js`)

- Reusable map component with OpenStreetMap provider
- Features:
  - Shows user's current location
  - Supports custom markers
  - Location permission handling
  - Loading and error states
  - Compass, scale, and location button

### 3. **MapScreen** (`src/screens/MapScreen.js`)

- Example screen demonstrating map usage
- Features:
  - Displays multiple markers for Syrian cities (Damascus, Aleppo, Homs, Latakia)
  - Add markers at current location
  - Marker press handling with info panel
  - Clean UI with header and controls

### 4. **Navigation Integration**

- MapScreen added to AppNavigator
- Accessible via: `navigation.navigate('Map')`

## How to use:

### Navigate to Map Screen:

```javascript
navigation.navigate("Map");
```

### Use MapView Component in your own screen:

```javascript
import CustomMapView from "../components/MapView";

<CustomMapView
  markers={[
    {
      id: "1",
      latitude: 33.5138,
      longitude: 36.2765,
      title: "Damascus",
      description: "Capital",
    },
  ]}
  onMarkerPress={(marker) => console.log(marker)}
  showUserLocation={true}
/>;
```

## Features:

- ✅ Works offline (once tiles are cached)
- ✅ No API keys required
- ✅ Works in Syria (no Google restrictions)
- ✅ Shows user location
- ✅ Custom markers support
- ✅ RTL support ready
- ✅ Clean, modern UI

## Testing:

Run the app with:

```bash
npm start
# Then press 'a' for Android or 'i' for iOS
```

The map will automatically use OpenStreetMap tiles and work without any Google dependencies.
