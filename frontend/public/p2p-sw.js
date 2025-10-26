/**
 * Custom Service Worker for P2P Call Handling
 *
 * This Service Worker runs independently from the next-pwa generated sw.js
 * and handles incoming P2P calls when the app is closed.
 */

const PENDING_CALLS_DB = 'svazapp-pending-calls';
const PENDING_CALLS_STORE = 'pendingCalls';
const DB_VERSION = 1;

/**
 * Open IndexedDB for pending calls
 */
function openPendingCallsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PENDING_CALLS_DB, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(PENDING_CALLS_STORE)) {
        const store = db.createObjectStore(PENDING_CALLS_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Store pending call in IndexedDB
 */
async function storePendingCall(call) {
  const db = await openPendingCallsDB();
  const tx = db.transaction(PENDING_CALLS_STORE, 'readwrite');
  const store = tx.objectStore(PENDING_CALLS_STORE);
  store.put(call);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Remove pending call from IndexedDB
 */
async function removePendingCall(callId) {
  const db = await openPendingCallsDB();
  const tx = db.transaction(PENDING_CALLS_STORE, 'readwrite');
  const store = tx.objectStore(PENDING_CALLS_STORE);
  store.delete(callId);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Handle incoming P2P call signaling message
 */
async function handleIncomingP2PCall(message) {
  if (message.type !== 'offer') {
    return;
  }

  console.log('[P2P SW] Incoming P2P call from:', message.callerId);

  // Try to fetch caller name from IndexedDB
  let callerName = message.callerId;
  try {
    const db = await openDB('svazapp-db', 1);
    const user = await db.get('users', message.callerId);
    if (user) {
      callerName = user.displayName || user.username || message.callerId;
    }
  } catch (error) {
    console.error('[P2P SW] Failed to fetch caller name:', error);
  }

  // Detect call type from SDP (check for video media)
  let callType = 'AUDIO';
  if (message.sdp && message.sdp.sdp) {
    const sdpString = message.sdp.sdp;
    if (sdpString.includes('m=video')) {
      callType = 'VIDEO';
    }
  }

  // Store pending call in IndexedDB
  const pendingCall = {
    id: `call-${Date.now()}`,
    callerId: message.callerId,
    callerName: callerName,
    type: callType,
    offer: message.sdp,
    timestamp: new Date().toISOString(),
  };

  await storePendingCall(pendingCall);

  // Show notification
  await self.registration.showNotification('Incoming Call', {
    body: `${pendingCall.callerName} is calling...`,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: `call-${pendingCall.id}`,
    requireInteraction: true,
    actions: [
      { action: 'accept', title: 'Accept' },
      { action: 'reject', title: 'Reject' },
    ],
    data: {
      type: 'incoming-call',
      callId: pendingCall.id,
      callerId: pendingCall.callerId,
    },
  });

  console.log('[P2P SW] Notification shown for call:', pendingCall.id);
}

/**
 * Handle notification click event
 */
async function handleNotificationClick(event) {
  const { data } = event.notification;

  if (!data || data.type !== 'incoming-call') {
    return;
  }

  console.log('[P2P SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'reject') {
    // Remove pending call from IndexedDB
    await removePendingCall(data.callId);
    return;
  }

  // Accept action or notification body click
  // Open app and navigate to call screen
  const urlToOpen = new URL(`/call/${data.callId}`, self.location.origin).href;

  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Check if app is already open
  for (const client of windowClients) {
    if (client.url.startsWith(self.location.origin) && 'focus' in client) {
      await client.focus();
      // Send message to client to handle the call
      client.postMessage({
        type: 'accept-call',
        callId: data.callId,
        callerId: data.callerId,
      });
      return;
    }
  }

  // Open new window
  if (self.clients.openWindow) {
    await self.clients.openWindow(urlToOpen);
  }
}

// Event Listeners

self.addEventListener('install', (event) => {
  console.log('[P2P SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[P2P SW] Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  console.log('[P2P SW] Message received:', event.data);

  if (event.data && event.data.type === 'p2p-signaling') {
    event.waitUntil(handleIncomingP2PCall(event.data.message));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.waitUntil(handleNotificationClick(event));
});

console.log('[P2P SW] Service Worker loaded');

