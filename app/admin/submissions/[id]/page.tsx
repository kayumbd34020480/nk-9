"use client";

import { DialogClose } from "@/components/ui/dialog"
import { DialogContent } from "@/components/ui/dialog"
import { Dialog } from "@/components/ui/dialog"
import { X } from "lucide-react"; // Import X from lucide-react
import { ZoomIn } from "lucide-react"; // Import ZoomIn from lucide-react

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Submission {
  id: string;
  taskId?: string;
  taskTitle: string;
  userId: string;
  userEmail: string;
  proofText?: string;
  proofUrl?: string;
  reward?: number;
  status: "pending" | "approved" | "rejected";
  type?: "task" | "manual";
  createdAt: Date;
  submissionImages?: string[];
}

export default function AdminSubmissionViewPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const docRef = doc(db, "taskSubmissions", submissionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setSubmission({
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate() || new Date(),
          } as Submission);
        }
      } catch (error) {
        console.error("[v0] Error fetching submission:", error);
      } finally {
        setLoading(false);
      }
    };

    if (submissionId) {
      fetchSubmission();
    }
  }, [submissionId]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 pb-24">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-6 bg-transparent border-gray-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-4 md:p-6 lg:p-8 pb-24">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-6 bg-transparent border-gray-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card className="border-0 shadow-md">
            <CardContent className="pt-8 text-center">
              <p className="text-gray-500">Submission not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6 bg-transparent border-gray-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-emerald-900">Submission Details</h1>
          <p className="text-emerald-700 mt-1">View-only mode</p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-emerald-900">Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Task Title</p>
                  <p className="text-lg font-semibold text-gray-900">{submission.taskTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">User Email</p>
                  <p className="text-lg font-semibold text-gray-900 break-all">{submission.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Reward Amount</p>
                  <p className="text-lg font-semibold text-emerald-600">৳{(submission.reward || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      submission.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : submission.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Submitted Date</p>
                  <p className="text-lg font-semibold text-gray-900">{submission.createdAt.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proof Information */}
          {submission.proofText && (
            <Card className="border-0 shadow-md bg-white">
              <CardHeader>
                <CardTitle className="text-emerald-900">Proof Text</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{submission.proofText}</p>
              </CardContent>
            </Card>
          )}

          {submission.proofUrl && (
            <Card className="border-0 shadow-md bg-white">
              <CardHeader>
                <CardTitle className="text-emerald-900">Proof URL</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={submission.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 break-all"
                >
                  {submission.proofUrl}
                </a>
              </CardContent>
            </Card>
          )}

          {/* Submission Images */}
          {submission.submissionImages && submission.submissionImages.length > 0 && (
            <Card className="border-0 shadow-md bg-white">
              <CardHeader>
                <CardTitle className="text-emerald-900">Submission Images</CardTitle>
                <CardDescription>{submission.submissionImages.length} image(s) - Click to view full size</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {submission.submissionImages.map((imageUrl, index) => (
                    <a
                      key={index}
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group block overflow-hidden rounded-lg border border-gray-200 hover:border-emerald-400 transition-colors"
                    >
                      <img
                        src={imageUrl || "/placeholder.svg"}
                        alt={`Submission image ${index + 1}`}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
