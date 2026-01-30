"use client";

import React from "react"

import { useFcmToken } from "@/hooks/useFcmToken";

export function FcmProvider({ children }: { children: React.ReactNode }) {
  // Initialize FCM token when the app starts
  useFcmToken();
  
  return <>{children}</>;
}
