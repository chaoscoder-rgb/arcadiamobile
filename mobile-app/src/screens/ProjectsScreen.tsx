import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Button,
  TouchableOpacity,
} from "react-native";
import { api } from "../services/api";
import { clearAuth } from "../store/auth";

type Project = {
  id: string;
  name: string;
  code: string;
  phase: string;
};

type Props = NativeStackScreenProps<RootStackParamList, "Projects">;

const ProjectsScreen: React.FC<Props> = ({ navigation }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get("/projects");
      setProjects(res.data.data || []);
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const onLogout = async () => {
    await clearAuth();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Projects</Text>
        <Button title="Logout" onPress={onLogout} />
      </View>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
  <TouchableOpacity
    style={styles.item}
    onPress={() =>
      navigation.navigate("CreateOrder", {
        projectId: item.id,
        projectName: item.name,
      })
    }
  >
    <Text style={styles.name}>{item.name}</Text>
    <Text style={styles.meta}>
      {item.code} • {item.phase}
    </Text>
    <Text style={styles.link}>Tap to create order</Text>
  </TouchableOpacity>
)}
        ListEmptyComponent={<Text>No projects found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  name: {
    fontSize: 16,
    fontWeight: "500",
  },
  meta: {
    color: "#666",
  },
link: {
  marginTop: 4,
  color: "#1e90ff",
},
});

export default ProjectsScreen;