"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Coins, Loader2 } from "lucide-react";

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

export default function AdminTaskViewPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) return;

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

  if (loading) {
    return (
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pb-24">
        <div className="max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
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
            Back
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

  return (
    <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pb-24">
      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6 bg-transparent border-gray-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Task Header */}
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
                    Max workers: {task.workerLimit}
                  </div>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                {task.isPublished ? "Published" : "Draft"}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Task Images */}
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

        {/* Task Description */}
        <Card className="border-0 shadow-md bg-white mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-900">Task Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{task.description}</p>
          </CardContent>
        </Card>

        {/* Read-only Notice */}
        <Card className="border-0 shadow-md bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-blue-800">
              <div className="text-sm font-medium">
                This is a read-only view of the original task. Admins can use this to review the task details that users submitted for.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
