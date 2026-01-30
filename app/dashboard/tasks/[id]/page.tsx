"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Coins, Clock, CheckCircle, X } from "lucide-react";
import { notifyAdminsOfSubmission } from "@/lib/notification-service";
import { SubmissionImageUpload } from "@/components/submission-image-upload";

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  isPublished: boolean;
  workerLimit: number;
  createdAt: Date;
  taskImages?: string[];
}

interface Submission {
  taskId: string;
  status: "pending" | "approved" | "rejected";
}

export default function TaskViewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const taskId = params.id as string;
  const isReadOnly = searchParams.get("view") === "submission";

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [proofText, setProofText] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [submissionImages, setSubmissionImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionCounts, setSubmissionCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!taskId) return;

    // Fetch task details
    const fetchTask = async () => {
      try {
        const taskCollection = collection(db, "tasks");
        const q = query(taskCollection);
        const snapshot = await getDocs(q);
        const taskDoc = snapshot.docs.find((doc) => doc.id === taskId);

        if (taskDoc) {
          setTask({
            id: taskDoc.id,
            ...taskDoc.data(),
            createdAt: taskDoc.data().createdAt?.toDate() || new Date(),
          } as Task);
        }
      } catch (error) {
        console.error("[v0] Error fetching task:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  useEffect(() => {
    if (!user || !taskId) return;

    // Check user's submission for this task
    const submissionsQuery = query(
      collection(db, "taskSubmissions"),
      where("userId", "==", user.uid),
      where("taskId", "==", taskId)
    );

    const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
      if (snapshot.docs.length > 0) {
        const submissionDoc = snapshot.docs[0];
        setSubmission({
          taskId: submissionDoc.data().taskId,
          status: submissionDoc.data().status,
        });
      } else {
        setSubmission(null);
      }
    });

    return () => unsubscribe();
  }, [user, taskId]);

  useEffect(() => {
    // Real-time listener for all task submissions (for counting)
    const allSubmissionsQuery = collection(db, "taskSubmissions");
    const unsubscribe = onSnapshot(allSubmissionsQuery, (snapshot) => {
      const counts: { [key: string]: number } = {};
      snapshot.docs.forEach((doc) => {
        const tId = doc.data().taskId;
        if (tId) {
          counts[tId] = (counts[tId] || 0) + 1;
        }
      });
      setSubmissionCounts(counts);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitTask = async () => {
    if (!user || !task) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "taskSubmissions"), {
        taskId: task.id,
        taskTitle: task.title,
        userId: user.uid,
        userEmail: user.email,
        proofText,
        proofUrl,
        submissionImages: submissionImages.length > 0 ? submissionImages : undefined,
        reward: task.reward,
        status: "pending",
        type: "task",
        createdAt: serverTimestamp(),
      });

      // Notify admins
      await notifyAdminsOfSubmission(
        user.uid,
        user.displayName || user.email || "User",
        task.title,
        proofText,
        task.reward
      );

      setDialogOpen(false);
      setProofText("");
      setProofUrl("");
      setSubmissionImages([]);
    } catch (error) {
      console.error("[v0] Error submitting task:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pb-24">
        <div className="max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-48" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pb-24">
        <div className="max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-6 bg-transparent border-gray-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">Task not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const spotsRemaining = task.workerLimit - (submissionCounts[task.id] || 0);
  const isFull = spotsRemaining <= 0;

  return (
    <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pb-24">
      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6 bg-transparent border-gray-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>

        <Card className="border-0 shadow-md bg-white mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl md:text-3xl text-emerald-900 mb-2">{task.title}</CardTitle>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-emerald-600" />
                    <span className="text-lg font-semibold text-emerald-700">৳{Math.round(task.reward)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {submissionCounts[task.id] || 0} of {task.workerLimit} spots filled
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {task.taskImages && task.taskImages.length > 0 && (
          <Card className="border-0 shadow-md bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-emerald-900">Task Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {task.taskImages.map((imageUrl, index) => (
                  <a
                    key={index}
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group rounded-lg overflow-hidden border border-gray-200 hover:border-emerald-400 transition-colors cursor-pointer"
                  >
                    <img
                      src={imageUrl || "/placeholder.svg"}
                      alt={`Task ${index + 1}`}
                      className="w-full h-48 object-cover group-hover:brightness-90 transition-brightness"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <svg
                        className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-md bg-white mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-900">Task Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{task.description}</p>
          </CardContent>
        </Card>

        {submission ? (
          <Card className="border-0 shadow-md bg-white">
            <CardContent className="pt-6">
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  submission.status === "approved"
                    ? "bg-emerald-50 text-emerald-700"
                    : submission.status === "rejected"
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {submission.status === "approved" ? (
                  <CheckCircle className="h-6 w-6" />
                ) : submission.status === "rejected" ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Clock className="h-6 w-6" />
                )}
                <span className="font-medium">
                  {submission.status === "approved"
                    ? "Task completed and approved!"
                    : submission.status === "rejected"
                    ? "Your submission was rejected. You can submit again."
                    : "Your submission is pending review"}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : isFull ? (
          <Card className="border-0 shadow-md bg-white">
            <CardContent className="pt-6">
              <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 font-medium">
                This task is full. No more submissions are being accepted.
              </div>
            </CardContent>
          </Card>
        ) : !isReadOnly ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Button
              onClick={() => setDialogOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg"
            >
              Submit Task Proof
            </Button>

            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-emerald-900">Submit Task Proof</DialogTitle>
                <DialogDescription>
                  Provide proof of completing &quot;{task.title}&quot;
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="proofText">Description / Notes</Label>
                  <Textarea
                    id="proofText"
                    placeholder="Describe how you completed the task..."
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                    className="min-h-[100px] border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proofUrl">Proof URL (optional)</Label>
                  <Input
                    id="proofUrl"
                    type="url"
                    placeholder="https://..."
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <SubmissionImageUpload
                  onImagesUpload={setSubmissionImages}
                  initialImages={submissionImages}
                />
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="border-gray-200 bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitTask}
                    disabled={submitting || !proofText}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  );
}
