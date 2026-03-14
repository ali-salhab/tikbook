import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

type Props = {
  onPress: () => void;
  disabled?: boolean;
};

const GiftButton = ({ onPress, disabled = false }: Props) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.84}
    >
      <Text style={styles.label}>Gift</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minWidth: 78,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  disabled: {
    opacity: 0.42,
  },
  label: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
});

export default GiftButton;
