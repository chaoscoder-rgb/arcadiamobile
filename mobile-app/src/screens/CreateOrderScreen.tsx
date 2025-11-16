import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Picker } from "@react-native-picker/picker";

type Props = NativeStackScreenProps<RootStackParamList, "CreateOrder">;

type MaterialOption = {
  id: string;
  label: string;
};

// TODO: Replace with real materials from API when available
const MATERIAL_OPTIONS: MaterialOption[] = [
  { id: "MAT-001", label: "Cement - 50kg bag (MAT-001)" },
  { id: "MAT-002", label: "Steel Rebar 12mm (MAT-002)" },
  { id: "MAT-003", label: "Sand (1 m³) (MAT-003)" },
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const CreateOrderScreen: React.FC<Props> = ({ route, navigation }) => {
  const { projectId, projectName } = route.params;

  const [requiredDate, setRequiredDate] = useState("");
  const [notes, setNotes] = useState("");

  const [materialId, setMaterialId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Default required date = today + 7 days
  useEffect(() => {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setRequiredDate(formatDate(oneWeekLater));
  }, []);

  const quantityNumber = Number(quantity);
  const unitPriceNumber = Number(unitPrice);
  const isQuantityValid = !Number.isNaN(quantityNumber) && quantityNumber > 0;
  const isUnitPriceValid =
    unitPrice === "" || (!Number.isNaN(unitPriceNumber) && unitPriceNumber >= 0);
  const total =
    isQuantityValid && unitPrice !== "" && !Number.isNaN(unitPriceNumber)
      ? quantityNumber * unitPriceNumber
      : null;

  const onSubmit = async () => {
    if (!materialId || !quantity) {
      Alert.alert("Validation", "Material and quantity are required.");
      return;
    }

    if (!isQuantityValid) {
      Alert.alert("Validation", "Quantity must be a positive number.");
      return;
    }

    if (!isUnitPriceValid) {
      Alert.alert("Validation", "Unit price must be a non-negative number.");
      return;
    }

    const payload = {
      projectId,
      requiredDate: requiredDate || undefined,
      notes: notes || undefined,
      currency: "INR",
      items: [
        {
          material_id: materialId,
          quantity: quantityNumber,
          unit_price: unitPrice === "" ? undefined : unitPriceNumber,
        },
      ],
    };

    setSubmitting(true);
    try {
      const res = await api.post("/orders", payload);

      const { order, budgetInfo } = res.data.data || {};
      let msg = res.data.message || "Order created.";
      if (budgetInfo?.overBudget) {
        msg = "Order created and flagged for approval (budget exceeded).";
      } else if (budgetInfo?.overThreshold) {
        msg = "Order created (warning: approaching budget limit).";
      }

      Alert.alert("Success", msg, [
        {
          text: "OK",
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      const msg =
        err?.response?.data?.message || "Failed to create order. Try again.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Order</Text>
      <Text style={styles.subtitle}>{projectName}</Text>

      {/* Material and pricing section first */}
      <Text style={styles.sectionTitle}>Item</Text>

      <Text style={styles.label}>Material</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={materialId}
          onValueChange={(value) => setMaterialId(value)}
        >
          <Picker.Item label="Select material" value="" />
          {MATERIAL_OPTIONS.map((m) => (
            <Picker.Item key={m.id} label={m.label} value={m.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Quantity</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 10"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />

      <Text style={styles.label}>Unit Price (INR)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 100"
        keyboardType="numeric"
        value={unitPrice}
        onChangeText={setUnitPrice}
      />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total (INR):</Text>
        <Text style={styles.totalValue}>
          {total !== null ? total.toFixed(2) : "--"}
        </Text>
      </View>

      {/* Move required date and notes to the end */}
      <Text style={styles.label}>Required Date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={requiredDate}
        onChangeText={setRequiredDate}
      />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Additional notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      <Button
        title={submitting ? "Submitting..." : "Create Order"}
        onPress={onSubmit}
        disabled={submitting}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "600",
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
  },
  multiline: {
    height: 80,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    overflow: "hidden",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "600",
  },
});

export default CreateOrderScreen;