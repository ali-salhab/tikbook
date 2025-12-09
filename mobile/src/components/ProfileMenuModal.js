import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");

const ProfileMenuModal = ({ visible, onClose, navigation }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        mass: 0.8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const menuItems = [
    {
      title: "الأصول",
      data: [
        {
          id: "balance",
          label: "رصيد",
          icon: "wallet-outline",
          iconType: "Ionicons",
          onPress: () => navigation.navigate("Wallet"),
        },
      ],
    },
    {
      title: "الأدوات الشخصية",
      data: [
        {
          id: "activity",
          label: "مركز الأنشطة",
          icon: "time-outline",
          iconType: "Ionicons",
        },
        {
          id: "qr",
          label: "رمز QR لديك",
          icon: "qr-code-outline",
          iconType: "Ionicons",
        },
      ],
    },
    {
      title: null, // No header for this section
      data: [
        {
          id: "settings",
          label: "الإعدادات والخصوصية",
          icon: "settings-outline",
          iconType: "Ionicons",
          onPress: () => {
            // Navigate to settings or logout
            // For now just close
          },
        },
      ],
    },
  ];

  const renderItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={() => {
        handleClose();
        if (item.onPress) item.onPress();
      }}
    >
      <Ionicons name="chevron-back" size={20} color="#ccc" />
      <View style={styles.itemContent}>
        <Text style={styles.itemLabel}>{item.label}</Text>
        <Ionicons name={item.icon} size={24} color="#000" />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={styles.indicator} />

          <View style={styles.content}>
            {menuItems.map((section, sectionIndex) => (
              <View key={sectionIndex} style={styles.section}>
                {section.title && (
                  <Text style={styles.sectionHeader}>{section.title}</Text>
                )}
                {section.data.map((item) => renderItem(item))}
                {sectionIndex < menuItems.length - 1 && (
                  <View style={styles.separator} />
                )}
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: "90%",
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  content: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
    textAlign: "right",
    paddingRight: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemLabel: {
    fontSize: 15,
    color: "#000",
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 5,
  },
});

export default ProfileMenuModal;
