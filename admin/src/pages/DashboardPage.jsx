import React, { useEffect, useState } from "react";
import axios from "axios";
import { api } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminNav from "../components/AdminNav";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const DashboardPage = () => {
  const [stats, setStats] = useState({ users: 0, videos: 0 });
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [sending, setSending] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/");
      return;
    }

    fetchData(token);
  }, [navigate]);

  const fetchData = async (token) => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const statsRes = await axios.get(`${api.admin}/stats`, config);
      setStats(statsRes.data);

      const usersRes = await axios.get(`${api.admin}/users`, config);
      const usersData = usersRes.data;
      // Backend may return { users: [...] } or an array; normalize to array
      const usersArray = Array.isArray(usersData)
        ? usersData
        : usersData?.users || [];
      setUsers(usersArray);

      // Fetch videos (admin scoped)
      const videosRes = await axios.get(`${api.admin}/videos`, config);
      const videosData = videosRes.data;
      const videosArray = Array.isArray(videosData)
        ? videosData
        : videosData?.videos || [];
      setVideos(videosArray);
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
      }
    }
  };

  const deleteUser = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      try {
        const token = localStorage.getItem("adminToken");
        await axios.delete(`http://localhost:5001/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(users.filter((user) => user._id !== id));
        alert("تم حذف المستخدم بنجاح");
      } catch (error) {
        console.error(error);
        alert("فشل حذف المستخدم");
      }
    }
  };

  const openNotificationModal = (user) => {
    setSelectedUser(user);
    setNotificationTitle("");
    setNotificationBody("");
    setShowNotificationModal(true);
  };

  const openGrantModal = (user) => {
    setSelectedUser(user);
    setGrantAmount("");
    setGrantReason("");
    setShowGrantModal(true);
  };

  const handleGrantCoins = async () => {
    if (!grantAmount) {
      alert("يرجى إدخال المبلغ");
      return;
    }
    setSending(true);
    try {
      const token = localStorage.getItem("adminToken");
      await axios.post(
        `${api.admin}/wallet/grant`,
        {
          userId: selectedUser._id,
          amount: grantAmount,
          reason: grantReason,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("تم إرسال العملات بنجاح");
      setShowGrantModal(false);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "فشل إرسال العملات");
    } finally {
      setSending(false);
    }
  };

  const sendNotification = async () => {
    if (!notificationTitle || !notificationBody) {
      alert("يرجى ملء جميع الحقول");
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem("adminToken");
      await axios.post(
        `${api.admin}/notify/${selectedUser._id}`,
        {
          title: notificationTitle,
          body: notificationBody,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("تم إرسال الإشعار بنجاح");
      setShowNotificationModal(false);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "فشل إرسال الإشعار");
    } finally {
      setSending(false);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle || !broadcastBody) {
      alert("يرجى ملء جميع الحقول");
      return;
    }
    setSending(true);
    try {
      const token = localStorage.getItem("adminToken");
      await axios.post(
        `${api.admin}/notify/all`,
        {
          title: broadcastTitle,
          body: broadcastBody,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("تم إرسال الإشعار العام بنجاح");
      setBroadcastOpen(false);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "فشل إرسال الإشعار العام");
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation */}
      <AdminNav onLogout={handleLogout} />

      <div className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "overview"
                ? "border-b-2 border-pink-500 text-pink-600"
                : "text-gray-600 hover:text-pink-500"
            }`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setBroadcastOpen(true)}
            className="ml-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
          >
            بث إشعار عام
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "users"
                ? "border-b-2 border-pink-500 text-pink-600"
                : "text-gray-600 hover:text-pink-500"
            }`}
          >
            المستخدمون
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "videos"
                ? "border-b-2 border-pink-500 text-pink-600"
                : "text-gray-600 hover:text-pink-500"
            }`}
          >
            الفيديوهات
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">الإحصائيات</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">
                      إجمالي المستخدمين
                    </p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {stats.users}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <svg
                      className="w-8 h-8 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">
                      إجمالي الفيديوهات
                    </p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {stats.videos}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <svg
                      className="w-8 h-8 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">
                      المشرفون
                    </p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {users.filter((u) => u.isAdmin).length}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <svg
                      className="w-8 h-8 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">
                  المستخدمون خلال 6 أشهر
                </h3>
                <Bar
                  data={{
                    labels:
                      stats.charts?.usersByMonth?.map((x) => x.label) || [],
                    datasets: [
                      {
                        label: "مستخدمون",
                        data:
                          stats.charts?.usersByMonth?.map((x) => x.value) || [],
                        backgroundColor: "rgba(236, 72, 153, 0.5)",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: "top" } },
                  }}
                />
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">
                  الفيديوهات خلال 6 أشهر
                </h3>
                <Bar
                  data={{
                    labels:
                      stats.charts?.videosByMonth?.map((x) => x.label) || [],
                    datasets: [
                      {
                        label: "فيديوهات",
                        data:
                          stats.charts?.videosByMonth?.map((x) => x.value) ||
                          [],
                        backgroundColor: "rgba(147, 51, 234, 0.5)",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: "top" } },
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">اتصال المستخدمين</h3>
                <Doughnut
                  data={{
                    labels: (stats.charts?.connectionSplit || []).map(
                      (x) => x.name
                    ),
                    datasets: [
                      {
                        data: (stats.charts?.connectionSplit || []).map(
                          (x) => x.value
                        ),
                        backgroundColor: ["#10B981", "#EF4444"],
                      },
                    ],
                  }}
                />
                <div className="mt-4 text-sm text-gray-600">
                  <p>متصل: {stats.connectedUsers || 0}</p>
                  <p>غير متصل: {stats.disconnectedUsers || 0}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">أكثر المبدعين نشاطًا</h3>
                <div className="space-y-3">
                  {(stats.topCreators || []).map((c) => (
                    <div
                      key={c.userId}
                      className="flex justify-between p-3 bg-gray-50 rounded"
                    >
                      <span className="font-semibold">@{c.username}</span>
                      <span className="text-sm text-gray-600">
                        فيديوهات: {c.videosCount} | إعجابات: {c.totalLikes}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">الأكثر متابعة</h3>
                <div className="space-y-3">
                  {(stats.topFollowed || []).map((u) => (
                    <div
                      key={u.userId || u._id}
                      className="flex justify-between p-3 bg-gray-50 rounded"
                    >
                      <span className="font-semibold">@{u.username}</span>
                      <span className="text-sm text-gray-600">
                        متابعون: {u.followersCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mt-8">
              <h3 className="text-xl font-bold mb-4">أفضل الفيديوهات</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(stats.topVideos || []).map((video) => (
                  <div
                    key={video.videoId}
                    className="bg-white rounded-lg shadow border"
                  >
                    <div className="aspect-video bg-gray-200">
                      <video
                        src={video.videoUrl}
                        className="w-full h-full object-cover"
                        controls
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-2">
                        @{video.username}
                      </p>
                      <p className="text-gray-800 line-clamp-2">
                        {video.description}
                      </p>
                      <div className="mt-3 flex justify-between text-sm text-gray-500">
                        <span>إعجابات: {video.likesCount}</span>
                        <span>تعليقات: {video.commentsCount}</span>
                        <span>مشاهدات: {video.views}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">إدارة المستخدمين</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      اسم المستخدم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      البريد الإلكتروني
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.isAdmin
                              ? "bg-purple-100 text-purple-600"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          {user.isAdmin ? "مشرف" : "نشط"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openNotificationModal(user)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
                          >
                            إرسال إشعار
                          </button>
                          <button
                            onClick={() => openGrantModal(user)}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-semibold"
                          >
                            إهداء عملات
                          </button>
                          {!user.isAdmin && (
                            <button
                              onClick={() => deleteUser(user._id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === "videos" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">إدارة الفيديوهات</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <div
                  key={video._id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <div className="aspect-video bg-gray-200 relative">
                    <video
                      src={video.videoUrl}
                      className="w-full h-full object-cover"
                      controls
                    />
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                      {video.likes?.length || 0} إعجاب
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-2">
                      @{video.user?.username}
                    </p>
                    <p className="text-gray-800 line-clamp-2">
                      {video.description}
                    </p>
                    <div className="mt-3 flex justify-between items-center text-sm text-gray-500">
                      <span>{video.comments?.length || 0} تعليق</span>
                      <span>{video.views || 0} مشاهدة</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              إرسال إشعار إلى @{selectedUser?.username}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                عنوان الإشعار
              </label>
              <input
                type="text"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="مثال: رسالة من الإدارة"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                نص الإشعار
              </label>
              <textarea
                value={notificationBody}
                onChange={(e) => setNotificationBody(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                rows="4"
                placeholder="اكتب نص الإشعار هنا..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
                disabled={sending}
              >
                إلغاء
              </button>
              <button
                onClick={sendNotification}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition font-semibold disabled:bg-gray-400"
                disabled={sending}
              >
                {sending ? "جاري الإرسال..." : "إرسال"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant Coins Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              إهداء عملات إلى @{selectedUser?.username}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                عدد العملات
              </label>
              <input
                type="number"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="مثال: 100"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                السبب (اختياري)
              </label>
              <input
                type="text"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="مثال: مكافأة مسابقة"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowGrantModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
                disabled={sending}
              >
                إلغاء
              </button>
              <button
                onClick={handleGrantCoins}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-semibold disabled:bg-gray-400"
                disabled={sending}
              >
                {sending ? "جاري الإرسال..." : "إرسال"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {broadcastOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              إرسال إشعار عام لكل المستخدمين
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                عنوان الإشعار
              </label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="مثال: تحديث مهم"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                نص الإشعار
              </label>
              <textarea
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                rows="4"
                placeholder="اكتب نص الإشعار هنا..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBroadcastOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
                disabled={sending}
              >
                إلغاء
              </button>
              <button
                onClick={sendBroadcast}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition font-semibold disabled:bg-gray-400"
                disabled={sending}
              >
                {sending ? "جاري الإرسال..." : "إرسال"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
