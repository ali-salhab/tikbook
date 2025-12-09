import { useState, useEffect } from "react";
import axios from "axios";
import AdminLayout from "../components/AdminLayout";
import {
  FiUser,
  FiDollarSign,
  FiTrendingUp,
  FiGift,
  FiPlus,
  FiX,
} from "react-icons/fi";
import "../styles/RewardsManagement.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const RewardsManagement = ({ onLogout }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCoinsDistributed: 0,
    activeUsers: 0,
    averageBalance: 0,
    topUser: null,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("highestBalance");

  // Reward modal
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardReason, setRewardReason] = useState("");

  // Bulk reward
  const [showBulkRewardModal, setShowBulkRewardModal] = useState(false);
  const [bulkRewardAmount, setBulkRewardAmount] = useState("");
  const [bulkRewardReason, setBulkRewardReason] = useState("");

  useEffect(() => {
    fetchUsersWithWallets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, sortBy]);

  const fetchUsersWithWallets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");

      // Fetch users with wallet data
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = response.data;
      const usersArray = Array.isArray(usersData)
        ? usersData
        : usersData?.users || [];

      // Fetch wallet data for each user
      const usersWithWallets = await Promise.all(
        usersArray.map(async (user) => {
          try {
            const walletResponse = await axios.get(
              `${API_URL}/api/wallet/${user._id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            return { ...user, wallet: walletResponse.data };
          } catch (error) {
            return { ...user, wallet: { balance: 0 } };
          }
        })
      );

      setUsers(usersWithWallets);
      calculateStats(usersWithWallets);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (usersData) => {
    const totalCoins = usersData.reduce(
      (sum, user) => sum + (user.wallet?.balance || 0),
      0
    );
    const activeUsersCount = usersData.filter(
      (u) => (u.wallet?.balance || 0) > 0
    ).length;
    const averageBalance =
      usersData.length > 0 ? totalCoins / usersData.length : 0;
    const topUser = usersData.reduce(
      (max, user) =>
        (user.wallet?.balance || 0) > (max?.wallet?.balance || 0) ? user : max,
      usersData[0]
    );

    setStats({
      totalCoinsDistributed: totalCoins.toFixed(0),
      activeUsers: activeUsersCount,
      averageBalance: averageBalance.toFixed(0),
      topUser,
    });
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "highestBalance":
          return (b.wallet?.balance || 0) - (a.wallet?.balance || 0);
        case "lowestBalance":
          return (a.wallet?.balance || 0) - (b.wallet?.balance || 0);
        case "username":
          return (a.username || "").localeCompare(b.username || "");
        default:
          return 0;
      }
    });

    setFilteredUsers(filtered);
  };

  const handleGiveReward = async () => {
    if (!selectedUser || !rewardAmount || parseFloat(rewardAmount) <= 0) {
      alert("Please enter a valid reward amount");
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");
      await axios.post(
        `${API_URL}/api/wallet/add-coins`,
        {
          userId: selectedUser._id,
          amount: parseFloat(rewardAmount),
          reason: rewardReason || "Admin reward",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(
        `Successfully gave ${rewardAmount} coins to ${selectedUser.username}!`
      );
      setShowRewardModal(false);
      setRewardAmount("");
      setRewardReason("");
      fetchUsersWithWallets();
    } catch (error) {
      console.error("Error giving reward:", error);
      alert("Failed to give reward");
    }
  };

  const handleBulkReward = async () => {
    if (!bulkRewardAmount || parseFloat(bulkRewardAmount) <= 0) {
      alert("Please enter a valid reward amount");
      return;
    }

    if (
      !window.confirm(
        `Give ${bulkRewardAmount} coins to all ${filteredUsers.length} users?`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");
      await Promise.all(
        filteredUsers.map((user) =>
          axios.post(
            `${API_URL}/api/wallet/add-coins`,
            {
              userId: user._id,
              amount: parseFloat(bulkRewardAmount),
              reason: bulkRewardReason || "Bulk admin reward",
            },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );

      alert(
        `Successfully gave ${bulkRewardAmount} coins to ${filteredUsers.length} users!`
      );
      setShowBulkRewardModal(false);
      setBulkRewardAmount("");
      setBulkRewardReason("");
      fetchUsersWithWallets();
    } catch (error) {
      console.error("Error giving bulk reward:", error);
      alert("Failed to give bulk reward");
    }
  };

  const openRewardModal = (user) => {
    setSelectedUser(user);
    setShowRewardModal(true);
  };

  if (loading) {
    return (
      <AdminLayout onLogout={onLogout}>
        <div className="loading">Loading rewards...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onLogout={onLogout}>
      <div className="rewards-management">
        <div className="rewards-header">
          <h1>Rewards & Coins Management</h1>
          <button
            className="bulk-reward-btn"
            onClick={() => setShowBulkRewardModal(true)}
          >
            <FiGift /> Bulk Reward
          </button>
        </div>

        {/* Stats */}
        <div className="rewards-stats">
          <div className="stat-card">
            <FiDollarSign className="stat-icon" />
            <div>
              <h3>Total Coins</h3>
              <p>{stats.totalCoinsDistributed}</p>
            </div>
          </div>
          <div className="stat-card">
            <FiUser className="stat-icon" />
            <div>
              <h3>Active Users</h3>
              <p>{stats.activeUsers}</p>
            </div>
          </div>
          <div className="stat-card">
            <FiDollarSign className="stat-icon" />
            <div>
              <h3>Average Balance</h3>
              <p>{stats.averageBalance}</p>
            </div>
          </div>
          <div className="stat-card">
            <FiTrendingUp className="stat-icon" />
            <div>
              <h3>Top User</h3>
              <p>{stats.topUser?.username || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rewards-filters">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="highestBalance">Highest Balance</option>
            <option value="lowestBalance">Lowest Balance</option>
            <option value="username">Username (A-Z)</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Coin Balance</th>
                <th>Videos</th>
                <th>Followers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">
                    <FiDollarSign />
                    <p>No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="user-info">
                        <strong>{user.username}</strong>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className="coin-balance">
                        <FiDollarSign /> {user.wallet?.balance || 0}
                      </span>
                    </td>
                    <td>{user.videos?.length || 0}</td>
                    <td>{user.followers?.length || 0}</td>
                    <td>
                      <button
                        className="reward-btn"
                        onClick={() => openRewardModal(user)}
                      >
                        <FiPlus /> Give Reward
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Reward Modal */}
        {showRewardModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowRewardModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close"
                onClick={() => setShowRewardModal(false)}
              >
                <FiX />
              </button>
              <h2>Give Reward to {selectedUser?.username}</h2>
              <div className="modal-body">
                <div className="form-group">
                  <label>Coin Amount</label>
                  <input
                    type="number"
                    placeholder="Enter coin amount"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Reason (optional)</label>
                  <textarea
                    placeholder="Reason for reward..."
                    value={rewardReason}
                    onChange={(e) => setRewardReason(e.target.value)}
                    rows="3"
                  />
                </div>
                <button
                  className="submit-reward-btn"
                  onClick={handleGiveReward}
                >
                  <FiGift /> Give Reward
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Reward Modal */}
        {showBulkRewardModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowBulkRewardModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close"
                onClick={() => setShowBulkRewardModal(false)}
              >
                <FiX />
              </button>
              <h2>Bulk Reward to {filteredUsers.length} Users</h2>
              <div className="modal-body">
                <div className="form-group">
                  <label>Coin Amount Per User</label>
                  <input
                    type="number"
                    placeholder="Enter coin amount"
                    value={bulkRewardAmount}
                    onChange={(e) => setBulkRewardAmount(e.target.value)}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Reason (optional)</label>
                  <textarea
                    placeholder="Reason for bulk reward..."
                    value={bulkRewardReason}
                    onChange={(e) => setBulkRewardReason(e.target.value)}
                    rows="3"
                  />
                </div>
                <button
                  className="submit-reward-btn"
                  onClick={handleBulkReward}
                >
                  <FiGift /> Give Bulk Reward
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RewardsManagement;
