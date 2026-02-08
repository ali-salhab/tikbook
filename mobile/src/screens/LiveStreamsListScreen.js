import React, { useState, useEffect, useContext } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    RefreshControl,
    Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";

const { width } = Dimensions.get("window");
const ITEM_WIDTH = (width - 48) / 2; // 2 columns with padding

const LiveStreamsListScreen = ({ navigation }) => {
    const { userToken } = useContext(AuthContext);
    const insets = useSafeAreaInsets();

    const [streams, setStreams] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActiveStreams();
    }, []);

    const fetchActiveStreams = async () => {
        try {
            console.log("📡 Fetching active streams...");
            const response = await axios.get(`${BASE_URL}/live/active`, {
                headers: { Authorization: `Bearer ${userToken}` },
            });

            const data = response.data || [];
            console.log("✅ Active streams:", data.length);
            // Normalize Agora live records into UI shape
            const normalized = data.map((stream) => ({
                _id: stream._id || stream.channelName,
                channelName: stream.channelName,
                title: stream.title || "Live Stream",
                viewers: stream.viewers || 0,
                user: stream.user || null,
            }));
            setStreams(normalized);
        } catch (error) {
            console.error("❌ Error fetching streams:", error);
            // Show empty state instead of error
            setStreams([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchActiveStreams();
    };

    const joinStream = (stream) => {
        navigation.navigate("Live", {
            isBroadcaster: false,
            channelId: stream.channelName,
        });
    };

    const renderStreamItem = ({ item }) => (
        <TouchableOpacity
            style={styles.streamCard}
            onPress={() => joinStream(item)}
            activeOpacity={0.8}
        >
            {/* Thumbnail/Preview */}
            <View style={styles.thumbnail}>
                {item.user?.profileImage ? (
                    <Image
                        source={{ uri: item.user.profileImage }}
                        style={styles.thumbnailImage}
                    />
                ) : (
                    <View style={styles.thumbnailPlaceholder}>
                        <Ionicons name="person" size={40} color="#FFF" />
                    </View>
                )}

                {/* LIVE Badge */}
                <View style={styles.liveBadge}>
                    <View style={styles.liveIndicator} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>

                {/* Viewer Count */}
                <View style={styles.viewerBadge}>
                    <Ionicons name="eye" size={12} color="#FFF" />
                    <Text style={styles.viewerText}>{item.viewers || 0}</Text>
                </View>
            </View>

            {/* Stream Info */}
            <View style={styles.streamInfo}>
                <Text style={styles.streamTitle} numberOfLines={2}>
                    {item.title || "Live Stream"}
                </Text>
                <Text style={styles.streamUser} numberOfLines={1}>
                    @{item.user?.username || "Unknown"}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="videocam-off-outline" size={80} color="#666" />
            <Text style={styles.emptyTitle}>لا توجد بثوث مباشرة</Text>
            <Text style={styles.emptySubtitle}>
                لا يوجد أحد يبث الآن. كن أول من يبدأ!
            </Text>
            <TouchableOpacity
                style={styles.startLiveButton}
                onPress={() => navigation.navigate("Upload")}
            >
                <Ionicons name="videocam" size={20} color="#FFF" />
                <Text style={styles.startLiveText}>ابدأ البث المباشر</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>البث المباشر</Text>
                <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => navigation.navigate("Live", { isBroadcaster: true })}
                >
                    <Ionicons name="videocam" size={24} color="#FE2C55" />
                </TouchableOpacity>
            </View>

            {/* Streams Grid */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>جاري التحميل...</Text>
                </View>
            ) : (
                <FlatList
                    data={streams}
                    renderItem={renderStreamItem}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#FFF"
                            colors={["#FE2C55"]}
                        />
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.1)",
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "bold",
    },
    startButton: {
        padding: 8,
    },
    listContent: {
        padding: 16,
    },
    columnWrapper: {
        justifyContent: "space-between",
        marginBottom: 16,
    },
    streamCard: {
        width: ITEM_WIDTH,
        backgroundColor: "#1a1a1a",
        borderRadius: 12,
        overflow: "hidden",
    },
    thumbnail: {
        width: "100%",
        height: ITEM_WIDTH * 1.5,
        backgroundColor: "#2a2a2a",
        position: "relative",
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
    },
    thumbnailPlaceholder: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#2a2a2a",
    },
    liveBadge: {
        position: "absolute",
        top: 8,
        left: 8,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(254,44,85,0.9)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 4,
    },
    liveIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#FFF",
    },
    liveText: {
        color: "#FFF",
        fontSize: 10,
        fontWeight: "bold",
    },
    viewerBadge: {
        position: "absolute",
        bottom: 8,
        right: 8,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    viewerText: {
        color: "#FFF",
        fontSize: 11,
        fontWeight: "600",
    },
    streamInfo: {
        padding: 12,
    },
    streamTitle: {
        color: "#FFF",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 4,
    },
    streamUser: {
        color: "#888",
        fontSize: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100,
    },
    emptyTitle: {
        color: "#FFF",
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        color: "#888",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 24,
    },
    startLiveButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FE2C55",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    startLiveText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        color: "#FFF",
        fontSize: 16,
    },
});

export default LiveStreamsListScreen;
