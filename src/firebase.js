import { initializeApp, getApp, getApps } from "firebase/app";
import { getDatabase, ref, set, push, onValue, get, update, off } from "firebase/database";

let app = null;
let db = null;
let isConnected = false;

// Helper to check if Firebase is configured
const getFirebaseConfig = () => {
  // Check localStorage first
  const localConfig = localStorage.getItem("firebaseConfig");
  if (localConfig) {
    try {
      const parsed = JSON.parse(localConfig);
      if (parsed.databaseURL || parsed.apiKey) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse localStorage firebaseConfig", e);
    }
  }

  // Check Vite environment variables
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (envConfig.databaseURL || envConfig.apiKey) {
    return envConfig;
  }

  return null;
};

const config = getFirebaseConfig();

if (config) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getDatabase(app);
    isConnected = true;
    console.log("Firebase initialized successfully with configuration:", config.databaseURL);
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
}

// Mock database fallback for offline/unconfigured mode
class MockDatabase {
  constructor() {
    this.listeners = {};
    this.state = {
      active_state: {
        selectedKey: "",
        isPurifying: false,
        progress: 0,
        activeStep: 1,
        simulatedToxicity: 0,
        simulatedSafetyVal: 0
      },
      sim_logs: [
        { time: "10:15:00", message: "Decontamination telemetry systems in standby mode (Local Offline Fallback).", type: "neutral" }
      ],
      chat_logs: [
        { sender: 'AI', text: "Smart Environmental AI core activated. Awaiting telemetry inquiry..." }
      ]
    };
  }

  ref(path) {
    return path;
  }

  set(path, value) {
    const parts = path.split('/');
    if (parts.length === 1) {
      this.state[parts[0]] = value;
    } else if (parts.length === 2) {
      if (!this.state[parts[0]]) this.state[parts[0]] = {};
      this.state[parts[0]][parts[1]] = value;
    }
    this.trigger(path);
    if (parts.length > 1) {
      this.trigger(parts[0]);
    }
    return Promise.resolve();
  }

  update(path, value) {
    const parts = path.split('/');
    let target = this.state;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        if (!target[parts[i]]) target[parts[i]] = {};
        if (i === parts.length - 1) {
          Object.assign(target[parts[i]], value);
        } else {
          target = target[parts[i]];
        }
      } else {
        Object.assign(target, value);
      }
    }
    this.trigger(path);
    if (parts.length > 1) {
      this.trigger(parts[0]);
    }
    return Promise.resolve();
  }

  push(path, value) {
    const parts = path.split('/');
    const node = parts[0];
    if (!this.state[node]) {
      this.state[node] = [];
    }
    const newId = Math.random().toString(36).substring(2, 15);
    if (Array.isArray(this.state[node])) {
      this.state[node].push(value);
    } else if (typeof this.state[node] === 'object') {
      this.state[node][newId] = value;
    }
    this.trigger(path);
    this.trigger(node);
    return Promise.resolve({ key: newId });
  }

  get(path) {
    const parts = path.split('/');
    let data = this.state;
    for (const part of parts) {
      if (part) {
        data = data[part];
      }
    }
    return Promise.resolve({
      exists: () => data !== undefined && data !== null,
      val: () => data
    });
  }

  onValue(path, callback) {
    if (!this.listeners[path]) {
      this.listeners[path] = [];
    }
    this.listeners[path].push(callback);
    this.get(path).then(snapshot => {
      callback(snapshot);
    });

    return () => {
      this.listeners[path] = this.listeners[path].filter(cb => cb !== callback);
    };
  }

  trigger(path) {
    if (this.listeners[path]) {
      this.get(path).then(snapshot => {
        this.listeners[path].forEach(cb => cb(snapshot));
      });
    }
  }
}

const mockDb = new MockDatabase();

// Exported wrapper functions that route to Firebase if connected, or MockDatabase if not
export const isConfigured = () => isConnected;

export const dbSet = (path, value) => {
  if (isConnected && db) {
    return set(ref(db, path), value);
  }
  return mockDb.set(path, value);
};

export const dbUpdate = (path, value) => {
  if (isConnected && db) {
    return update(ref(db, path), value);
  }
  return mockDb.update(path, value);
};

export const dbPush = (path, value) => {
  if (isConnected && db) {
    return push(ref(db, path), value);
  }
  return mockDb.push(path, value);
};

export const dbGet = (path) => {
  if (isConnected && db) {
    return get(ref(db, path));
  }
  return mockDb.get(path);
};

export const dbOnValue = (path, callback) => {
  if (isConnected && db) {
    const dbRef = ref(db, path);
    return onValue(dbRef, callback);
  }
  return mockDb.onValue(path, callback);
};

export const saveConfigToLocal = (newConfig) => {
  localStorage.setItem("firebaseConfig", JSON.stringify(newConfig));
  window.location.reload();
};

export const clearConfigFromLocal = () => {
  localStorage.removeItem("firebaseConfig");
  window.location.reload();
};
