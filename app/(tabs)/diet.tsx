import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Image,
} from "react-native";

import * as SQLite from "expo-sqlite";
import * as ImagePicker from "expo-image-picker";

export default function App() {
  const [db, setDb] = useState(null);
  const [foods, setFoods] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [settingModal, setSettingModal] = useState(false);

  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [mealType, setMealType] = useState("breakfast");
  const [image, setImage] = useState(null);

  const [editingId, setEditingId] = useState(null);

  const [target, setTarget] = useState(2000);
  const [inputTarget, setInputTarget] = useState("");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const database = await SQLite.openDatabaseAsync("diet.db");

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        calories INTEGER,
        meal_type TEXT,
        image TEXT,
        created_at TEXT
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target INTEGER
      );
    `);

    setDb(database);

    loadTarget(database);
    fetchFoods(database);
  };

  const loadTarget = async (database) => {
    if (!database) return;

    const res = await database.getAllAsync(
      "SELECT * FROM settings LIMIT 1"
    );

    if (res.length > 0) setTarget(res[0].target);
  };

  const saveTarget = async () => {
    if (!db) return;
    if (!inputTarget) return;

    await db.execAsync("DELETE FROM settings");
    await db.runAsync(
      "INSERT INTO settings (target) VALUES (?)",
      [parseInt(inputTarget)]
    );

    setTarget(parseInt(inputTarget));
    setSettingModal(false);
  };

  const fetchFoods = async (database) => {
    const useDb = database || db;
    if (!useDb) return;

    const result = await useDb.getAllAsync(
      "SELECT * FROM foods ORDER BY id DESC"
    );

    setFoods(result);
  };

  const pickImage = async () => {
    await ImagePicker.requestMediaLibraryPermissionsAsync();

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.5,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const addFood = async () => {
    if (!db) return;
    if (!name || !calories) return;

    const today = new Date().toISOString().split("T")[0];

    await db.runAsync(
      "INSERT INTO foods (name, calories, meal_type, image, created_at) VALUES (?, ?, ?, ?, ?)",
      [name, parseInt(calories), mealType, image, today]
    );

    resetForm();
    fetchFoods();
  };

  const updateFood = async () => {
    if (!db) return;

    await db.runAsync(
      "UPDATE foods SET name=?, calories=?, meal_type=?, image=? WHERE id=?",
      [name, parseInt(calories), mealType, image, editingId]
    );

    resetForm();
    fetchFoods();
  };

  const deleteFood = async (id) => {
    if (!db) return;

    await db.runAsync("DELETE FROM foods WHERE id=?", [id]);
    fetchFoods();
  };

  const resetForm = () => {
    setName("");
    setCalories("");
    setMealType("breakfast");
    setImage(null);
    setEditingId(null);
    setModalVisible(false);
  };

  const openEdit = (item) => {
    setName(item.name);
    setCalories(item.calories.toString());
    setMealType(item.meal_type);
    setImage(item.image);
    setEditingId(item.id);
    setModalVisible(true);
  };

  const today = new Date().toISOString().split("T")[0];
  const todayFoods = foods.filter((f) => f.created_at === today);

  const totalCalories = todayFoods.reduce(
    (sum, item) => sum + item.calories,
    0
  );

  const progress = Math.min(totalCalories / target, 1);

  // 🔥 LOGIC WARNA
  let barColor = "#22c55e";
  if (totalCalories > target) {
    barColor = "#ef4444"; // merah (over)
  } else if (totalCalories > target * 0.8) {
    barColor = "#f59e0b"; // kuning (hampir penuh)
  }

  const isOver = totalCalories > target;

  return (
    <View style={{ flex: 1, backgroundColor: "#f1f5f9", paddingTop: 50 }}>
      {/* HEADER */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: "bold", color: "#0f172a" }}>
          🥗 Diet Tracker
        </Text>

        <TouchableOpacity onPress={() => setSettingModal(true)}>
          <Text
            style={{
              marginTop: 5,
              fontSize: 16,
              color: isOver ? "#ef4444" : "#f59e0b", 
              fontWeight: isOver ? "bold" : "normal",
            }}
          >
            {totalCalories} / {target} kcal {isOver ? "INGET BADAN BANG" : "WADUH HAMPIR PENUH"}
          </Text>
        </TouchableOpacity>

        {/* PROGRESS */}
        <View
          style={{
            height: 14,
            backgroundColor: "#e2e8f0",
            borderRadius: 20,
            marginTop: 10,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 14,
              width: `${progress * 100}%`,
              backgroundColor: barColor,
            }}
          />
        </View>
      </View>

      {/* LIST */}
      <FlatList
        data={todayFoods}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              marginBottom: 15,
              overflow: "hidden",
              elevation: 4,
            }}
          >
            {item.image && (
              <Image
                source={{ uri: item.image }}
                style={{ width: "100%", height: 140 }}
              />
            )}

            <View style={{ padding: 15 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                {item.name}
              </Text>

              <Text style={{ color: "#22c55e", marginTop: 5 }}>
                {item.calories} kcal
              </Text>

              <View style={{ flexDirection: "row", marginTop: 10 }}>
                <TouchableOpacity onPress={() => openEdit(item)}>
                  <Text style={{ color: "#3b82f6", marginRight: 15 }}>
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => deleteFood(item.id)}>
                  <Text style={{ color: "#ef4444" }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* FLOAT BUTTON */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          position: "absolute",
          bottom: 30,
          right: 20,
          backgroundColor: "#22c55e",
          width: 65,
          height: 65,
          borderRadius: 40,
          justifyContent: "center",
          alignItems: "center",
          elevation: 6,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 28 }}>+</Text>
      </TouchableOpacity>

      {/* MODAL TAMBAH */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 15 }}>
            {editingId ? "Edit" : "Tambah"} Makanan
          </Text>

          <TextInput
            placeholder="Nama makanan"
            value={name}
            onChangeText={setName}
            style={input}
          />

          <TextInput
            placeholder="Kalori"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            style={input}
          />

          <TouchableOpacity onPress={pickImage} style={buttonOutline}>
            <Text>📸 Pilih Foto</Text>
          </TouchableOpacity>

          {image && (
            <Image
              source={{ uri: image }}
              style={{ height: 120, borderRadius: 10, marginTop: 10 }}
            />
          )}

          <TouchableOpacity
            onPress={editingId ? updateFood : addFood}
            style={buttonPrimary}
          >
            <Text style={{ color: "#fff" }}>Simpan</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={resetForm}>
            <Text style={{ textAlign: "center", marginTop: 10 }}>Batal</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MODAL SETTING */}
      <Modal visible={settingModal} animationType="fade">
        <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "bold" }}>
            Target Kalori
          </Text>

          <TextInput
            placeholder="Contoh 2000"
            value={inputTarget}
            onChangeText={setInputTarget}
            keyboardType="numeric"
            style={input}
          />

          <TouchableOpacity onPress={saveTarget} style={buttonPrimary}>
            <Text style={{ color: "#fff" }}>Simpan</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setSettingModal(false)}>
            <Text style={{ textAlign: "center", marginTop: 10 }}>
              Batal
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const input = {
  borderWidth: 1,
  borderColor: "#e2e8f0",
  padding: 12,
  borderRadius: 10,
  marginBottom: 10,
  backgroundColor: "#fff",
};

const buttonPrimary = {
  backgroundColor: "#22c55e",
  padding: 14,
  borderRadius: 10,
  alignItems: "center",
  marginTop: 10,
};

const buttonOutline = {
  borderWidth: 1,
  borderColor: "#22c55e",
  padding: 12,
  borderRadius: 10,
  alignItems: "center",
};