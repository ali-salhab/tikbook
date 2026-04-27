import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import GradientBackground from "../components/GradientBackground";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import { ms, fs } from "../utils/responsive";

const STATUS_META = {
  pending: {
    label: "قيد المراجعة",
    color: "#F5C518",
    bg: "rgba(245,197,24,0.15)",
    icon: "time-outline",
  },
  processing: {
    label: "قيد المعالجة",
    color: "#3DA9FC",
    bg: "rgba(61,169,252,0.18)",
    icon: "sync-outline",
  },
  approved: {
    label: "تمت الموافقة",
    color: "#4ADE80",
    bg: "rgba(74,222,128,0.18)",
    icon: "checkmark-circle-outline",
  },
  rejected: {
    label: "مرفوض",
    color: "#FE2C55",
    bg: "rgba(254,44,85,0.18)",
    icon: "close-circle-outline",
  },
};

const formatDate = (d) => {
  if (!d) return "";
  try {
    const date = new Date(d);
    return date.toLocaleString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const StatusPill = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <View
      style={[
        styles.statusPill,
        { backgroundColor: meta.bg, borderColor: meta.color },
      ]}
    >
      <Ionicons name={meta.icon} size={14} color={meta.color} />
      <Text style={[styles.statusPillText, { color: meta.color }]}>
        {meta.label}
      </Text>
    </View>
  );
};

const TimelineRow = ({ item, isLast }) => {
  const meta = STATUS_META[item.status] || STATUS_META.pending;
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineDotCol}>
        <View style={[styles.timelineDot, { borderColor: meta.color }]}>
          <Ionicons name={meta.icon} size={12} color={meta.color} />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineBody}>
        <Text style={[styles.timelineStatus, { color: meta.color }]}>
          {meta.label}
        </Text>
        {!!item.note && <Text style={styles.timelineNote}>{item.note}</Text>}
        <Text style={styles.timelineDate}>{formatDate(item.changedAt)}</Text>
      </View>
    </View>
  );
};

const WithdrawalsTrackingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userToken } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [usdPerCoin, setUsdPerCoin] = useState(0.01);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/wallet/withdrawals/me`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setRequests(res.data?.requests || []);
      if (res.data?.usdPerCoin) setUsdPerCoin(res.data.usdPerCoin);
    } catch (e) {
      console.log("Tracking fetch error:", e?.message);
    }
  }, [userToken]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    })();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const counts = useMemo(() => {
    const c = { pending: 0, processing: 0, approved: 0, rejected: 0 };
    requests.forEach((r) => {
      if (c[r.status] != null) c[r.status] += 1;
    });
    return c;
  }, [requests]);

  return (
    <SafeAreaView style={styles.container}>
      <GradientBackground />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-forward" size={22} color="#F0EEFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تتبع طلبات السحب</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={onRefresh}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh" size={20} color="#F0EEFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FE2C55" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 30) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FE2C55"
              colors={["#FE2C55"]}
            />
          }
        >
          {/* Summary chips */}
          <View style={styles.summaryRow}>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <View
                key={key}
                style={[
                  styles.summaryChip,
                  { backgroundColor: meta.bg, borderColor: meta.color },
                ]}
              >
                <Ionicons name={meta.icon} size={14} color={meta.color} />
                <Text style={[styles.summaryChipText, { color: meta.color }]}>
                  {meta.label} ({counts[key] || 0})
                </Text>
              </View>
            ))}
          </View>

          {requests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color="rgba(220,210,255,0.4)"
              />
              <Text style={styles.emptyTitle}>لا توجد طلبات سحب</Text>
              <Text style={styles.emptySubtitle}>
                ستظهر هنا جميع طلبات السحب التي قمت بإرسالها
              </Text>
            </View>
          ) : (
            requests.map((r) => {
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              const usd = Number(r.amountUsd ?? 0).toFixed(2);
              return (
                <TouchableOpacity
                  key={r._id}
                  style={[
                    styles.requestCard,
                    { borderLeftColor: meta.color, borderLeftWidth: 3 },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setSelected(r)}
                >
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.amountText}>${usd}</Text>
                    <StatusPill status={r.status} />
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="person-outline"
                      size={14}
                      color="rgba(220,210,255,0.7)"
                    />
                    <Text style={styles.metaText}>{r.fullName}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="call-outline"
                      size={14}
                      color="rgba(220,210,255,0.7)"
                    />
                    <Text style={styles.metaText}>{r.phoneNumber}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color="rgba(220,210,255,0.7)"
                    />
                    <Text style={styles.metaText}>
                      {formatDate(r.createdAt)}
                    </Text>
                  </View>
                  {!!r.adminNote && (
                    <View
                      style={[
                        styles.noteBox,
                        {
                          backgroundColor: meta.bg,
                          borderColor: meta.color,
                        },
                      ]}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={14}
                        color={meta.color}
                      />
                      <Text style={[styles.noteText, { color: meta.color }]}>
                        {r.adminNote}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.viewDetailsText}>
                    عرض السجل الكامل ›
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelected(null)}
        >
          <Pressable
            style={styles.modalSheet}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>تفاصيل طلب السحب</Text>
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalAmountWrap}>
                  <Text style={styles.modalAmount}>
                    ${Number(selected.amountUsd ?? 0).toFixed(2)}
                  </Text>
                  <StatusPill status={selected.status} />
                </View>
                <View style={styles.modalInfoBlock}>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>الاسم الكامل</Text>
                    <Text style={styles.modalValue}>{selected.fullName}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>رقم الهاتف</Text>
                    <Text style={styles.modalValue}>
                      {selected.phoneNumber}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>عدد العملات</Text>
                    <Text style={styles.modalValue}>
                      {selected.amount} عملة
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>تاريخ الإنشاء</Text>
                    <Text style={styles.modalValue}>
                      {formatDate(selected.createdAt)}
                    </Text>
                  </View>
                  {!!selected.reviewedAt && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>تاريخ المراجعة</Text>
                      <Text style={styles.modalValue}>
                        {formatDate(selected.reviewedAt)}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.modalSectionTitle}>سجل الحالة</Text>
                <View style={styles.timeline}>
                  {(selected.statusHistory && selected.statusHistory.length > 0
                    ? selected.statusHistory
                    : [
                        {
                          status: "pending",
                          note: "تم إنشاء الطلب",
                          changedAt: selected.createdAt,
                        },
                      ]
                  ).map((h, i, arr) => (
                    <TimelineRow
                      key={`${h.status}-${i}`}
                      item={h}
                      isLast={i === arr.length - 1}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelected(null)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalCloseText}>إغلاق</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
    borderBottomWidth: 1,
    borderBottomColor: "#2A2550",
  },
  headerBtn: {
    width: ms(36),
    height: ms(36),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#F0EEFF",
    fontSize: fs(16),
    fontWeight: "bold",
  },
  scrollContent: { padding: ms(16) },
  summaryRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: ms(8),
    marginBottom: ms(16),
  },
  summaryChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: ms(6),
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
    borderRadius: ms(20),
    borderWidth: 1,
  },
  summaryChipText: { fontSize: fs(11), fontWeight: "700" },
  emptyBox: {
    alignItems: "center",
    padding: ms(40),
    backgroundColor: "#151228",
    borderRadius: ms(12),
    gap: ms(10),
  },
  emptyTitle: {
    color: "#F0EEFF",
    fontSize: fs(15),
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "rgba(220,210,255,0.6)",
    fontSize: fs(12),
    textAlign: "center",
  },
  requestCard: {
    backgroundColor: "#151228",
    borderRadius: ms(12),
    padding: ms(14),
    marginBottom: ms(12),
    gap: ms(6),
  },
  cardHeaderRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ms(6),
  },
  amountText: {
    color: "#F0EEFF",
    fontSize: fs(20),
    fontWeight: "800",
  },
  statusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: ms(6),
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(20),
    borderWidth: 1,
  },
  statusPillText: { fontSize: fs(11), fontWeight: "700" },
  metaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: ms(6),
  },
  metaText: {
    color: "rgba(220,210,255,0.85)",
    fontSize: fs(12),
  },
  noteBox: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: ms(6),
    padding: ms(8),
    borderRadius: ms(8),
    borderWidth: 1,
    marginTop: ms(6),
  },
  noteText: {
    fontSize: fs(12),
    flex: 1,
    textAlign: "right",
  },
  viewDetailsText: {
    color: "rgba(160,140,255,0.85)",
    fontSize: fs(11),
    textAlign: "right",
    marginTop: ms(4),
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#0E0B22",
    borderTopLeftRadius: ms(18),
    borderTopRightRadius: ms(18),
    paddingHorizontal: ms(16),
    paddingTop: ms(8),
    paddingBottom: ms(20),
    maxHeight: "85%",
  },
  modalHandle: {
    alignSelf: "center",
    width: ms(40),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: "rgba(220,210,255,0.4)",
    marginBottom: ms(10),
  },
  modalTitle: {
    color: "#F0EEFF",
    fontSize: fs(16),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: ms(12),
  },
  modalAmountWrap: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#151228",
    padding: ms(14),
    borderRadius: ms(10),
    marginBottom: ms(12),
  },
  modalAmount: {
    color: "#F0EEFF",
    fontSize: fs(24),
    fontWeight: "800",
  },
  modalInfoBlock: {
    backgroundColor: "#151228",
    padding: ms(12),
    borderRadius: ms(10),
    gap: ms(8),
    marginBottom: ms(14),
  },
  modalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  modalLabel: { color: "rgba(220,210,255,0.6)", fontSize: fs(12) },
  modalValue: { color: "#F0EEFF", fontSize: fs(13), fontWeight: "600" },
  modalSectionTitle: {
    color: "#F0EEFF",
    fontSize: fs(14),
    fontWeight: "700",
    textAlign: "right",
    marginBottom: ms(8),
  },
  timeline: { marginBottom: ms(14) },
  timelineRow: { flexDirection: "row-reverse", gap: ms(10), minHeight: ms(48) },
  timelineDotCol: { alignItems: "center", width: ms(24) },
  timelineDot: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    borderWidth: 1.5,
    backgroundColor: "#0E0B22",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "rgba(220,210,255,0.18)",
    marginTop: 2,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: ms(12),
  },
  timelineStatus: {
    fontSize: fs(13),
    fontWeight: "700",
    textAlign: "right",
  },
  timelineNote: {
    color: "rgba(220,210,255,0.85)",
    fontSize: fs(12),
    textAlign: "right",
    marginTop: ms(2),
  },
  timelineDate: {
    color: "rgba(220,210,255,0.55)",
    fontSize: fs(11),
    textAlign: "right",
    marginTop: ms(2),
  },
  modalCloseBtn: {
    backgroundColor: "#FE2C55",
    padding: ms(12),
    borderRadius: ms(10),
    alignItems: "center",
    marginTop: ms(8),
  },
  modalCloseText: { color: "#FFF", fontWeight: "700", fontSize: fs(14) },
});

export default WithdrawalsTrackingScreen;
