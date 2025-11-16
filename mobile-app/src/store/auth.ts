import AsyncStorage from "@react-native-async-storage/async-storage";

export type User = {
  id: string;
  username: string;
  fullName: string;
  role: string;
};

export type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
};

const AUTH_USER_KEY = "user";
const AUTH_ACCESS_KEY = "accessToken";
const AUTH_REFRESH_KEY = "refreshToken";

let subscribers: Array<(state: AuthState) => void> = [];

let state: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
};

function notify() {
  subscribers.forEach((fn) => fn(state));
}

export function subscribeAuth(fn: (state: AuthState) => void) {
  subscribers.push(fn);
  fn(state);
  return () => {
    subscribers = subscribers.filter((s) => s !== fn);
  };
}

export async function loadAuthFromStorage() {
  const [userJson, accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(AUTH_USER_KEY),
    AsyncStorage.getItem(AUTH_ACCESS_KEY),
    AsyncStorage.getItem(AUTH_REFRESH_KEY),
  ]);

  state = {
    user: userJson ? JSON.parse(userJson) : null,
    accessToken,
    refreshToken,
  };
  notify();
}

export async function setAuth(next: AuthState) {
  state = next;
  await Promise.all([
    next.user
      ? AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(next.user))
      : AsyncStorage.removeItem(AUTH_USER_KEY),
    next.accessToken
      ? AsyncStorage.setItem(AUTH_ACCESS_KEY, next.accessToken)
      : AsyncStorage.removeItem(AUTH_ACCESS_KEY),
    next.refreshToken
      ? AsyncStorage.setItem(AUTH_REFRESH_KEY, next.refreshToken)
      : AsyncStorage.removeItem(AUTH_REFRESH_KEY),
  ]);
  notify();
}

export function getAuth(): AuthState {
  return state;
}

export async function clearAuth() {
  state = { user: null, accessToken: null, refreshToken: null };
  await Promise.all([
    AsyncStorage.removeItem(AUTH_USER_KEY),
    AsyncStorage.removeItem(AUTH_ACCESS_KEY),
    AsyncStorage.removeItem(AUTH_REFRESH_KEY),
  ]);
  notify();
}