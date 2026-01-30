"use client";

import { useEffect, useState } from "react";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { getAuth } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { app, db } from "@/lib/firebase";

const VAPID_KEY = "BErvg33iqZGAQNcZVcIA7Xx5NPVeL3URCsrexiIy1Lk2zGhYWYBi9MtPrGDp-M-uj1R6AykZxl6_AGgpmnoDPrk";

export function useFcmToken() {
  const [token, setToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    const initializeFcm = async () => {
      // Check if window and serviceWorker are defined (client-side only)
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        console.log("[v0] FCM: Not supported in this environment");
        return;
      }

      // Check if Firebase Messaging is supported
      const supported = await isSupported();
      if (!supported) {
        console.log("[v0] FCM: Firebase Messaging is not supported in this browser");
        return;
      }

      try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        console.log("[v0] FCM: Notification permission:", permission);

        if (permission === "granted") {
          // Register service worker
          await navigator.serviceWorker.register("/firebase-messaging-sw.js");
          
          // Wait for the service worker to be fully active
          const registration = await navigator.serviceWorker.ready;
          console.log("[v0] FCM: Service Worker is ready:", registration);

          // Initialize Firebase Messaging
          const messaging = getMessaging(app);

          // Get FCM Token with the active service worker registration
          const currentToken = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
          });

          if (currentToken) {
            console.log("[v0] FCM Token obtained:", currentToken);
            setToken(currentToken);

            // Save FCM token to Firestore for the current user
            const auth = getAuth(app);
            const currentUser = auth.currentUser;

            if (currentUser) {
              try {
                const userDocRef = doc(db, "users", currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                // Update user document with FCM token
                await setDoc(
                  userDocRef,
                  {
                    fcmToken: currentToken,
                    fcmTokenUpdatedAt: new Date(),
                  },
                  { merge: true }
                );
                console.log("[v0] FCM token saved to Firestore for user:", currentUser.uid);
              } catch (error) {
                console.error("[v0] Error saving FCM token to Firestore:", error);
              }
            }
          } else {
            console.log("[v0] FCM: No registration token available");
          }

          // Listen for foreground messages
          onMessage(messaging, (payload) => {
            console.log("[v0] FCM: Foreground message received:", payload);
            
            // Show browser notification for foreground messages
            const notificationTitle = payload.notification?.title || "New Notification";
            const notificationOptions: NotificationOptions = {
              body: payload.notification?.body || "",
              icon: "/icon-light-32x32.png",
              badge: "/icon-light-32x32.png",
              tag: payload.messageId || "default",
            };

            // Show notification
            if (Notification.permission === "granted") {
              new Notification(notificationTitle, notificationOptions);
            }

            // Also show an alert for visibility
            if (payload.notification?.title) {
              alert(`${payload.notification.title}\n${payload.notification.body || ""}`);
            }
          });
        }
      } catch (error) {
        console.error("[v0] FCM: Error initializing:", error);
      }
    };

    initializeFcm();
  }, []);

  return { token, notificationPermission };
}
