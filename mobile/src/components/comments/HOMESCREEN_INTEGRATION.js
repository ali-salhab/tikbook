/**
 * HOW TO INTEGRATE INTO HOMESCREEN.js
 *
 * Follow these exact steps to replace the old CommentsModal with the new TikTok-style CommentSheet
 */

// ============================================
// STEP 1: Update Imports at the top of HomeScreen.js
// ============================================

// REMOVE this line:
// import CommentsModal from "../components/CommentsModal";

// ADD these lines:
import CommentSheet from "../components/comments/CommentSheet";
import { mockComments } from "../components/comments/mockComments";

// ============================================
// STEP 2: Update the Modal Component
// ============================================

// FIND this code (around line 700):
/*
<CommentsModal
  visible={commentsVisible}
  onClose={closeComments}
  videoId={selectedVideo?._id}
/>
*/

// REPLACE with:
<CommentSheet
  visible={commentsVisible}
  onClose={closeComments}
  videoId={selectedVideo?._id}
  initialComments={mockComments}
/>;

// ============================================
// STEP 3: (Optional) Connect to Real Backend
// ============================================

// Add state for real comments:
const [videoComments, setVideoComments] = useState({});

// Add fetch function:
const fetchCommentsForVideo = async (videoId) => {
  try {
    const res = await axios.get(`${BASE_URL}/videos/${videoId}/comments`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    setVideoComments((prev) => ({
      ...prev,
      [videoId]: res.data,
    }));
  } catch (error) {
    console.error("Error fetching comments:", error);
    // Fallback to mock comments
    setVideoComments((prev) => ({
      ...prev,
      [videoId]: mockComments,
    }));
  }
};

// Update handleComment function:
const handleComment = (video) => {
  setSelectedVideo(video);
  setCommentsVisible(true);

  // Fetch comments if not already loaded
  if (!videoComments[video._id]) {
    fetchCommentsForVideo(video._id);
  }
};

// Update CommentSheet to use real data:
<CommentSheet
  visible={commentsVisible}
  onClose={closeComments}
  videoId={selectedVideo?._id}
  initialComments={videoComments[selectedVideo?._id] || mockComments}
/>;

// ============================================
// THAT'S IT! 🎉
// ============================================

// The new TikTok-style comments system is now integrated!
// Features:
// ✅ Bottom sheet modal (swipeable)
// ✅ Like/unlike with animation
// ✅ Reply to comments
// ✅ Emoji picker
// ✅ Expand/collapse replies
// ✅ RTL support
// ✅ Keyboard handling
// ✅ Optimistic UI updates

// ============================================
// COMPLETE CODE SNIPPET
// ============================================

/*
// At the top with other imports:
import CommentSheet from "../components/comments/CommentSheet";
import { mockComments } from "../components/comments/mockComments";

// Inside HomeScreen component, add this state (optional, for backend):
const [videoComments, setVideoComments] = useState({});

// Add this function (optional, for backend):
const fetchCommentsForVideo = async (videoId) => {
  try {
    const res = await axios.get(`${BASE_URL}/videos/${videoId}/comments`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    setVideoComments(prev => ({
      ...prev,
      [videoId]: res.data
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    setVideoComments(prev => ({
      ...prev,
      [videoId]: mockComments
    }));
  }
};

// Update handleComment function:
const handleComment = (video) => {
  setSelectedVideo(video);
  setCommentsVisible(true);
  
  // Fetch comments if not already loaded (optional)
  if (!videoComments[video._id]) {
    fetchCommentsForVideo(video._id);
  }
};

// At the end of the return statement (replace old CommentsModal):
<CommentSheet
  visible={commentsVisible}
  onClose={closeComments}
  videoId={selectedVideo?._id}
  initialComments={videoComments[selectedVideo?._id] || mockComments}
/>
*/

// ============================================
// MINIMAL INTEGRATION (No Backend)
// ============================================

/*
// Just change these 2 things:

// 1. Import:
import CommentSheet from "../components/comments/CommentSheet";
import { mockComments } from "../components/comments/mockComments";

// 2. Replace modal:
<CommentSheet
  visible={commentsVisible}
  onClose={closeComments}
  videoId={selectedVideo?._id}
  initialComments={mockComments}
/>
*/
