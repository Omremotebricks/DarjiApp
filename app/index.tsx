import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Cross-platform alert helper (Alert.alert doesn't work on web)
const crossAlert = (
  title: string,
  message: string,
  buttons?: Array<{ text: string; style?: string; onPress?: () => void }>,
) => {
  if (Platform.OS === "web") {
    if (buttons && buttons.length > 1) {
      const destructive = buttons.find((b) => b.style === "destructive");
      if (destructive && window.confirm(`${title}\n\n${message}`)) {
        destructive.onPress?.();
      }
    } else {
      window.alert(`${title}\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons as any);
  }
};

const Stack = createStackNavigator();
const STORAGE_KEY = "@tailor_customers_data";

export interface Order {
  id: string;
  category: string;
  status: string;
  total: number;
  advance: number;
  chest: string;
  waist: string;
  length: string;
  date: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  orders: Order[];
}

function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = new Animated.Value(0);
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    setTimeout(onFinish, 2000);
  }, []);

  return (
    <View style={styles.splashContainer}>
      <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
        <MaterialCommunityIcons name="content-cut" size={100} color="#fff" />
        <Text style={styles.splashTitle}>DARJI BOOK PRO</Text>
        <Text style={styles.splashSub}>v2.0 • Data Migrated</Text>
      </Animated.View>
    </View>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          const rawData = JSON.parse(saved);

          // 1. MIGRATION & NORMALIZATION
          const migratedData: Customer[] = rawData.map((c: any) => {
            if (c.orders) return c;
            return {
              id: c.id,
              name: c.name,
              phone: c.phone,
              orders: [
                {
                  id: c.id + "_order",
                  category: c.category || "Regular",
                  status: c.status || "Pending",
                  total: c.total || 0,
                  advance: c.advance || 0,
                  chest: c.chest || "",
                  waist: c.waist || "",
                  length: c.length || "",
                  date: Date.now(),
                },
              ],
            };
          });

          // 2. DEDUPLICATION (Fixes "seed_client_X" duplicate crashes)
          const uniqueData: Customer[] = [];
          const seenIds = new Set();
          migratedData.forEach((c) => {
            if (!seenIds.has(c.id)) {
              seenIds.add(c.id);
              uniqueData.push(c);
            }
          });

          setCustomers(uniqueData);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueData));
        }
      } catch (e) {
        console.log("Load Error", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const saveToDisk = async (newList: Customer[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      setCustomers(newList);
    } catch (e) {
      crossAlert("Error", "Could not save data");
    }
  };

  const saveOrder = (
    customerId: string | undefined,
    name: string,
    phone: string,
    orderData: Order,
  ) => {
    let newList = [...customers];
    if (customerId) {
      // Re-order existing
      newList = newList.map((c) =>
        c.id === customerId ? { ...c, orders: [...c.orders, orderData] } : c,
      );
    } else {
      // Brand new client
      newList.push({
        id: Date.now().toString(),
        name,
        phone,
        orders: [orderData],
      });
    }
    saveToDisk(newList);
  };

  const deleteCustomer = (id: string) => {
    const newList = customers.filter((c) => c.id !== id);
    saveToDisk(newList);
  };

  const deleteOrder = (customerId: string, orderId: string) => {
    const newList = customers.map((c) => {
      if (c.id === customerId) {
        return { ...c, orders: c.orders.filter((o) => o.id !== orderId) };
      }
      return c;
    });
    saveToDisk(newList);
  };

  const updateOrderStatus = (
    customerId: string,
    orderId: string,
    newStatus: string,
    newAdvance?: number,
  ) => {
    const newList = customers.map((c) => {
      if (c.id === customerId) {
        return {
          ...c,
          orders: c.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: newStatus,
                  advance: newAdvance !== undefined ? newAdvance : o.advance,
                }
              : o,
          ),
        };
      }
      return c;
    });
    saveToDisk(newList);
  };

  const seedTestData = () => {
    const dummyNames = [
      "Rajesh Kumar",
      "Anjali Sharma",
      "Vikram Singh",
      "Priya Verma",
      "Arjun Gupta",
      "Sunita Devi",
      "Rohan Mehta",
      "Kavita Reddy",
      "Deepak Joshi",
      "Pooja Malhotra",
    ];
    const dummyPhones = [
      "03001234567",
      "03219876543",
      "03124567890",
      "03335554443",
      "03451112223",
      "03152223334",
      "03204445556",
      "03017778889",
      "03119990001",
      "03448887776",
    ];

    const newClients: Customer[] = dummyNames.map((name, i) => {
      const timestamp = Date.now() + i;
      const orders: Order[] = [
        {
          id: `seed_ord_${timestamp}_1`,
          category: i % 3 === 0 ? "VIP" : i % 3 === 1 ? "Urgent" : "Regular",
          status: i % 2 === 0 ? "Pending" : "Ready",
          total: 5000 + i * 100,
          advance: i % 2 === 0 ? 1500 : 5000 + i * 100,
          chest: (38 + i).toString(),
          waist: (32 + i).toString(),
          length: (40 + i).toString(),
          date: Date.now() - i * 86400000,
        },
      ];

      if (i % 4 === 0) {
        orders.push({
          id: `seed_ord_${timestamp}_2`,
          category: "Regular",
          status: "Pending",
          total: 3000,
          advance: 500,
          chest: (39 + i).toString(),
          waist: (33 + i).toString(),
          length: (41 + i).toString(),
          date: Date.now(),
        });
      }

      return {
        id: `seed_client_${timestamp}`,
        name,
        phone: dummyPhones[i],
        orders,
      };
    });

    saveToDisk([...customers, ...newClients]);
    crossAlert("Success", "10 Test Clients added!");
  };

  const clearAllData = () => {
    crossAlert(
      "Clear All Data",
      "Are you sure you want to delete EVERY client and order? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: () => {
            setCustomers([]);
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
          },
        },
      ],
    );
  };

  if (showSplash || loading)
    return <SplashScreen onFinish={() => setShowSplash(false)} />;

  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <StatusBar barStyle="light-content" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: "#065f46", elevation: 0 },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "bold" },
          }}
        >
          <Stack.Screen name="Home" options={{ headerShown: false }}>
            {(props) => (
              <HomeScreen
                {...props}
                customers={customers}
                seedTestData={seedTestData}
                clearAllData={clearAllData}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="List" options={{ title: "Client Directory" }}>
            {(props) => <CustomerListScreen {...props} customers={customers} />}
          </Stack.Screen>
          <Stack.Screen name="Add" options={{ title: "New Order" }}>
            {(props) => <AddCustomerScreen {...props} saveOrder={saveOrder} />}
          </Stack.Screen>
          <Stack.Screen name="Detail" options={{ title: "Client Profile" }}>
            {(props) => (
              <DetailScreen
                {...props}
                customers={customers}
                updateOrderStatus={updateOrderStatus}
                deleteCustomer={deleteCustomer}
                deleteOrder={deleteOrder}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}

// --- SCREEN 1: DASHBOARD ---
function HomeScreen({
  navigation,
  customers,
  seedTestData,
  clearAllData,
}: {
  navigation: any;
  customers: Customer[];
  seedTestData: () => void;
  clearAllData: () => void;
}) {
  const safeData = customers || [];
  const totalOrders = safeData.reduce((acc, c) => acc + c.orders.length, 0);
  const pendingOrders = safeData.reduce(
    (acc, c) => acc + c.orders.filter((o) => o.status === "Pending").length,
    0,
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.proHeader}>
        <View>
          <Text style={styles.shopSub}>Premium Tailoring</Text>
          <Text style={styles.shopName}>Master Stitch Studio</Text>
        </View>
        <MaterialCommunityIcons name="shield-check" size={32} color="#fff" />
      </View>

      <View style={styles.dashStats}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate("List", { filter: "All" })}
        >
          <MaterialCommunityIcons
            name="format-list-checks"
            size={24}
            color="#059669"
          />
          <Text style={styles.statVal}>{totalOrders}</Text>
          <Text style={styles.statLab}>Total Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: "#fffbeb" }]}
          onPress={() => navigation.navigate("List", { filter: "Pending" })}
        >
          <MaterialCommunityIcons name="clock-fast" size={24} color="#d97706" />
          <Text style={[styles.statVal, { color: "#d97706" }]}>
            {pendingOrders}
          </Text>
          <Text style={styles.statLab}>Pending</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 20 }}>
        <Text style={styles.secTitle}>Operations</Text>
        <MenuIconBtn
          title="New Client Order"
          sub="Register new measurements"
          icon="account-plus"
          color="#10b981"
          onPress={() => navigation.navigate("Add")}
        />
        <MenuIconBtn
          title="View Directory"
          sub="Manage all clients & orders"
          icon="book-open-outline"
          color="#3b82f6"
          onPress={() => navigation.navigate("List")}
        />

        <View style={{ marginTop: 40, alignItems: "center" }}>
          <TouchableOpacity
            style={{ marginBottom: 15, opacity: 0.5 }}
            onPress={seedTestData}
          >
            <Text
              style={{ color: "#64748b", fontSize: 12, fontWeight: "bold" }}
            >
              DEBUG: SEED 10 TEST CLIENTS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ opacity: 0.8 }} onPress={clearAllData}>
            <Text
              style={{ color: "#ef4444", fontSize: 13, fontWeight: "bold" }}
            >
              🗑️ CLEAR ALL DATABASE
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- SCREEN 2: LIST ---
function CustomerListScreen({
  navigation,
  route,
  customers,
}: {
  navigation: any;
  route: any;
  customers: Customer[];
}) {
  const filter = route.params?.filter || "All";
  const [query, setQuery] = useState("");
  const safeData = customers || [];

  const filtered = safeData.filter((c) => {
    const hasStatus =
      filter === "All" || c.orders.some((o) => o.status === filter);
    return (
      hasStatus &&
      (c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.phone.includes(query))
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchIn}
          placeholder="Find by name or phone..."
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const totalBal = item.orders.reduce(
            (acc, o) => acc + (o.total - o.advance),
            0,
          );
          const activeOrders = item.orders.filter(
            (o) => o.status === "Pending",
          ).length;

          return (
            <TouchableOpacity
              style={styles.clientItem}
              onPress={() =>
                navigation.navigate("Detail", { customerId: item.id })
              }
            >
              <View style={styles.clientInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPhone}>📞 {item.phone}</Text>
                <View
                  style={[
                    styles.tag,
                    {
                      backgroundColor: activeOrders > 0 ? "#059669" : "#64748b",
                      marginTop: 6,
                    },
                  ]}
                >
                  <Text style={styles.tagTxt}>
                    {activeOrders} Active Orders
                  </Text>
                </View>
              </View>
              <View
                style={{ alignItems: "flex-end", justifyContent: "center" }}
              >
                <Text style={styles.balTxt}>Bal: Rs {totalBal}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// --- SCREEN 3: ADD ---
function AddCustomerScreen({
  navigation,
  saveOrder,
  route,
}: {
  navigation: any;
  saveOrder: (cid: string | undefined, n: string, p: string, o: Order) => void;
  route: any;
}) {
  const prefill = route.params?.customer as Customer | undefined;

  const [f, setF] = useState({
    name: prefill ? prefill.name : "",
    phone: prefill ? prefill.phone : "",
    category: "Regular",
    status: "Pending",
    total: 0,
    advance: 0,
    chest: "",
    waist: "",
    length: "",
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formSection}>
        {!prefill && (
          <>
            <Text style={styles.formHeadline}>Client Profile</Text>
            <TextInput
              style={styles.proInput}
              placeholder="Client Full Name"
              value={f.name}
              onChangeText={(v) => setF({ ...f, name: v })}
            />
            <TextInput
              style={styles.proInput}
              placeholder="Phone Number"
              keyboardType="numeric"
              value={f.phone}
              onChangeText={(v) =>
                setF({ ...f, phone: v.replace(/[^0-9]/g, "") })
              }
            />
          </>
        )}

        <Text style={[styles.formHeadline, { marginTop: prefill ? 0 : 20 }]}>
          Order Type
        </Text>
        <View style={styles.row}>
          {["Regular", "VIP", "Urgent"].map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.catPill, f.category === c && styles.catActive]}
              onPress={() => setF({ ...f, category: c })}
            >
              <Text
                style={f.category === c ? { color: "#fff" } : { color: "#666" }}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.formHeadline, { marginTop: 20 }]}>
          Measurements (Tape)
        </Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.proInput, { flex: 1, marginRight: 10 }]}
            placeholder="Chest (in)"
            keyboardType="numeric"
            value={f.chest}
            onChangeText={(v) =>
              setF({ ...f, chest: v.replace(/[^0-9.]/g, "") })
            }
          />
          <TextInput
            style={[styles.proInput, { flex: 1, marginRight: 10 }]}
            placeholder="Waist (in)"
            keyboardType="numeric"
            value={f.waist}
            onChangeText={(v) =>
              setF({ ...f, waist: v.replace(/[^0-9.]/g, "") })
            }
          />
          <TextInput
            style={[styles.proInput, { flex: 1 }]}
            placeholder="Length (in)"
            keyboardType="numeric"
            value={f.length}
            onChangeText={(v) =>
              setF({ ...f, length: v.replace(/[^0-9.]/g, "") })
            }
          />
        </View>

        <Text style={[styles.formHeadline, { marginTop: 20 }]}>
          Payment (PKR)
        </Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.proInput, { flex: 1, marginRight: 10 }]}
            placeholder="Total Bill"
            keyboardType="numeric"
            value={f.total ? f.total.toString() : ""}
            onChangeText={(v) => {
              const cleaned = v.replace(/[^0-9]/g, "");
              setF({ ...f, total: cleaned ? parseInt(cleaned, 10) : 0 });
            }}
          />
          <TextInput
            style={[styles.proInput, { flex: 1 }]}
            placeholder="Advance"
            keyboardType="numeric"
            value={f.advance ? f.advance.toString() : ""}
            onChangeText={(v) => {
              const cleaned = v.replace(/[^0-9]/g, "");
              setF({ ...f, advance: cleaned ? parseInt(cleaned, 10) : 0 });
            }}
          />
        </View>

        <TouchableOpacity
          style={styles.masterBtn}
          onPress={() => {
            if (f.name) {
              const newOrder: Order = {
                id: Date.now().toString() + "_order",
                category: f.category,
                status: "Pending",
                total: f.total,
                advance: f.advance,
                chest: f.chest,
                waist: f.waist,
                length: f.length,
                date: Date.now(),
              };
              saveOrder(prefill?.id, f.name, f.phone, newOrder);
              navigation.goBack();
            } else alert("Name is required");
          }}
        >
          <Text style={styles.masterBtnText}>
            {prefill ? "ADD NEW PRODUCT TO CLIENT" : "COMPLETE REGISTRATION"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// --- SCREEN 4: DETAIL ---
function DetailScreen({
  route,
  navigation,
  customers,
  updateOrderStatus,
  deleteCustomer,
  deleteOrder,
}: any) {
  const { customerId } = route.params;
  const customer = customers.find((c: Customer) => c.id === customerId);
  const [paymentModal, setPaymentModal] = useState<{
    visible: boolean;
    order: Order | null;
    view: "options" | "qr";
  }>({
    visible: false,
    order: null,
    view: "options",
  });

  if (!customer) return null;

  const handleStatusToggle = (order: Order) => {
    if (order.status === "Ready") {
      updateOrderStatus(customer.id, order.id, "Pending");
    } else {
      const bal = order.total - order.advance;
      if (bal > 0) {
        setPaymentModal({ visible: true, order, view: "options" });
      } else {
        updateOrderStatus(customer.id, order.id, "Ready");
      }
    }
  };

  const handlePaymentSelect = (method: string) => {
    if (!paymentModal.order) return;
    const order = paymentModal.order;

    if (method === "qr") {
      setPaymentModal({ ...paymentModal, view: "qr" });
    } else if (method === "skip") {
      updateOrderStatus(customer.id, order.id, "Ready");
      setPaymentModal({ visible: false, order: null, view: "options" });
    } else {
      // Cash
      updateOrderStatus(customer.id, order.id, "Ready", order.total);
      setPaymentModal({ visible: false, order: null, view: "options" });
    }
  };

  const handleConfirmQR = () => {
    if (!paymentModal.order) return;
    updateOrderStatus(
      customer.id,
      paymentModal.order.id,
      "Ready",
      paymentModal.order.total,
    );
    setPaymentModal({ visible: false, order: null, view: "options" });
  };

  const shareToWhatsApp = () => {
    if (!paymentModal.order) return;
    const bal = paymentModal.order.total - paymentModal.order.advance;
    const message = `Hello ${customer.name}, your order at Master Stitch Studio is ready! Remaining balance: PKR ${bal}. Please pay using this QR code. Thank you!`;
    const url =
      Platform.OS === "web"
        ? `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`
        : `whatsapp://send?phone=${customer.phone}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      crossAlert("Error", "Could not open WhatsApp");
    });
  };

  const totalBal = customer.orders.reduce(
    (acc: number, o: Order) => acc + (o.total - o.advance),
    0,
  );

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.detailHero}>
          <Text style={styles.detailName}>{customer.name}</Text>
          <Text style={styles.detailSub}>{customer.phone}</Text>
          <View
            style={[
              styles.tag,
              {
                backgroundColor: totalBal > 0 ? "#b91c1c" : "#059669",
                marginTop: 10,
              },
            ]}
          >
            <Text style={[styles.tagTxt, { fontSize: 13, padding: 4 }]}>
              TOTAL BALANCE: {totalBal} PKR
            </Text>
          </View>

          <TouchableOpacity
            style={styles.reorderBtn}
            onPress={() => navigation.navigate("Add", { customer })}
          >
            <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" />
            <Text style={styles.reorderBtnTxt}>RE-ORDER (NEW PRODUCT)</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.secTitle, { margin: 20, marginBottom: 5 }]}>
          Order History ({customer.orders.length})
        </Text>

        {customer.orders
          .slice()
          .reverse()
          .map((order: Order) => {
            const bal = order.total - order.advance;
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor:
                          order.category === "VIP" ? "#8b5cf6" : "#64748b",
                      },
                    ]}
                  >
                    <Text style={styles.tagTxt}>{order.category}</Text>
                  </View>
                  <Text style={styles.dateTxt}>
                    {new Date(order.date).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.payBadgeRow}>
                  <View style={styles.payBadge}>
                    <Text style={styles.pBLab}>BILL</Text>
                    <Text style={styles.pBVal}>{order.total}</Text>
                  </View>
                  <View style={styles.payBadge}>
                    <Text style={styles.pBLab}>ADV</Text>
                    <Text style={styles.pBVal}>{order.advance}</Text>
                  </View>
                  <View
                    style={[
                      styles.payBadge,
                      { backgroundColor: bal > 0 ? "#fee2e2" : "#f1f5f9" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pBLab,
                        { color: bal > 0 ? "#b91c1c" : "#64748b" },
                      ]}
                    >
                      BAL
                    </Text>
                    <Text
                      style={[
                        styles.pBVal,
                        { color: bal > 0 ? "#b91c1c" : "#000" },
                      ]}
                    >
                      {bal}
                    </Text>
                  </View>
                </View>

                <View style={styles.mArea}>
                  <MeasureDisplay
                    label="Chest"
                    value={order.chest}
                    icon="tape-measure"
                  />
                  <MeasureDisplay
                    label="Waist"
                    value={order.waist}
                    icon="ruler"
                  />
                  <MeasureDisplay
                    label="Length"
                    value={order.length}
                    icon="human-male-height"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.statusToggle,
                    {
                      backgroundColor:
                        order.status === "Ready" ? "#059669" : "#d97706",
                    },
                  ]}
                  onPress={() => handleStatusToggle(order)}
                >
                  <Text style={styles.statusToggleText}>
                    MARK AS{" "}
                    {order.status === "Ready"
                      ? "IN PROGRESS"
                      : "READY / COMPLETED"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 15, alignItems: "center" }}
                  onPress={() => {
                    crossAlert("Delete Order", "Are you sure?", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => deleteOrder(customer.id, order.id),
                      },
                    ]);
                  }}
                >
                  <Text style={{ color: "#ef4444", fontSize: 12 }}>
                    DELETE THIS PRODUCT
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

        <View style={{ padding: 20 }}>
          <TouchableOpacity
            style={{ alignItems: "center", marginBottom: 30 }}
            onPress={() => {
              crossAlert(
                "Delete Client",
                "Deletes client and ALL their orders permanently?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      deleteCustomer(customer.id);
                      navigation.goBack();
                    },
                  },
                ],
              );
            }}
          >
            <Text style={{ color: "#ef4444", fontWeight: "bold" }}>
              DELETE ENTIRE CLIENT PROFILE
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* PAYMENT COLLECTION MODAL */}
      <Modal
        visible={paymentModal.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() =>
          setPaymentModal({ ...paymentModal, visible: false })
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {paymentModal.view === "options" ? (
              <>
                <MaterialCommunityIcons
                  name="cash-register"
                  size={40}
                  color="#059669"
                />
                <Text style={styles.modalTitle}>Collect Payment</Text>
                <Text style={styles.modalSub}>
                  Balance: PKR{" "}
                  {paymentModal.order
                    ? paymentModal.order.total - paymentModal.order.advance
                    : 0}
                </Text>
                <Text style={styles.modalDesc}>
                  Choose how the client will pay:
                </Text>

                <TouchableOpacity
                  style={styles.modalBtnCash}
                  onPress={() => handlePaymentSelect("cash")}
                >
                  <MaterialCommunityIcons name="cash" size={22} color="#fff" />
                  <Text style={styles.modalBtnTxt}>💵 PAY BY CASH</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalBtnQR}
                  onPress={() => handlePaymentSelect("qr")}
                >
                  <MaterialCommunityIcons
                    name="qrcode"
                    size={22}
                    color="#fff"
                  />
                  <Text style={styles.modalBtnTxt}>📱 PAY BY QR CODE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalBtnSkip}
                  onPress={() => handlePaymentSelect("skip")}
                >
                  <Text style={styles.modalSkipTxt}>
                    Mark Ready Without Collecting
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Scan & Pay</Text>
                <Text style={styles.modalSub}>
                  PKR{" "}
                  {paymentModal.order
                    ? paymentModal.order.total - paymentModal.order.advance
                    : 0}
                </Text>

                <View style={styles.qrContainer}>
                  {/* Placeholder for QR Image */}
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={120}
                    color="#1e293b"
                  />
                  <View style={styles.qrOverlay}>
                    <MaterialCommunityIcons
                      name="shield-check"
                      size={30}
                      color="#059669"
                    />
                  </View>
                </View>

                <Text style={styles.qrDesc}>
                  Customer should scan this to pay via Bank/EasyPaisa/JazzCash
                </Text>

                <View style={styles.qrActionRow}>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={shareToWhatsApp}
                  >
                    <MaterialCommunityIcons
                      name="whatsapp"
                      size={24}
                      color="#fff"
                    />
                    <Text style={styles.shareBtnTxt}>Share Bill</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirmQR}
                  >
                    <Text style={styles.confirmBtnTxt}>Payment Received</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={{ marginTop: 15 }}
                  onPress={() =>
                    setPaymentModal({ ...paymentModal, view: "options" })
                  }
                >
                  <Text style={{ color: "#64748b", fontWeight: "bold" }}>
                    ← BACK TO OPTIONS
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {paymentModal.view === "options" && (
              <TouchableOpacity
                style={{ marginTop: 10 }}
                onPress={() =>
                  setPaymentModal({
                    visible: false,
                    order: null,
                    view: "options",
                  })
                }
              >
                <Text style={{ color: "#94a3b8", fontWeight: "bold" }}>
                  CANCEL
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

// --- ATOMIC COMPONENTS ---
const MenuIconBtn = ({ title, sub, icon, color, onPress }: any) => (
  <TouchableOpacity style={styles.menuIconBtn} onPress={onPress}>
    <View style={[styles.iconWrap, { backgroundColor: color + "15" }]}>
      <MaterialCommunityIcons name={icon} size={26} color={color} />
    </View>
    <View style={{ flex: 1, marginLeft: 15 }}>
      <Text style={styles.menuITitle}>{title}</Text>
      <Text style={styles.menuISub}>{sub}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
  </TouchableOpacity>
);

const MeasureDisplay = ({ label, value, icon }: any) => (
  <View style={styles.mCard}>
    <MaterialCommunityIcons name={icon} size={20} color="#059669" />
    <Text style={styles.mCardLab}>{label}</Text>
    <Text style={styles.mCardVal}>{value || "0"}"</Text>
  </View>
);

// --- PROFESSIONAL STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  splashContainer: {
    flex: 1,
    backgroundColor: "#065f46",
    justifyContent: "center",
    alignItems: "center",
  },
  splashTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 20,
    letterSpacing: 3,
  },
  splashSub: { color: "#6ee7b7", fontSize: 12, marginTop: 5 },
  proHeader: {
    backgroundColor: "#065f46",
    padding: 30,
    paddingTop: 60,
    paddingBottom: 60,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shopSub: { color: "#6ee7b7", fontSize: 12, fontWeight: "bold" },
  shopName: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  dashStats: {
    flexDirection: "row",
    padding: 20,
    marginTop: -40,
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#fff",
    width: "47%",
    padding: 20,
    borderRadius: 20,
    elevation: 8,
    boxShadow: "0px 10px 24px rgba(2, 6, 23, 0.12)",
  },
  statVal: { fontSize: 26, fontWeight: "bold", color: "#065f46", marginTop: 5 },
  statLab: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  secTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 15,
  },
  menuIconBtn: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 18,
    marginBottom: 12,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  menuITitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  menuISub: { fontSize: 12, color: "#64748b" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchIn: { flex: 1, padding: 12, fontSize: 15 },
  clientItem: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  clientInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: "bold" },
  itemPhone: { color: "#64748b", fontSize: 13 },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 5,
  },
  tagTxt: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  balTxt: { color: "#ef4444", fontSize: 12, fontWeight: "bold" },
  formSection: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 20,
    borderRadius: 20,
  },
  formHeadline: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#059669",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  proInput: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  row: { flexDirection: "row" },
  catPill: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 5,
  },
  catActive: { backgroundColor: "#059669", borderColor: "#059669" },
  masterBtn: {
    backgroundColor: "#059669",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 15,
  },
  masterBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  detailHero: {
    backgroundColor: "#fff",
    padding: 30,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  detailName: { fontSize: 26, fontWeight: "bold" },
  detailSub: { color: "#64748b", marginBottom: 10 },
  reorderBtn: {
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },
  reorderBtnTxt: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    marginLeft: 10,
  },
  orderCard: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 20,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  dateTxt: { fontSize: 11, color: "#64748b", fontWeight: "bold" },
  payBadgeRow: { flexDirection: "row" },
  payBadge: {
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 3,
    flex: 1,
  },
  pBLab: { fontSize: 9, fontWeight: "bold", color: "#64748b" },
  pBVal: { fontSize: 14, fontWeight: "bold" },
  mArea: { flexDirection: "row", flexWrap: "wrap", paddingVertical: 15 },
  mCard: {
    width: "30%",
    backgroundColor: "#f8fafc",
    margin: "1.6%",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  mCardLab: { fontSize: 10, color: "#64748b", marginTop: 5 },
  mCardVal: { fontSize: 14, fontWeight: "bold", color: "#059669" },
  statusToggle: { padding: 15, borderRadius: 12, alignItems: "center" },
  statusToggleText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 15,
  },
  modalSub: {
    fontSize: 18,
    color: "#10b981",
    fontWeight: "bold",
    marginVertical: 5,
  },
  modalDesc: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  modalBtnCash: {
    backgroundColor: "#059669",
    flexDirection: "row",
    width: "100%",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalBtnQR: {
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    width: "100%",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalBtnSkip: { padding: 10, marginBottom: 10 },
  modalBtnTxt: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },
  modalSkipTxt: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  // QR View Styles
  qrContainer: {
    width: 180,
    height: 180,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  qrOverlay: {
    position: "absolute",
    bottom: -10,
    right: -10,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 5,
    elevation: 5,
  },
  qrDesc: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  qrActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  shareBtn: {
    backgroundColor: "#25d366",
    flex: 1,
    marginRight: 5,
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnTxt: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    marginLeft: 5,
  },
  confirmBtn: {
    backgroundColor: "#059669",
    flex: 1,
    marginLeft: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnTxt: { color: "#fff", fontWeight: "bold", fontSize: 12 },
});
