/// <reference types="vite/client" />
/// <reference lib="webworker" />

interface ServiceWorkerRegistration {
  pushManager: PushManager;
}

