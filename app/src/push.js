// Web Push subscription flow — registers the service worker, asks for
// notification permission, and syncs the resulting subscription with the
// backend. Browsers that don't support Push (or aren't on https/localhost)
// just get isPushSupported() === false and the caller shows nothing.
import { savePushSubscription, removePushSubscription } from './api.js';

// Generated once for this app — see VAPID setup notes. Public key only;
// the private key lives server-side.
const VAPID_PUBLIC_KEY = 'BOONGkZiofB9p0s_3rAp8g1xR6ZQQF1uPgpy-1OTf9i493Pdpbl7_VwZh2-NN1VnmuZot1QzZuwtTHengi6BAZY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

let swRegistration = null;

export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  if (swRegistration) return swRegistration;
  swRegistration = await navigator.serviceWorker.register('./sw.js');
  return swRegistration;
}

// Current subscribed state, purely from the browser's own record — doesn't
// require asking the server. null if never subscribed on this device.
export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  const reg = await registerServiceWorker();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(notifyActionOnly) {
  const reg = await registerServiceWorker();
  if (!reg) throw new Error('Push notifications are not supported in this browser');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('permission_denied');

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  await savePushSubscription({ endpoint: json.endpoint, keys: json.keys, notifyActionOnly: !!notifyActionOnly });
  return sub;
}

export async function unsubscribeFromPush() {
  const sub = await getExistingSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await removePushSubscription(endpoint);
}
