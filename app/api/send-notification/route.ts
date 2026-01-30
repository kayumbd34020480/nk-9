import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, body: messageBody, type, amount, data } = body;

    if (!userId || !title || !messageBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user's FCM token from database
    const usersQuery = query(collection(db, "users"), where("uid", "==", userId));
    const userSnap = await getDocs(usersQuery);

    if (userSnap.empty) {
      console.warn("[v0] User not found for FCM notification:", userId);
      return NextResponse.json({ success: false, reason: "User not found" });
    }

    const userDoc = userSnap.docs[0];
    const fcmToken = userDoc.data().fcmToken;

    if (!fcmToken) {
      console.warn("[v0] FCM token not found for user:", userId);
      return NextResponse.json({ success: false, reason: "FCM token not found" });
    }

    // Send notification via FCM (Firebase Cloud Messaging) using Legacy API
    const firebaseApiKey = process.env.FIREBASE_MESSAGING_API_KEY;
    if (!firebaseApiKey) {
      console.error("[v0] FIREBASE_MESSAGING_API_KEY not configured");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://fcm.googleapis.com/fcm/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${firebaseApiKey}`,
        },
        body: JSON.stringify({
          to: fcmToken,
          notification: {
            title,
            body: messageBody,
            icon: "/images/logo.png",
            click_action: "/dashboard",
          },
          data: {
            type,
            amount: amount?.toString() || "",
            ...(data || {}),
          },
          priority: "high",
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("[v0] FCM API error:", error);
      return NextResponse.json(
        { error: "Failed to send notification" },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log("[v0] FCM notification sent successfully:", result);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] Error in send-notification API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
