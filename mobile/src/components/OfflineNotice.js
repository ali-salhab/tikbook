import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

const OfflineNotice = ({ onRetry, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="cloud-offline-outline" size={80} color="#666" />
      <Text style={styles.title}>لا يوجد اتصال بالانترنت</Text>
      <Text style={styles.subtitle}>
        يرجى التحقق من اتصالك بالشبكة وإعادة المحاولة
      </Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000", // Dark theme background
    padding: 20,
    minHeight: height * 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#FE2C55",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default OfflineNotice;
