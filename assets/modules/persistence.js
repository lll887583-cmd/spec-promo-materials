(function () {
  'use strict';

  function defaultCloneState(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createSpecPromoPersistence(options = {}) {
    const {
      databaseName,
      databaseVersion = 1,
      appStateStore,
      rulesDocumentStore,
      serverDatabaseApi = '/api',
      serverDatabaseTimeout = 1600,
      cloneState = defaultCloneState
    } = options;

    function openAppDatabase() {
      return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          reject(new Error('IndexedDB is not available'));
          return;
        }
        const request = window.indexedDB.open(databaseName, databaseVersion);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(appStateStore)) {
            db.createObjectStore(appStateStore, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(rulesDocumentStore)) {
            db.createObjectStore(rulesDocumentStore, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open app database'));
        request.onblocked = () => reject(new Error('App database upgrade was blocked'));
      });
    }

    function appDatabaseTransaction(storeName, mode, handler) {
      return openAppDatabase().then(db => new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let result;
        transaction.oncomplete = () => {
          db.close();
          resolve(result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error || new Error('App database transaction failed'));
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error || new Error('App database transaction aborted'));
        };
        try {
          result = handler(store);
        } catch (error) {
          transaction.abort();
          db.close();
          reject(error);
        }
      }));
    }

    function dbRequest(request, message = 'Database request failed') {
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error(message));
      });
    }

    async function serverDatabaseRequest(path, requestOptions = {}) {
      if (!/^https?:$/.test(window.location.protocol)) throw new Error('Server database requires HTTP(S)');
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), serverDatabaseTimeout);
      try {
        const response = await fetch(`${serverDatabaseApi}${path}`, {
          method: requestOptions.method || 'GET',
          headers: {
            Accept: 'application/json',
            ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
            ...(requestOptions.headers || {})
          },
          body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined,
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`Server database returned ${response.status}`);
        const payload = await response.json();
        if (payload && payload.ok === false) throw new Error(payload.error || 'Server database request failed');
        return payload;
      } finally {
        window.clearTimeout(timeout);
      }
    }

    async function saveServerSizeLanguageState(snapshot) {
      return serverDatabaseRequest('/state/size-language', {
        method: 'PUT',
        body: { data: snapshot }
      });
    }

    async function loadServerSizeLanguageState() {
      const payload = await serverDatabaseRequest('/state/size-language');
      return payload?.data || null;
    }

    async function persistStateRecord(key, value) {
      await appDatabaseTransaction(appStateStore, 'readwrite', store => {
        store.put({ key, value: cloneState(value), updatedAt: Date.now() });
      });
    }

    async function loadStateRecord(key) {
      const record = await appDatabaseTransaction(appStateStore, 'readonly', store => dbRequest(store.get(key)));
      return record?.value || null;
    }

    function loadLegacyJsonState(key) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        console.warn('Legacy local state failed to read', error);
        return null;
      }
    }

    function mirrorStateToLegacyStorage(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn('Legacy local state failed to mirror', error);
      }
    }

    function newestState(primaryState, legacyState) {
      const primaryTime = Number(primaryState?.updatedAt || 0);
      const legacyTime = Number(legacyState?.updatedAt || 0);
      return legacyTime > primaryTime ? legacyState : primaryState;
    }

    function newestAvailableState(...states) {
      return states.filter(Boolean).reduce((latest, state) => newestState(latest, state), null);
    }

    return {
      openAppDatabase,
      appDatabaseTransaction,
      dbRequest,
      serverDatabaseRequest,
      saveServerSizeLanguageState,
      loadServerSizeLanguageState,
      persistStateRecord,
      loadStateRecord,
      loadLegacyJsonState,
      mirrorStateToLegacyStorage,
      newestState,
      newestAvailableState
    };
  }

  window.createSpecPromoPersistence = createSpecPromoPersistence;
}());
