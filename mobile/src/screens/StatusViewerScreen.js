import React, {
  useState,
  useRef,
  useCallback,
  useContext,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
  Animated,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";

const { width, height } = Dimensions.get("window");

// ─── Reaction definitions ─────────────────────────────────────────────────
const REACTIONS = [
  { type: "like", emoji: "👍", label: "إعجاب" },
  { type: "love", emoji: "❤️", label: "أحبه" },
  { type: "haha", emoji: "😂", label: "أضحكني" },
  { type: "wow", emoji: "😮", label: "مذهل" },
  { type: "sad", emoji: "😢", label: "محزن" },
];

// ─── Progress bar for a single story ─────────────────────────────────────
const ProgressBar = ({ active, completed }) => {
  const anim = useRef(new Animated.Value(completed ? 1 : 0)).current;

  useEffect(() => {
    if (active) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: false,
      }).start();
    } else if (!completed) {
      anim.setValue(0);
    }
    // If completed, value stays at 1
  }, [active, completed]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: anim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
};

// ─── Single status slide ──────────────────────────────────────────────────
const StatusSlide = React.memo(
  ({
    item,
    index,
    currentIndex,
    total,
    userInfo,
    userToken,
    onClose,
    onPrev,
    onNext,
  }) => {
    const insets = useSafeAreaInsets();
    const [comment, setComment] = useState("");
    const [sendingComment, setSendingComment] = useState(false);
    const [viewsCount, setViewsCount] = useState(item.views?.length || 0);
    const [commentsCount, setCommentsCount] = useState(
      item.comments?.length || 0,
    );
    const [userReaction, setUserReaction] = useState(
      item.reactions?.find(
        (r) => r.user === userInfo?._id || r.user?._id === userInfo?._id,
      )?.type || null,
    );
    const [reactionCounts, setReactionCounts] = useState(() => {
      const counts = {};
      REACTIONS.forEach((r) => (counts[r.type] = 0));
      (item.reactions || []).forEach((r) => {
        if (counts[r.type] !== undefined) counts[r.type]++;
      });
      return counts;
    });
    const [totalReactions, setTotalReactions] = useState(
      item.reactions?.length || 0,
    );
    const [showReactions, setShowReactions] = useState(false);
    const [keyboardOffset, setKeyboardOffset] = useState(0);
    const inputRef = useRef(null);
    const reactionAnim = useRef(new Animated.Value(0)).current;
    const isOwn = item.user?._id === userInfo?._id;
    const timeAgo = getTimeAgo(item.createdAt);

    // Record view
    useEffect(() => {
      if (index === currentIndex && !isOwn) {
        axios
          .post(
            `${BASE_URL}/status/${item._id}/view`,
            {},
            { headers: { Authorization: `Bearer ${userToken}` } },
          )
          .then((res) => setViewsCount(res.data.viewsCount || 0))
          .catch(() => {});
      }
    }, [index === currentIndex]);

    // Keyboard listeners
    useEffect(() => {
      const show = Keyboard.addListener("keyboardDidShow", (e) => {
        setKeyboardOffset(e.endCoordinates.height);
      });
      const hide = Keyboard.addListener("keyboardDidHide", () => {
        setKeyboardOffset(0);
      });
      return () => {
        show.remove();
        hide.remove();
      };
    }, []);

    const toggleReactions = () => {
      if (showReactions) {
        Animated.timing(reactionAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(() => setShowReactions(false));
      } else {
        setShowReactions(true);
        Animated.timing(reactionAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    };

    const handleReact = async (type) => {
      setShowReactions(false);
      Animated.timing(reactionAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
      try {
        const res = await axios.post(
          `${BASE_URL}/status/${item._id}/react`,
          { type },
          { headers: { Authorization: `Bearer ${userToken}` } },
        );
        setUserReaction(res.data.userReaction);
        setReactionCounts(res.data.counts);
        setTotalReactions(res.data.total);
      } catch (_) {}
    };

    const sendComment = async () => {
      if (!comment.trim()) return;
      setSendingComment(true);
      try {
        await axios.post(
          `${BASE_URL}/status/${item._id}/comment`,
          { text: comment.trim() },
          { headers: { Authorization: `Bearer ${userToken}` } },
        );
        setCommentsCount((c) => c + 1);
        setComment("");
        Keyboard.dismiss();
      } catch (_) {}
      setSendingComment(false);
    };

    const currentReactionDef = REACTIONS.find((r) => r.type === userReaction);

    return (
      <View style={[styles.slide, { width, height }]}>
        {/* Background */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: item.bgColor || "#111" },
          ]}
        />
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : null}

        {/* Dark gradient overlay */}
        <View style={styles.overlay} />

        {/* Progress bars */}
        <View style={[styles.progressRow, { top: insets.top + 8 }]}>
          {Array.from({ length: total }).map((_, i) => (
            <ProgressBar
              key={i}
              active={i === currentIndex}
              completed={i < currentIndex}
            />
          ))}
        </View>

        {/* Top bar */}
        <View style={[styles.topBar, { top: insets.top + 22 }]}>
          <View style={styles.userRow}>
            {item.user?.profileImage ? (
              <Image
                source={{ uri: item.user.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={16} color="#FFF" />
              </View>
            )}
            <View>
              <Text style={styles.username}>{item.user?.username}</Text>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
            </View>
          </View>

          {/* Views + comments count (owner only) */}
          {isOwn && (
            <View style={styles.statsRow}>
              <Ionicons
                name="eye-outline"
                size={15}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.statText}>{viewsCount}</Text>
              <Ionicons
                name="chatbubble-outline"
                size={14}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.statText}>{commentsCount}</Text>
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Tap zones for prev/next */}
        <View style={styles.tapZones} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.tapZoneLeft}
            activeOpacity={1}
            onPress={onPrev}
          />
          <TouchableOpacity
            style={styles.tapZoneRight}
            activeOpacity={1}
            onPress={onNext}
          />
        </View>

        {/* Status text (if text-only status) */}
        {item.text ? (
          <View
            style={[
              styles.textBox,
              item.image && styles.textBoxWithImage,
            ]}
          >
            <Text style={styles.statusText}>{item.text}</Text>
          </View>
        ) : null}

        {/* Bottom actions */}
        <View
          style={[
            styles.bottomArea,
            { bottom: (keyboardOffset || insets.bottom) + 12 },
          ]}
        >
          {/* Reaction counts summary */}
          {totalReactions > 0 && (
            <View style={styles.reactionSummary}>
              {REACTIONS.filter((r) => reactionCounts[r.type] > 0)
                .slice(0, 3)
                .map((r) => (
                  <Text key={r.type} style={styles.reactionSummaryEmoji}>
                    {r.emoji}
                  </Text>
                ))}
              <Text style={styles.reactionSummaryCount}>{totalReactions}</Text>
            </View>
          )}

          {!isOwn && (
            <View style={styles.actionsRow}>
              {/* Reaction button */}
              <View style={{ position: "relative" }}>
                <TouchableOpacity
                  onPress={toggleReactions}
                  style={styles.reactionBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.reactionBtnEmoji}>
                    {currentReactionDef ? currentReactionDef.emoji : "👍"}
                  </Text>
                  <Text
                    style={[
                      styles.reactionBtnLabel,
                      userReaction && { color: "#FFD700" },
                    ]}
                  >
                    {currentReactionDef ? currentReactionDef.label : "تفاعل"}
                  </Text>
                </TouchableOpacity>

                {/* Reactions picker bubble */}
                {showReactions && (
                  <Animated.View
                    style={[
                      styles.reactionPicker,
                      {
                        opacity: reactionAnim,
                        transform: [
                          {
                            scale: reactionAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.7, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    {REACTIONS.map((r) => (
                      <TouchableOpacity
                        key={r.type}
                        onPress={() => handleReact(r.type)}
                        style={[
                          styles.reactionOption,
                          userReaction === r.type &&
                            styles.reactionOptionActive,
                        ]}
                      >
                        <Text style={styles.reactionOptionEmoji}>{r.emoji}</Text>
                        <Text style={styles.reactionOptionLabel}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </Animated.View>
                )}
              </View>

              {/* Comment input */}
              <View style={styles.commentInputWrap}>
                <TextInput
                  ref={inputRef}
                  style={styles.commentInput}
                  placeholder="اكتب تعليقاً..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={comment}
                  onChangeText={setComment}
                  returnKeyType="send"
                  onSubmitEditing={sendComment}
                  textAlign="right"
                />
                <TouchableOpacity
                  onPress={sendComment}
                  disabled={!comment.trim() || sendingComment}
                  style={[
                    styles.sendBtn,
                    (!comment.trim() || sendingComment) && { opacity: 0.4 },
                  ]}
                >
                  {sendingComment ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  },
);

// ─── Main StatusViewerScreen ──────────────────────────────────────────────
export default function StatusViewerScreen({ route, navigation }) {
  const { statuses = [], initialIndex = 0 } = route.params || {};
  const { userInfo, userToken } = useContext(AuthContext);
  const flatRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const onClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const goNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      const next = currentIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      navigation.goBack();
    }
  }, [currentIndex, statuses.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      flatRef.current?.scrollToIndex({ index: prev, animated: true });
      setCurrentIndex(prev);
    }
  }, [currentIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderItem = useCallback(
    ({ item, index }) => (
      <StatusSlide
        item={item}
        index={index}
        currentIndex={currentIndex}
        total={statuses.length}
        userInfo={userInfo}
        userToken={userToken}
        onClose={onClose}
        onPrev={goPrev}
        onNext={goNext}
      />
    ),
    [currentIndex, userInfo, userToken, onClose, goPrev, goNext],
  );

  if (!statuses.length) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#FFF" }}>لا توجد حالات</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar hidden />
      <FlatList
        ref={flatRef}
        data={statuses}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        scrollEventThrottle={16}
      />
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function getTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "منذ لحظات";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  slide: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  progressRow: {
    position: "absolute",
    left: 10,
    right: 10,
    flexDirection: "row",
    gap: 4,
    zIndex: 20,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  topBar: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  avatarFallback: {
    backgroundColor: "#555",
    justifyContent: "center",
    alignItems: "center",
  },
  username: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  timeAgo: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
  },
  statText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 6,
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 5,
  },
  tapZoneLeft: {
    flex: 1,
  },
  tapZoneRight: {
    flex: 1,
  },
  textBox: {
    position: "absolute",
    top: "50%",
    left: 24,
    right: 24,
    transform: [{ translateY: -60 }],
    alignItems: "center",
    zIndex: 10,
  },
  textBoxWithImage: {
    top: undefined,
    bottom: 160,
    transform: [],
  },
  statusText: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  bottomArea: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 20,
  },
  reactionSummary: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 2,
  },
  reactionSummaryEmoji: {
    fontSize: 18,
  },
  reactionSummaryCount: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginLeft: 4,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reactionBtn: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 24,
    minWidth: 68,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  reactionBtnEmoji: {
    fontSize: 22,
  },
  reactionBtnLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  reactionPicker: {
    position: "absolute",
    bottom: 70,
    left: -10,
    flexDirection: "row",
    backgroundColor: "rgba(20,20,20,0.95)",
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 30,
  },
  reactionOption: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  reactionOptionActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  reactionOptionEmoji: {
    fontSize: 28,
  },
  reactionOptionLabel: {
    color: "#FFF",
    fontSize: 10,
    marginTop: 2,
  },
  commentInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  commentInput: {
    flex: 1,
    color: "#FFF",
    fontSize: 14,
    paddingVertical: 4,
  },
  sendBtn: {
    marginLeft: 8,
  },
});
