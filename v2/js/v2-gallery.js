/**
 * Photobooth Studio Pro (V2) - Local Session Storage & Gallery Manager
 * Uses IndexedDB for high-capacity local offline storage of high-res photo strips & sessions.
 */

class V2GalleryManager {
  constructor() {
    this.dbName = 'PhotoboothStudioV2_DB';
    this.storeName = 'sessions';
    this.db = null;
    this.initDB();
  }

  initDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB unavailable, falling back to basic storage');
        resolve(null);
        return;
      }

      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      req.onerror = (e) => {
        console.warn('IndexedDB open error', e);
        resolve(null);
      };
    });
  }

  async saveSession(sessionData) {
    if (!this.db) await this.initDB();
    if (!this.db) return false;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction([this.storeName], 'readwrite');
        const store = tx.objectStore(this.storeName);

        const record = {
          id: 'sess_' + Date.now(),
          timestamp: Date.now(),
          dateString: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          templateId: sessionData.templateId,
          filterId: sessionData.filterId,
          frameColor: sessionData.frameColor,
          customTitle: sessionData.customTitle,
          thumbnail: sessionData.thumbnail, // low-res dataURL for fast gallery preview
          compositeData: sessionData.compositeData // full-res dataURL
        };

        const req = store.add(record);
        req.onsuccess = () => resolve(record);
        req.onerror = () => resolve(false);
      } catch (e) {
        console.warn('Failed to save session to DB', e);
        resolve(false);
      }
    });
  }

  async getAllSessions() {
    if (!this.db) await this.initDB();
    if (!this.db) return [];

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction([this.storeName], 'readonly');
        const store = tx.objectStore(this.storeName);
        const index = store.index('timestamp');
        const req = index.openCursor(null, 'prev'); // Most recent first
        const list = [];

        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            list.push(cursor.value);
            cursor.continue();
          } else {
            resolve(list);
          }
        };

        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  async deleteSession(sessionId) {
    if (!this.db) await this.initDB();
    if (!this.db) return false;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction([this.storeName], 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.delete(sessionId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async clearAll() {
    if (!this.db) await this.initDB();
    if (!this.db) return false;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction([this.storeName], 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }
}

window.v2Gallery = new V2GalleryManager();
