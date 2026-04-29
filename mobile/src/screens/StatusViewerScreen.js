import React, {
  useState,
  useRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Animated,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { Video } from "expo-av";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import { ms, fs, getWindowDimensions } from "../utils/responsive";
import { darkUi } from "../theme/brand";

const { width, height } = getWindowDimensions();

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
        ) : item.video ? (
          <Video
            source={{ uri: item.video }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            shouldPlay={index === currentIndex}
            isLooping
            isMuted={false}
            useNativeControls={false}
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
              (item.image || item.video) && styles.textBoxWithImage,
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
                        <Text style={styles.reactionOptionEmoji}>
                          {r.emoji}
                        </Text>
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

// ─── UserStoriesPage: one full page per user (handles per-user story progression)
const UserStoriesPage = React.memo(
  ({ group, isActive, userInfo, userToken, onClose, onNextGroup, onPrevGroup }) => {
    const { items } = group;
    const [storyIdx, setStoryIdx] = useState(0);

    // Reset to first story when this page comes into view
    useEffect(() => {
      if (isActive) setStoryIdx(0);
    }, [isActive]);

    const currentItem = items[storyIdx] || items[0];
    if (!currentItem) return null;

    const goNext = useCallback(() => {
      if (storyIdx < items.length - 1) setStoryIdx((s) => s + 1);
      else onNextGroup();
    }, [storyIdx, items.length, onNextGroup]);

    const goPrev = useCallback(() => {
      if (storyIdx > 0) setStoryIdx((s) => s - 1);
      else onPrevGroup();
    }, [storyIdx, onPrevGroup]);

    return (
      <StatusSlide
        item={currentItem}
        index={storyIdx}
        currentIndex={storyIdx}
        total={items.length}
        userInfo={userInfo}
        userToken={userToken}
        onClose={onClose}
        onPrev={goPrev}
        onNext={goNext}
      />
    );
  },
);
UserStoriesPage.displayName = "UserStoriesPage";

// ─── Main StatusViewerScreen ──────────────────────────────────────────────
export default function StatusViewerScreen({ route, navigation }) {
  const rawGroups = route.params?.groups;
  const rawStatuses = route.params?.statuses;
  const initialGroupIndex =
    route.params?.initialGroupIndex ?? route.params?.initialIndex ?? 0;
  const { userInfo, userToken } = useContext(AuthContext);
  const flatRef = useRef(null);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);

  // Support both new 'groups' param and old flat 'statuses' param
  const groups = useMemo(() => {
    if (rawGroups && rawGroups.length > 0) return rawGroups;
    if (rawStatuses && rawStatuses.length > 0) {
      const map = {};
      rawStatuses.forEach((s) => {
        const uid = s.user?._id || s._id;
        if (!map[uid]) map[uid] = { user: s.user, items: [] };
        map[uid].items.push(s);
      });
      return Object.values(map);
    }
    return [];
  }, [rawGroups, rawStatuses]);

  const onClose = useCallback(() => navigation.goBack(), [navigation]);

  const goNextGroup = useCallback(() => {
    if (currentGroupIndex < groups.length - 1) {
      const next = currentGroupIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentGroupIndex(next);
    } else {
      navigation.goBack();
    }
  }, [currentGroupIndex, groups.length, navigation]);

  const goPrevGroup = useCallback(() => {
    if (currentGroupIndex > 0) {
      const prev = currentGroupIndex - 1;
      flatRef.current?.scrollToIndex({ index: prev, animated: true });
      setCurrentGroupIndex(prev);
    }
  }, [currentGroupIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentGroupIndex(viewableItems[0].index);
  }).current;

  const renderItem = useCallback(
    ({ item, index }) => (
      <UserStoriesPage
        group={item}
        isActive={index === currentGroupIndex}
        userInfo={userInfo}
        userToken={userToken}
        onClose={onClose}
        onNextGroup={goNextGroup}
        onPrevGroup={goPrevGroup}
      />
    ),
    [currentGroupIndex, userInfo, userToken, onClose, goNextGroup, goPrevGroup],
  );

  if (!groups.length) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: darkUi.canvas,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#FFF" }}>لا توجد حالات</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: darkUi.canvas }}>
      <StatusBar hidden />
      <FlatList
        ref={flatRef}
        data={groups}
        keyExtractor={(item) => item.user?._id || item.items?.[0]?._id || Math.random().toString()}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialGroupIndex}
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
    left: ms(10),
    right: ms(10),
    flexDirection: "row",
    gap: ms(4),
    zIndex: 20,
  },
  progressTrack: {
    flex: 1,
    height: ms(3),
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: ms(2),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: ms(2),
  },
  topBar: {
    position: "absolute",
    left: ms(12),
    right: ms(12),
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(10),
    flex: 1,
  },
  avatar: {
    width: ms(38),
    height: ms(38),
    borderRadius: ms(19),
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
    fontSize: fs(14),
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  timeAgo: {
    color: "rgba(255,255,255,0.7)",
    fontSize: fs(11),
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(20),
    marginRight: ms(8),
  },
  statText: {
    color: "#FFF",
    fontSize: fs(12),
    fontWeight: "600",
  },
  closeBtn: {
    padding: ms(6),
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
    left: ms(24),
    right: ms(24),
    transform: [{ translateY: ms(-60) }],
    alignItems: "center",
    zIndex: 10,
  },
  textBoxWithImage: {
    top: undefined,
    bottom: ms(160),
    transform: [],
  },
  statusText: {
    color: "#FFF",
    fontSize: fs(28),
    fontWeight: "800",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: ms(16),
    paddingVertical: ms(10),
    borderRadius: ms(14),
    overflow: "hidden",
  },
  bottomArea: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: ms(12),
    zIndex: 20,
  },
  reactionSummary: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ms(8),
    gap: ms(2),
  },
  reactionSummaryEmoji: {
    fontSize: fs(18),
  },
  reactionSummaryCount: {
    color: "rgba(255,255,255,0.8)",
    fontSize: fs(13),
    marginLeft: ms(4),
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(10),
  },
  reactionBtn: {
    alignItems: "center",
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: ms(24),
    minWidth: ms(68),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  reactionBtnEmoji: {
    fontSize: fs(22),
  },
  reactionBtnLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: fs(11),
    marginTop: ms(2),
    fontWeight: "600",
  },
  reactionPicker: {
    position: "absolute",
    bottom: ms(70),
    left: ms(-10),
    flexDirection: "row",
    backgroundColor: "rgba(20,20,20,0.95)",
    borderRadius: ms(30),
    paddingHorizontal: ms(10),
    paddingVertical: ms(8),
    gap: ms(6),
    shadowColor: darkUi.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 30,
  },
  reactionOption: {
    alignItems: "center",
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: ms(16),
  },
  reactionOptionActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  reactionOptionEmoji: {
    fontSize: fs(28),
  },
  reactionOptionLabel: {
    color: "#FFF",
    fontSize: fs(10),
    marginTop: ms(2),
  },
  commentInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: ms(24),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: ms(14),
    paddingVertical: ms(6),
  },
  commentInput: {
    flex: 1,
    color: "#FFF",
    fontSize: fs(14),
    paddingVertical: ms(4),
  },
  sendBtn: {
    marginLeft: ms(8),
  },
});
