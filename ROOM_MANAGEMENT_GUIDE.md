# 🎛️ نظام إدارة الغرف المباشرة - دليل التطبيق الكامل

## 📋 الميزات المضافة

### 1. صلاحيات المذيع (الهوست)

- ✅ طرد مستخدم من الغرفة
- ✅ حظر مستخدم (منع من الدخول مجدداً)
- ✅ إلغاء حظر مستخدم
- ✅ تعيين مستخدم كمسؤول (مودريتور)
- ✅ إزالة صلاحيات المسؤول
- ✅ تشغيل موسيقى من الجهاز
- ✅ التحكم في مستوى الصوت

### 2. صلاحيات المسؤول (المودريتور)

- ✅ طرد المستخدمين
- ✅ حظر المستخدمين

---

## 🔧 التعديلات على Backend

### ✅ تم التحديث:

1. **نموذج LiveRoom** - إضافة حقول جديدة:
   - `bannedUsers[]` - قائمة المحظورين
   - `moderators[]` - قائمة المسؤولين
   - `musicPlayer{}` - إعدادات مشغل الموسيقى

2. **Controller Functions** (liveRoomController.js):
   - `kickUser` - طرد مستخدم
   - `banUser` - حظر مستخدم
   - `unbanUser` - إلغاء حظر
   - `assignModerator` - تعيين مسؤول
   - `removeModerator` - إزالة مسؤول
   - `controlMusic` - التحكم في الموسيقى

3. **Routes** (liveRoomRoutes.js):

   ```javascript
   POST /api/live-rooms/:roomId/kick
   POST /api/live-rooms/:roomId/ban
   POST /api/live-rooms/:roomId/unban
   POST /api/live-rooms/:roomId/assign-moderator
   POST /api/live-rooms/:roomId/remove-moderator
   POST /api/live-rooms/:roomId/music
   ```

4. **Socket Events** (server.js):
   - `liveroom:kick_user`
   - `liveroom:ban_user`
   - `liveroom:assign_moderator`
   - `liveroom:remove_moderator`
   - `liveroom:music_control`

---

## 📱 التعديلات على Frontend

### المكونات الجديدة:

#### 1. RoomManagementModal.js

مودال لإدارة المستخدمين بـ 3 تبويبات:

- **المشاركين**: عرض كل المستخدمين مع خيارات الإدارة
- **المسؤولين**: قائمة المودريتورز
- **المحظورين**: قائمة المستخدمين المحظورين

#### 2. MusicPlayerControl.js

مشغل موسيقى كامل:

- اختيار ملف من الجهاز
- تشغيل/إيقاف مؤقت/إيقاف
- شريط التقدم
- التحكم في مستوى الصوت
- مزامنة للجميع في الغرفة

---

## 🚀 دمج المكونات في LiveRoomScreen

### الخطوة 1: الاستيرادات

أضف في أعلى ملف `LiveRoomScreen.js`:

\`\`\`javascript
import RoomManagementModal from "../components/RoomManagementModal";
import MusicPlayerControl from "../components/MusicPlayerControl";
import liveRoomService from "../services/liveRoomService";
\`\`\`

### الخطوة 2: State Variables

أضف المتغيرات التالية:

\`\`\`javascript
const [showManagementModal, setShowManagementModal] = useState(false);
const [showMusicPlayer, setShowMusicPlayer] = useState(false);
const [musicPlayer, setMusicPlayer] = useState({
isPlaying: false,
currentTrack: "",
trackName: "",
volume: 50,
});
\`\`\`

### الخطوة 3: وظائف الإدارة

\`\`\`javascript
// طرد مستخدم
const handleKickUser = async (userId) => {
try {
const response = await liveRoomService.kickUser(room.\_id, userId);
if (response.success) {
// Emit socket event
socket.emit("liveroom:kick_user", {
roomId: room.\_id,
userId,
kickedBy: userInfo.username,
});
Alert.alert("تم", "تم طرد المستخدم بنجاح");
}
} catch (error) {
console.error("Error kicking user:", error);
Alert.alert("خطأ", "فشل في طرد المستخدم");
}
};

// حظر مستخدم
const handleBanUser = async (userId, reason) => {
try {
const response = await liveRoomService.banUser(room.\_id, userId, reason);
if (response.success) {
socket.emit("liveroom:ban_user", {
roomId: room.\_id,
userId,
bannedBy: userInfo.username,
reason,
});
Alert.alert("تم", "تم حظر المستخدم بنجاح");
}
} catch (error) {
console.error("Error banning user:", error);
Alert.alert("خطأ", "فشل في حظر المستخدم");
}
};

// إلغاء حظر
const handleUnbanUser = async (userId) => {
try {
const response = await liveRoomService.unbanUser(room.\_id, userId);
if (response.success) {
Alert.alert("تم", "تم إلغاء حظر المستخدم");
}
} catch (error) {
console.error("Error unbanning user:", error);
Alert.alert("خطأ", "فشل في إلغاء الحظر");
}
};

// تعيين مسؤول
const handleAssignModerator = async (userId) => {
try {
const response = await liveRoomService.assignModerator(room.\_id, userId);
if (response.success) {
socket.emit("liveroom:assign_moderator", {
roomId: room.\_id,
userId,
assignedBy: userInfo.username,
});
Alert.alert("تم", "تم تعيين المستخدم كمسؤول");
}
} catch (error) {
console.error("Error assigning moderator:", error);
Alert.alert("خطأ", "فشل في تعيين المسؤول");
}
};

// إزالة مسؤول
const handleRemoveModerator = async (userId) => {
try {
const response = await liveRoomService.removeModerator(room.\_id, userId);
if (response.success) {
socket.emit("liveroom:remove_moderator", {
roomId: room.\_id,
userId,
});
Alert.alert("تم", "تم إزالة المسؤول");
}
} catch (error) {
console.error("Error removing moderator:", error);
Alert.alert("خطأ", "فشل في إزالة المسؤول");
}
};

// التحكم في الموسيقى
const handleControlMusic = async (action, trackUrl, trackName, volume) => {
try {
const response = await liveRoomService.controlMusic(room.\_id, {
action,
trackUrl,
trackName,
volume,
});

    if (response.success) {
      setMusicPlayer(response.musicPlayer);

      // Broadcast to all users
      socket.emit("liveroom:music_control", {
        roomId: room._id,
        action,
        musicPlayer: response.musicPlayer,
      });
    }

} catch (error) {
console.error("Error controlling music:", error);
Alert.alert("خطأ", "فشل في التحكم في الموسيقى");
}
};
\`\`\`

### الخطوة 4: Socket Listeners

\`\`\`javascript
useEffect(() => {
if (!socket) return;

// Listen for kicked users
socket.on("liveroom:user_kicked", ({ userId, kickedBy }) => {
if (userId === userInfo.\_id) {
Alert.alert("تم طردك", \`تم طردك من الغرفة بواسطة \${kickedBy}\`, [
{
text: "حسناً",
onPress: () => navigation.goBack(),
},
]);
} else {
// Refresh room data
fetchRoomData();
}
});

// Listen for banned users
socket.on("liveroom:user_banned", ({ userId, bannedBy, reason }) => {
if (userId === userInfo.\_id) {
Alert.alert(
"تم حظرك",
\`تم حظرك من الغرفة بواسطة \${bannedBy}\${reason ? \`\n\nالسبب: \${reason}\` : ""}\`,
[
{
text: "حسناً",
onPress: () => navigation.goBack(),
},
]
);
} else {
fetchRoomData();
}
});

// Listen for moderator assignments
socket.on("liveroom:moderator_assigned", ({ userId }) => {
if (userId === userInfo.\_id) {
Alert.alert("تهانينا", "تم تعيينك كمسؤول في هذه الغرفة");
}
fetchRoomData();
});

// Listen for music updates
socket.on("liveroom:music_updated", ({ musicPlayer }) => {
setMusicPlayer(musicPlayer);
});

return () => {
socket.off("liveroom:user_kicked");
socket.off("liveroom:user_banned");
socket.off("liveroom:moderator_assigned");
socket.off("liveroom:music_updated");
};
}, [socket]);
\`\`\`

### الخطوة 5: أزرار التحكم

أضف في منطقة الأزرار (Controls):

\`\`\`javascript
{/_ إدارة الغرفة (للمذيع والمسؤولين فقط) _/}
{(isHost || isModerator) && (
<TouchableOpacity
style={styles.controlButton}
onPress={() => setShowManagementModal(true)}

>

    <Ionicons name="settings" size={24} color="#fff" />

  </TouchableOpacity>
)}

{/_ مشغل الموسيقى _/}
<TouchableOpacity
style={styles.controlButton}
onPress={() => setShowMusicPlayer(true)}

> <Ionicons

    name="musical-notes"
    size={24}
    color={musicPlayer.isPlaying ? "#FFD700" : "#fff"}

/>
</TouchableOpacity>
\`\`\`

### الخطوة 6: المودالات

أضف في نهاية الـ JSX (بعد `</ImageBackground>`):

\`\`\`javascript
{/_ Room Management Modal _/}
<RoomManagementModal
visible={showManagementModal}
onClose={() => setShowManagementModal(false)}
participants={allParticipants}
moderators={room?.moderators || []}
bannedUsers={room?.bannedUsers || []}
isHost={isHost}
currentUserId={userInfo.\_id}
onKickUser={handleKickUser}
onBanUser={handleBanUser}
onUnbanUser={handleUnbanUser}
onAssignModerator={handleAssignModerator}
onRemoveModerator={handleRemoveModerator}
/>

{/_ Music Player Control _/}
<MusicPlayerControl
visible={showMusicPlayer}
onClose={() => setShowMusicPlayer(false)}
musicPlayer={musicPlayer}
onControlMusic={handleControlMusic}
isHost={isHost}
/>
\`\`\`

---

## 🔌 إنشاء Service للـ API

أنشئ ملف `liveRoomService.js`:

\`\`\`javascript
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://YOUR_IP:5000/api/live-rooms";

const getToken = async () => {
return await AsyncStorage.getItem("token");
};

const liveRoomService = {
// Kick user
kickUser: async (roomId, userId) => {
const token = await getToken();
const response = await axios.post(
\`\${API_URL}/\${roomId}/kick\`,
{ userId },
{ headers: { Authorization: \`Bearer \${token}\` } }
);
return response.data;
},

// Ban user
banUser: async (roomId, userId, reason) => {
const token = await getToken();
const response = await axios.post(
\`\${API_URL}/\${roomId}/ban\`,
{ userId, reason },
{ headers: { Authorization: \`Bearer \${token}\` } }
);
return response.data;
},

// Unban user
unbanUser: async (roomId, userId) => {
const token = await getToken();
const response = await axios.post(
\`\${API_URL}/\${roomId}/unban\`,
{ userId },
{ headers: { Authorization: \`Bearer \${token}\` } }
);
return response.data;
},

// Assign moderator
assignModerator: async (roomId, userId) => {
const token = await getToken();
const response = await axios.post(
\`\${API_URL}/\${roomId}/assign-moderator\`,
{ userId },
{ headers: { Authorization: \`Bearer \${token}\` } }
);
return response.data;
},

// Remove moderator
removeModerator: async (roomId, userId) => {
const token = await getToken();
const response = await axios.post(
\`\${API_URL}/\${roomId}/remove-moderator\`,
{ userId },
{ headers: { Authorization: \`Bearer \${token}\` } }
);
return response.data;
},

// Control music
controlMusic: async (roomId, data) => {
const token = await getToken();
const response = await axios.post(
\`\${API_URL}/\${roomId}/music\`,
data,
{ headers: { Authorization: \`Bearer \${token}\` } }
);
return response.data;
},
};

export default liveRoomService;
\`\`\`

---

## 🎯 تحديث getLiveRoom API

لاسترجاع البيانات الكاملة، تأكد من populate في controller:

\`\`\`javascript
const populatedRoom = await LiveRoom.findOne({ roomId })
.populate("host", "username avatar profileImage isVerified activeBadge")
.populate("speakers.user", "username avatar profileImage isVerified activeBadge")
.populate("listeners.user", "username avatar profileImage isVerified")
.populate("handRaised.user", "username avatar profileImage isVerified")
.populate("moderators.user", "username avatar profileImage")
.populate("bannedUsers.user", "username avatar profileImage")
.populate("bannedUsers.bannedBy", "username");
\`\`\`

---

## 📦 تثبيت الباكجات المطلوبة

\`\`\`bash
cd mobile
npm install expo-av expo-document-picker
\`\`\`

---

## ✅ اختبار الميزات

### 1. اختبار الطرد والحظر

1. افتح غرفة كمذيع
2. انضم بمستخدم آخر
3. افتح قائمة الإدارة (Settings)
4. جرب طرد المستخدم
5. جرب حظر المستخدم
6. تأكد من عدم قدرة المحظور على الدخول مجدداً

### 2. اختبار المودريتور

1. عيّن مستخدم آخر كمسؤول
2. يجب أن يرى أيقونة التاج 👑
3. يجب أن يستطيع طرد وحظر المستخدمين
4. لا يستطيع تعيين مسؤولين آخرين (المذيع فقط)

### 3. اختبار مشغل الموسيقى

1. افتح مشغل الموسيقى
2. اختر ملف صوتي من الجهاز
3. تشغيل/إيقاف
4. تعديل الصوت
5. تأكد من سماع الموسيقى لدى جميع المستخدمين

---

## 🎨 الأيقونات المستخدمة

- **إدارة الغرفة**: `settings`
- **مشغل الموسيقى**: `musical-notes`
- **طرد**: `exit-outline`
- **حظر**: `ban-outline`
- **مسؤول**: `shield`
- **تشغيل**: `play`
- **إيقاف**: `pause`
- **إيقاف نهائي**: `stop`

---

## 🔒 الأمان

1. **التحقق من الصلاحيات** - كل API تتحقق من كون المستخدم مذيع أو مسؤول
2. **منع حظر المذيع** - لا يمكن حظر مالك الغرفة
3. **منع الحظر الذاتي** - المستخدم لا يستطيع حظر نفسه
4. **Socket Authentication** - تأكد من أن الـ socket يحتوي على معلومات المستخدم

---

## 📊 البيانات المحفوظة

### في قاعدة البيانات:

- قائمة المحظورين مع السبب والتاريخ
- قائمة المسؤولين مع من عيّنهم
- حالة مشغل الموسيقى (للاستمرار بعد الانقطاع)

### في الذاكرة:

- حالة تشغيل الموسيقى الفعلية
- مستوى الصوت المؤقت

---

## 🚀 جاهز!

الآن لديك نظام إدارة كامل للغرفة المباشرة مع:

- ✅ طرد وحظر المستخدمين
- ✅ تعيين المسؤولين
- ✅ مشغل موسيقى مزامن للجميع
- ✅ واجهة احترافية وسهلة الاستخدام

**المذيع الآن يتحكم في كل شيء! 🎯**
