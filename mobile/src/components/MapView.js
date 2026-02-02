import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";

const CustomMapView = ({
  markers = [],
  onMarkerPress,
  style,
  initialRegion,
  showUserLocation = true,
}) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        setLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setLoading(false);
    })();
  }, []);

  const defaultRegion = initialRegion || {
    latitude: location?.coords.latitude || 33.5138, // Damascus, Syria
    longitude: location?.coords.longitude || 36.2765,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  if (loading) {
    return (
      <View style={[styles.container, style, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[styles.container, style, styles.centered]}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={[styles.container, style]}
      initialRegion={defaultRegion}
      showsUserLocation={showUserLocation}
      showsMyLocationButton={true}
      showsCompass={true}
      showsScale={true}
      mapType="standard"
    >
      {markers.map((marker, index) => (
        <Marker
          key={marker.id || index}
          coordinate={{
            latitude: marker.latitude,
            longitude: marker.longitude,
          }}
          title={marker.title}
          description={marker.description}
          onPress={() => onMarkerPress && onMarkerPress(marker)}
        />
      ))}
    </MapView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

export default CustomMapView;
