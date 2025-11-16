import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import ProjectsScreen from "../screens/ProjectsScreen";
import { loadAuthFromStorage, subscribeAuth, AuthState } from "../store/auth";
import { ActivityIndicator, View } from "react-native";
import CreateOrderScreen from "../screens/CreateOrderScreen";

export type RootStackParamList = {
  Login: undefined;
  Projects: undefined;
  CreateOrder: {
    projectId: string;
    projectName: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAuth(setAuth);
    (async () => {
      await loadAuthFromStorage();
      setLoading(false);
    })();
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
	  {auth.user ? (
	    <>
	      <Stack.Screen name="Projects" component={ProjectsScreen} />
	      <Stack.Screen
	        name="CreateOrder"
	        component={CreateOrderScreen}
	        options={{ title: "Create Order" }}
	      />
	    </>
	  ) : (
	    <Stack.Screen
	      name="Login"
	      component={LoginScreen}
	      options={{ title: "Login" }}
	    />
	  )}
	</Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;