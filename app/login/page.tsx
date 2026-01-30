"use client";

import React from "react"

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Mail, Lock, AlertCircle, ArrowLeft, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      
      // Get user role from Firestore to determine redirect
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/dashboard/tasks");
          }
        } else {
          router.push("/dashboard/tasks");
        }
      } else {
        router.push("/dashboard/tasks");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in. Please check your credentials.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccessMessage("Password reset link sent to your email!");
      setTimeout(() => {
        setMode("login");
        setResetEmail("");
        setSuccessMessage("");
      }, 3000);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (firebaseError.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(firebaseError.message || "Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchToResetMode = () => {
    setMode("reset");
    setError("");
    setResetEmail(email); // Pre-fill with login email if entered
  };

  const switchToLoginMode = () => {
    setMode("login");
    setError("");
    setSuccessMessage("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        {mode === "login" ? (
          <>
            <CardHeader className="space-y-2 text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-emerald-900">Welcome Back</CardTitle>
              <CardDescription className="text-emerald-700">
                Sign in to access your NK TECH ZONE dashboard
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-emerald-800">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-emerald-800">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={switchToResetMode}
                    className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline font-medium mt-1"
                  >
                    Forgot Password?
                  </button>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-6 pt-6">
                <Button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <p className="text-sm text-center text-emerald-700 mt-2">
                  {"Don't have an account? "}
                  <Link href="/register" className="font-semibold text-emerald-600 hover:underline">
                    Register
                  </Link>
                </p>
              </CardFooter>
            </form>
          </>
        ) : (
          <>
            <CardHeader className="space-y-2 text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-2">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-emerald-900">Reset Password</CardTitle>
              <CardDescription className="text-emerald-700">
                Enter your email address and we&apos;ll send you a link to reset your password
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleResetPassword}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {successMessage && (
                  <Alert className="bg-emerald-50 border-emerald-200">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-700">{successMessage}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="resetEmail" className="text-emerald-800">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="Enter your email address"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-6">
                <Button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={loading || !!successMessage}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={switchToLoginMode}
                  className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-transparent"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
