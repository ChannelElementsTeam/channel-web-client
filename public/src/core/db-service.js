class DbService {
  constructor() {
    this.DB_NAME = "channels-client-db";
    this.DB_VERSION = 1;
    this.STORE_COMPONENTS = "components";
    this.MODE_READWRITE = "readwrite";
    this.MODE_READ = "readonly";
    this.db = null;
  }

  open() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve();
        return;
      }
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onerror = (event) => {
        console.error("Failed to load DB: ", event);
        reject(new Error("Error loading database: " + (event.message || event)));
      };
      request.onsuccess = (event) => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.onerror = (event) => {
          console.log("Failed to load database: ", event);
        };
        if (!event.oldVersion) {
          const store = db.createObjectStore(this.STORE_COMPONENTS, { keyPath: "packageName" });
          store.createIndex("source", "source", { unique: true });
        }
      };
    });
  }

  getStore(name, mode) {
    const tx = this.db.transaction(name, mode);
    return tx.objectStore(name);
  }

  saveComponent(component) {
    return this.open().then(() => {
      return new Promise((resolve, reject) => {
        const store = this.getStore(this.STORE_COMPONENTS, this.MODE_READWRITE);
        try {
          const request = store.put(component);
          request.onerror = (event) => {
            console.error("Error saving component to db: ", event);
            reject(new Error("Error saving component: " + event));
          };
          request.onsuccess = (event) => {
            resolve();
          };
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  getComponent(packageName, source) {
    return this.open().then(() => {
      return new Promise((resolve, reject) => {
        const store = this.getStore(this.STORE_COMPONENTS, this.MODE_READ);
        let request;
        if (packageName) {
          request = store.get(packageName);
        } else {
          request = store.index("source").get(source);
        }
        request.onerror = (event) => {
          console.error("Failed to load component from DB: ", event);
          reject(new Error("Failed to load component: " + event));
        };
        request.onsuccess = (event) => {
          resolve(request.result);
        };
      });
    });
  }

  getAllComponents() {
    return this.open().then(() => {
      return new Promise((resolve, reject) => {
        const store = this.getStore(this.STORE_COMPONENTS, this.MODE_READ);
        const request = store.openCursor();
        const result = [];
        request.onerror = (event) => {
          console.error("Failed to open components cursor: ", event);
          reject(new Error("Failed to open components cursor: " + event));
        };
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            result.push(cursor.value);
            cursor.continue();
          } else {
            resolve(result);
          }
        };
      });
    });
  }

  getLocal(key, json) {
    if (window.localStorage) {
      var stored = window.localStorage.getItem(key) || "";
      if (json) {
        if (stored) {
          return JSON.parse(stored);
        }
        return null;
      }
      return stored;
    }
    return null;
  }

  setLocal(key, value) {
    if (window.localStorage) {
      if (typeof value === "string") {
        window.localStorage.setItem(key, value);
      } else {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    }
  }
}