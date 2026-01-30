import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Send unified notification - both foreground (Firestore) and background (FCM)
 */
async function sendUnifiedNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  amount?: number,
  data?: Record<string, any>
) {
  try {
    // Store in Firestore for foreground notification
    await addDoc(collection(db, "notifications"), {
      userId,
      type,
      title,
      message,
      amount,
      data,
      read: false,
      createdAt: serverTimestamp(),
    });

    // Send to FCM for background/push notification
    try {
      await fetch("/api/send-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          title,
          body: message,
          type,
          amount,
          data,
        }),
      });
    } catch (fcmError) {
      console.warn("[v0] FCM notification failed (non-critical):", fcmError);
    }
  } catch (error) {
    console.error("[v0] Error sending unified notification:", error);
  }
}

/**
 * Create a notification for admins when a user submits work
 */
export async function notifyAdminsOfSubmission(
  userId: string,
  userName: string,
  platform: string,
  description: string,
  amount: number
) {
  try {
    // Get all admin users
    const adminsQuery = query(collection(db, "users"), where("role", "==", "admin"));
    const adminsSnap = await getDocs(adminsQuery);

    // Create notification for each admin
    const notificationPromises = adminsSnap.docs.map((adminDoc) =>
      sendUnifiedNotification(
        adminDoc.id,
        "user_submission",
        `New Work Submission from ${userName}`,
        `${userName} submitted work on ${platform}. Description: ${description}. Amount: ৳${amount}`,
        amount,
        {
          userId,
          userName,
          platform,
          description,
          amount,
        }
      )
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error("[v0] Error notifying admins:", error);
  }
}

/**
 * Create a notification for admins when a user requests withdrawal
 */
export async function notifyAdminsOfWithdrawal(
  userId: string,
  userName: string,
  amount: number,
  bankAccount: string
) {
  try {
    const adminsQuery = query(collection(db, "users"), where("role", "==", "admin"));
    const adminsSnap = await getDocs(adminsQuery);

    const notificationPromises = adminsSnap.docs.map((adminDoc) =>
      sendUnifiedNotification(
        adminDoc.id,
        "withdrawal_request",
        `New Withdrawal Request from ${userName}`,
        `${userName} requested withdrawal of ৳${amount} to account ${bankAccount}`,
        amount,
        {
          userId,
          userName,
          amount,
          bankAccount,
        }
      )
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error("[v0] Error notifying admins of withdrawal:", error);
  }
}

/**
 * Create a notification for a user when admin takes action
 */
export async function notifyUserOfAction(
  userId: string,
  type: "task_approved" | "task_rejected" | "withdrawal_approved" | "withdrawal_rejected",
  title: string,
  message: string,
  amount?: number
) {
  try {
    await sendUnifiedNotification(userId, type, title, message, amount);
  } catch (error) {
    console.error("[v0] Error notifying user:", error);
  }
}
