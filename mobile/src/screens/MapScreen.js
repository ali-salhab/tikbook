import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomMapView from "../components/MapView";
import * as Location from "expo-location";

const MapScreen = ({ navigation }) => {
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);

  // Example: Dummy markers for Syria locations
  const dummyMarkers = [
    {
      id: "1",
      latitude: 33.5138,
      longitude: 36.2765,
      title: "Damascus",
      description: "Capital of Syria",
    },
    {
      id: "2",
      latitude: 36.2021,
      longitude: 37.1343,
      title: "Aleppo",
      description: "Historical city",
    },
    {
      id: "3",
      latitude: 34.7318,
      longitude: 36.7128,
      title: "Homs",
      description: "Central Syria",
    },
    {
      id: "4",
      latitude: 35.7264,
      longitude: 35.7953,
      title: "Latakia",
      description: "Coastal city",
    },
  ];

  useEffect(() => {
    setMarkers(dummyMarkers);
  }, []);

  const handleMarkerPress = (marker) => {
    setSelectedMarker(marker);
    Alert.alert(marker.title, marker.description, [
      { text: "Close", style: "cancel" },
      {
        text: "View Details",
        onPress: () => console.log("View details:", marker),
      },
    ]);
  };

  const addCurrentLocationMarker = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Error", "Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const newMarker = {
        id: Date.now().toString(),
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        title: "My Location",
        description: "Current position",
      };

      setMarkers([...markers, newMarker]);
      Alert.alert("Success", "Marker added at your current location");
    } catch (error) {
      Alert.alert("Error", "Could not get your location");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Map View</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={addCurrentLocationMarker}
        >
          <Text style={styles.addButtonText}>+ Add Marker</Text>
        </TouchableOpacity>
      </View>

      <CustomMapView
        markers={markers}
        onMarkerPress={handleMarkerPress}
        style={styles.map}
        showUserLocation={true}
      />

      {selectedMarker && (
        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>{selectedMarker.title}</Text>
          <Text style={styles.infoDescription}>
            {selectedMarker.description}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedMarker(null)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  map: {
    flex: 1,
  },
  infoPanel: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  infoDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  closeButton: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#333",
    fontWeight: "600",
  },
});

export default MapScreen;
