import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SystemNotificationsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("الكل");

  const tabs = ["الكل", "TikTok", "مساعد المعاملات", "LIVE"];

  const notifications = [
    {
      id: "1",
      source: "TikTok . الأنشطة",
      title: "لا تفوّت فرصة فتح مكافأة خاصة لـ Maxton Hall الموسم 2!",
      time: "عرض المزيد",
      icon: "logo-tiktok",
      type: "tiktok",
    },
    {
      id: "2",
      source: "مساعد المعاملات",
      title: "Purchase of Coins",
      description: "23 نوفمبر . You purchased 50 Coins for $ 0.52",
      time: "عرض المزيد",
      icon: "wallet",
      type: "transaction",
    },
    {
      id: "3",
      source: "مساعد المعاملات",
      title: "Purchase of Coins",
      description: "23 نوفمبر . You purchased 35 Coins for $ 0.37",
      time: "عرض المزيد",
      icon: "wallet",
      type: "transaction",
    },
    {
      id: "4",
      source: "TikTok . الأنشطة",
      title: "احصل على الاطار الرسمي لـ Maxton Hall الموسم 2 لفترة محدودة هنا!",
      time: "عرض المزيد",
      icon: "logo-tiktok",
      type: "tiktok",
    },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.sourceContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name={item.icon} size={16} color="#000" />
          </View>
          <Text style={styles.sourceText}>{item.source}</Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.cardDescription}>{item.description}</Text>
        )}
        <Text style={styles.moreText}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إشعارات النظام</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  tabsContainer: {
    backgroundColor: "#FFF",
    paddingVertical: 12,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F1F1",
  },
  activeTab: {
    backgroundColor: "#E8F3FF",
  },
  tabText: {
    color: "#666",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#25F4EE",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sourceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F1F1",
    justifyContent: "center",
    alignItems: "center",
  },
  sourceText: {
    color: "#666",
    fontSize: 13,
  },
  cardContent: {
    paddingRight: 32, // Indent content to align with text
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "left",
  },
  cardDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
    textAlign: "left",
  },
  moreText: {
    fontSize: 13,
    color: "#666",
    textAlign: "left",
  },
});

export default SystemNotificationsScreen;
