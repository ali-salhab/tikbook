# TikTok-Style Comments System 🎬💬

A complete, production-ready comments and replies system for React Native (Expo) that matches TikTok's UI/UX exactly.

## 📁 File Structure

```
mobile/src/components/comments/
├── CommentSheet.js          # Main bottom sheet modal (60-85% height)
├── CommentItem.js           # Individual comment component
├── ReplyItem.js             # Individual reply component (nested)
├── CommentInput.js          # Input bar with emoji picker
├── mockComments.js          # Sample data for testing
└── INTEGRATION_GUIDE.js     # Integration examples
```

## ✨ Features

### UI/UX (100% TikTok-like)

- ✅ **Bottom sheet modal** - Slides from bottom (75% screen height)
- ✅ **Swipe down to close** - Pan responder gesture handling
- ✅ **Comments count** - Total count including replies
- ✅ **User avatars** - With placeholder fallback
- ✅ **Verified badges** - Blue checkmark for verified users
- ✅ **VIP badges** - Diamond icon for VIP members
- ✅ **Emoji support** - Full emoji rendering in text
- ✅ **Time ago** - "20s ago", "2m ago", "5h ago", etc.
- ✅ **Like animation** - Heart scale animation on tap
- ✅ **Reply system** - Nested replies with indent
- ✅ **Expand/collapse** - "View X replies" / "Hide replies"
- ✅ **Emoji picker** - Row of popular emojis (like TikTok)
- ✅ **Reply indicator** - "Replying to @username"
- ✅ **Keyboard handling** - Auto-adjusts for keyboard
- ✅ **RTL support** - Arabic text fully supported

### Technical

- ✅ **Optimistic UI** - Instant updates before API response
- ✅ **FlatList optimized** - Efficient rendering for large lists
- ✅ **Smooth animations** - Spring and timing animations
- ✅ **Modular components** - Clean, reusable code
- ✅ **TypeScript ready** - Easy to add type definitions
- ✅ **No heavy dependencies** - Only Expo basic components

---

## 🚀 Quick Start

### 1. Test with Mock Data (No Backend Required)

```jsx
import React, { useState } from "react";
import { TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CommentSheet from "./components/comments/CommentSheet";
import { mockComments } from "./components/comments/mockComments";

function MyScreen() {
  const [commentsVisible, setCommentsVisible] = useState(false);

  return (
    <>
      {/* Comment Button */}
      <TouchableOpacity onPress={() => setCommentsVisible(true)}>
        <Ionicons name="chatbubble-ellipses-sharp" size={35} color="#FFF" />
        <Text>120</Text>
      </TouchableOpacity>

      {/* Comments Sheet */}
      <CommentSheet
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        videoId="video_123"
        initialComments={mockComments}
      />
    </>
  );
}
```

### 2. Replace Existing CommentsModal in HomeScreen

**Before** (old CommentsModal):

```jsx
import CommentsModal from "../components/CommentsModal";

<CommentsModal
  visible={commentsVisible}
  onClose={closeComments}
  videoId={selectedVideo?._id}
/>;
```

**After** (new TikTok-style CommentSheet):

```jsx
import CommentSheet from "../components/comments/CommentSheet";
import { mockComments } from "../components/comments/mockComments";

<CommentSheet
  visible={commentsVisible}
  onClose={closeComments}
  videoId={selectedVideo?._id}
  initialComments={mockComments} // Or fetch from API
/>;
```

---

## 🔌 Backend Integration

### Data Structure

Comments follow this structure:

```javascript
{
  id: string,                    // Unique ID
  user: {
    id: string,
    username: string,
    avatar: string | null,       // URL or null
    isVerified: boolean,         // Blue checkmark
    isVip: boolean              // Diamond badge
  },
  text: string,                  // Comment text (supports emojis)
  timestamp: string,             // ISO date string
  likesCount: number,            // Total likes
  isLiked: boolean,              // Current user liked it
  replies: Comment[],            // Nested array of replies
  showReplies: boolean          // Client-side state
}
```

### Required API Endpoints

#### 1. Get Comments

```
GET /api/videos/:videoId/comments
Authorization: Bearer {token}

Response: Comment[]
```

#### 2. Add Comment/Reply

```
POST /api/videos/:videoId/comments
Authorization: Bearer {token}
Body: {
  text: string,
  parentId?: string  // Optional: for replies
}

Response: Comment
```

#### 3. Like/Unlike Comment

```
PUT /api/comments/:commentId/like
Authorization: Bearer {token}

Response: {
  likesCount: number,
  isLiked: boolean
}
```

### Full Integration Example

```jsx
import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import CommentSheet from "./components/comments/CommentSheet";

function VideoScreen({ videoId }) {
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const { userToken, BASE_URL } = useContext(AuthContext);

  // Fetch comments when modal opens
  useEffect(() => {
    if (commentsVisible && videoId) {
      fetchComments();
    }
  }, [commentsVisible, videoId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/videos/${videoId}/comments`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setComments(res.data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CommentSheet
      visible={commentsVisible}
      onClose={() => setCommentsVisible(false)}
      videoId={videoId}
      initialComments={comments}
    />
  );
}
```

---

## 🎨 Customization

### Colors

Edit the StyleSheet in each component:

```javascript
// Change theme colors
const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "#1a1a1a", // Dark background
  },
  headerTitle: {
    color: "#FFF", // White text
  },
  likeCountActive: {
    color: "#FE2C55", // TikTok pink
  },
  // ... more styles
});
```

### Emojis

Change the emoji picker options in `CommentInput.js`:

```javascript
const EMOJIS = ["😂", "😍", "😊", "😭", "😎", "🔥", "❤️", "👍"];
```

### Sheet Height

Adjust the modal height in `CommentSheet.js`:

```javascript
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75; // 75% (change to 0.6 for 60%)
```

---

## 📱 Component API

### CommentSheet

| Prop              | Type      | Required | Description           |
| ----------------- | --------- | -------- | --------------------- |
| `visible`         | boolean   | ✅       | Show/hide modal       |
| `onClose`         | function  | ✅       | Called when closing   |
| `videoId`         | string    | ✅       | Video identifier      |
| `initialComments` | Comment[] | ❌       | Initial comments data |

### CommentItem

| Prop              | Type     | Required | Description               |
| ----------------- | -------- | -------- | ------------------------- |
| `comment`         | Comment  | ✅       | Comment data object       |
| `onLike`          | function | ✅       | Called when liking        |
| `onReply`         | function | ✅       | Called when replying      |
| `onToggleReplies` | function | ✅       | Toggle replies visibility |
| `onLikeReply`     | function | ✅       | Called when liking reply  |

### ReplyItem

| Prop     | Type     | Required | Description        |
| -------- | -------- | -------- | ------------------ |
| `reply`  | Comment  | ✅       | Reply data object  |
| `onLike` | function | ✅       | Called when liking |

### CommentInput

| Prop            | Type     | Required | Description              |
| --------------- | -------- | -------- | ------------------------ |
| `onSend`        | function | ✅       | Called when sending      |
| `replyingTo`    | Comment  | ❌       | Comment being replied to |
| `onCancelReply` | function | ✅       | Cancel reply mode        |

---

## 🔥 Advanced Features

### 1. Real-time Updates (Socket.IO)

```javascript
useEffect(() => {
  if (!socket || !videoId) return;

  // Listen for new comments
  socket.on("new_comment", (comment) => {
    if (comment.videoId === videoId) {
      setComments((prev) => [comment, ...prev]);
    }
  });

  // Listen for likes
  socket.on("comment_liked", ({ commentId, likesCount }) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likesCount } : c)),
    );
  });

  return () => {
    socket.off("new_comment");
    socket.off("comment_liked");
  };
}, [videoId]);
```

### 2. Pagination (Load More)

```javascript
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

const loadMoreComments = async () => {
  if (!hasMore) return;

  const res = await axios.get(
    `${BASE_URL}/videos/${videoId}/comments?page=${page + 1}`,
  );

  setComments((prev) => [...prev, ...res.data]);
  setPage((prev) => prev + 1);
  setHasMore(res.data.length > 0);
};

// Add to FlatList
<FlatList
  data={comments}
  onEndReached={loadMoreComments}
  onEndReachedThreshold={0.5}
/>;
```

### 3. Comment Moderation

```javascript
const handleDeleteComment = async (commentId) => {
  try {
    await axios.delete(`${BASE_URL}/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    setComments((prev) => prev.filter((c) => c.id !== commentId));
  } catch (error) {
    console.error("Error deleting comment:", error);
  }
};
```

---

## 🐛 Troubleshooting

### Issue: Comments not showing

**Solution:** Check that `initialComments` prop is passed correctly and contains valid data structure.

### Issue: Keyboard pushes content up

**Solution:** `KeyboardAvoidingView` is already implemented. On Android, add to `AndroidManifest.xml`:

```xml
<activity android:windowSoftInputMode="adjustResize">
```

### Issue: Animations laggy

**Solution:** Use `useNativeDriver: true` (already implemented) and test on physical device, not emulator.

### Issue: RTL layout broken

**Solution:** Ensure you have `I18nManager.forceRTL(true)` in your app's entry point if needed.

---

## 📊 Performance Tips

1. **FlatList optimization** - Already implemented with `keyExtractor`
2. **Memoization** - Use `useMemo` for computed values
3. **Avoid re-renders** - Use `useCallback` for functions (already done)
4. **Virtual scrolling** - FlatList handles this automatically
5. **Image optimization** - Use `resizeMode="cover"` for avatars

---

## 🎯 Testing Checklist

- [ ] Open/close modal smoothly
- [ ] Swipe down to close works
- [ ] Add comment appears instantly
- [ ] Like button animates correctly
- [ ] Reply to comment sets placeholder
- [ ] View replies expands/collapses
- [ ] Emoji picker works
- [ ] Keyboard doesn't cover input
- [ ] Arabic text displays correctly (RTL)
- [ ] Verified/VIP badges show correctly
- [ ] Time ago updates properly
- [ ] Empty state shows when no comments
- [ ] Scroll performance is smooth

---

## 📦 Dependencies Used

All dependencies are standard Expo/React Native:

- `react-native` - Core framework
- `@expo/vector-icons` - Icons (Ionicons, MaterialIcons)
- `react-native-safe-area-context` - Safe area handling
- `axios` - API calls (optional, use fetch if preferred)

**No external UI libraries required!**

---

## 🚢 Production Checklist

Before deploying to production:

1. ✅ Replace `mockComments` with real API data
2. ✅ Add error handling for API failures
3. ✅ Implement loading states
4. ✅ Add pull-to-refresh
5. ✅ Test on both iOS and Android
6. ✅ Test with slow network (throttle in DevTools)
7. ✅ Test with many comments (100+ items)
8. ✅ Add analytics tracking
9. ✅ Implement report/block functionality
10. ✅ Add comment character limit (configurable)

---

## 🎓 Code Quality

- ✅ Clean, readable code
- ✅ Comprehensive comments
- ✅ Modular architecture
- ✅ No prop drilling
- ✅ Consistent naming
- ✅ No magic numbers
- ✅ Proper error handling
- ✅ Optimistic UI updates

---

## 📝 License

Free to use in your project. No attribution required.

---

## 🤝 Support

For issues or questions:

1. Check the INTEGRATION_GUIDE.js file
2. Review mockComments.js for data structure
3. Test with mock data first before connecting API

---

## 🔮 Future Enhancements

Potential additions:

- Rich text formatting (bold, italic)
- @mentions with autocomplete
- GIF support
- Image attachments
- Voice comments
- Comment pinning
- Sorting (top, newest)
- Search within comments

---

**Built with ❤️ for TikBook**

Ready to use! Just import `CommentSheet` and pass your data. 🚀
