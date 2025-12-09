import { useState, useEffect } from "react";
import axios from "axios";
import AdminLayout from "../components/AdminLayout";
import {
  FiDollarSign,
  FiCreditCard,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiFilter,
  FiRefreshCw,
} from "react-icons/fi";
import "../styles/PaymentsManagement.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const PaymentsManagement = ({ onLogout }) => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Payment Gateway Configuration
  const [paymentGateways, setPaymentGateways] = useState({
    fawry: { enabled: true, apiKey: "", merchantCode: "" },
    paymob: { enabled: true, apiKey: "", integrationId: "" },
    vodafoneCash: { enabled: true, merchantId: "" },
  });

  useEffect(() => {
    fetchTransactions();
    loadPaymentGatewaySettings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    transactions,
    searchTerm,
    statusFilter,
    gatewayFilter,
    dateRange,
    sortBy,
  ]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      const response = await axios.get(`${API_URL}/api/admin/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;
      const transactionsArray = Array.isArray(data)
        ? data
        : data?.transactions || [];
      setTransactions(transactionsArray);
      calculateStats(transactionsArray);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentGatewaySettings = () => {
    // Load from localStorage or backend
    const saved = localStorage.getItem("paymentGateways");
    if (saved) {
      setPaymentGateways(JSON.parse(saved));
    }
  };

  const savePaymentGatewaySettings = () => {
    localStorage.setItem("paymentGateways", JSON.stringify(paymentGateways));
    alert("Payment gateway settings saved!");
  };

  const calculateStats = (transactionsData) => {
    const txData = Array.isArray(transactionsData) ? transactionsData : [];
    const totalRevenue = txData
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    setStats({
      totalRevenue: totalRevenue.toFixed(2),
      successfulPayments: txData.filter((t) => t.status === "completed").length,
      pendingPayments: txData.filter((t) => t.status === "pending").length,
      failedPayments: txData.filter((t) => t.status === "failed").length,
    });
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (transaction) =>
          transaction.userId?.username
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          transaction.transactionId
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          transaction.gateway?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Gateway filter
    if (gatewayFilter !== "all") {
      filtered = filtered.filter((t) => t.gateway === gatewayFilter);
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "thisWeek":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "thisMonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "thisYear":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((t) => new Date(t.createdAt) >= startDate);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "amount":
          return (b.amount || 0) - (a.amount || 0);
        default:
          return 0;
      }
    });

    setFilteredTransactions(filtered);
  };

  const handleRefundTransaction = async (transactionId) => {
    if (!window.confirm("Are you sure you want to refund this transaction?"))
      return;

    try {
      const token = localStorage.getItem("adminToken");
      await axios.post(
        `${API_URL}/api/admin/transactions/${transactionId}/refund`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchTransactions();
      alert("Transaction refunded successfully");
    } catch (error) {
      console.error("Error refunding transaction:", error);
      alert("Failed to refund transaction");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <FiCheckCircle className="status-icon success" />;
      case "failed":
        return <FiXCircle className="status-icon error" />;
      case "pending":
        return <FiClock className="status-icon pending" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AdminLayout onLogout={onLogout}>
        <div className="loading">Loading payments...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onLogout={onLogout}>
      <div className="payments-management">
        <h1>Payments Management</h1>

        {/* Stats */}
        <div className="payments-stats">
          <div className="stat-card">
            <FiDollarSign className="stat-icon" />
            <div>
              <h3>Total Revenue</h3>
              <p>${stats.totalRevenue}</p>
            </div>
          </div>
          <div className="stat-card">
            <FiCheckCircle className="stat-icon" />
            <div>
              <h3>Successful</h3>
              <p>{stats.successfulPayments}</p>
            </div>
          </div>
          <div className="stat-card">
            <FiClock className="stat-icon" />
            <div>
              <h3>Pending</h3>
              <p>{stats.pendingPayments}</p>
            </div>
          </div>
          <div className="stat-card">
            <FiXCircle className="stat-icon" />
            <div>
              <h3>Failed</h3>
              <p>{stats.failedPayments}</p>
            </div>
          </div>
        </div>

        {/* Payment Gateway Configuration */}
        <div className="payment-gateways-config">
          <h2>Payment Gateway Configuration</h2>
          <div className="gateways-grid">
            {/* Fawry */}
            <div className="gateway-card">
              <h3>Fawry</h3>
              <label>
                <input
                  type="checkbox"
                  checked={paymentGateways.fawry.enabled}
                  onChange={(e) =>
                    setPaymentGateways({
                      ...paymentGateways,
                      fawry: {
                        ...paymentGateways.fawry,
                        enabled: e.target.checked,
                      },
                    })
                  }
                />
                Enabled
              </label>
              <input
                type="text"
                placeholder="Merchant Code"
                value={paymentGateways.fawry.merchantCode}
                onChange={(e) =>
                  setPaymentGateways({
                    ...paymentGateways,
                    fawry: {
                      ...paymentGateways.fawry,
                      merchantCode: e.target.value,
                    },
                  })
                }
              />
              <input
                type="password"
                placeholder="API Key"
                value={paymentGateways.fawry.apiKey}
                onChange={(e) =>
                  setPaymentGateways({
                    ...paymentGateways,
                    fawry: { ...paymentGateways.fawry, apiKey: e.target.value },
                  })
                }
              />
            </div>

            {/* Paymob */}
            <div className="gateway-card">
              <h3>Paymob</h3>
              <label>
                <input
                  type="checkbox"
                  checked={paymentGateways.paymob.enabled}
                  onChange={(e) =>
                    setPaymentGateways({
                      ...paymentGateways,
                      paymob: {
                        ...paymentGateways.paymob,
                        enabled: e.target.checked,
                      },
                    })
                  }
                />
                Enabled
              </label>
              <input
                type="text"
                placeholder="Integration ID"
                value={paymentGateways.paymob.integrationId}
                onChange={(e) =>
                  setPaymentGateways({
                    ...paymentGateways,
                    paymob: {
                      ...paymentGateways.paymob,
                      integrationId: e.target.value,
                    },
                  })
                }
              />
              <input
                type="password"
                placeholder="API Key"
                value={paymentGateways.paymob.apiKey}
                onChange={(e) =>
                  setPaymentGateways({
                    ...paymentGateways,
                    paymob: {
                      ...paymentGateways.paymob,
                      apiKey: e.target.value,
                    },
                  })
                }
              />
            </div>

            {/* Vodafone Cash */}
            <div className="gateway-card">
              <h3>Vodafone Cash</h3>
              <label>
                <input
                  type="checkbox"
                  checked={paymentGateways.vodafoneCash.enabled}
                  onChange={(e) =>
                    setPaymentGateways({
                      ...paymentGateways,
                      vodafoneCash: {
                        ...paymentGateways.vodafoneCash,
                        enabled: e.target.checked,
                      },
                    })
                  }
                />
                Enabled
              </label>
              <input
                type="text"
                placeholder="Merchant ID"
                value={paymentGateways.vodafoneCash.merchantId}
                onChange={(e) =>
                  setPaymentGateways({
                    ...paymentGateways,
                    vodafoneCash: {
                      ...paymentGateways.vodafoneCash,
                      merchantId: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
          <button
            className="save-gateways-btn"
            onClick={savePaymentGatewaySettings}
          >
            <FiCheckCircle /> Save Gateway Settings
          </button>
        </div>

        {/* Filters */}
        <div className="payments-filters">
          <input
            type="text"
            placeholder="Search by user, transaction ID, or gateway..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
          >
            <option value="all">All Gateways</option>
            <option value="fawry">Fawry</option>
            <option value="paymob">Paymob</option>
            <option value="vodafoneCash">Vodafone Cash</option>
            <option value="stripe">Stripe</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">This Month</option>
            <option value="thisYear">This Year</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount">Highest Amount</option>
          </select>

          <button className="refresh-btn" onClick={fetchTransactions}>
            <FiRefreshCw /> Refresh
          </button>
        </div>

        {/* Transactions Table */}
        <div className="transactions-table-wrapper">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Gateway</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">
                    <FiFilter />
                    <p>No transactions found</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td>{transaction.transactionId || transaction._id}</td>
                    <td>{transaction.userId?.username || "Unknown"}</td>
                    <td className="amount">
                      ${transaction.amount?.toFixed(2) || "0.00"}
                    </td>
                    <td>
                      <span className={`gateway-badge ${transaction.gateway}`}>
                        {transaction.gateway || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${transaction.status}`}>
                        {getStatusIcon(transaction.status)}
                        {transaction.status}
                      </span>
                    </td>
                    <td>{formatDate(transaction.createdAt)}</td>
                    <td>
                      {transaction.status === "completed" && (
                        <button
                          className="refund-btn"
                          onClick={() =>
                            handleRefundTransaction(transaction._id)
                          }
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PaymentsManagement;
