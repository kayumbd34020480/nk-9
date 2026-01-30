"use client";

import React from "react"

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, ImageIcon } from "lucide-react";

interface SubmissionImageUploadProps {
  onImagesUpload: (urls: string[]) => void;
  initialImages?: string[];
  maxImages?: number;
  maxFileSize?: number;
}

const CLOUDINARY_CLOUD_NAME = "dfrtk7d4k";
const CLOUDINARY_UPLOAD_PRESET = "skl_app_upload";

export function SubmissionImageUpload({
  onImagesUpload,
  initialImages = [],
  maxImages = 20,
  maxFileSize = 20 * 1024 * 1024, // 20MB
}: SubmissionImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setError(null);
    const filesToUpload = Array.from(files);

    // Check if adding these files would exceed maxImages
    if (uploadedImages.length + filesToUpload.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed. You can upload ${maxImages - uploadedImages.length} more.`);
      return;
    }

    setIsUploading(true);

    try {
      const newUrls: string[] = [];

      for (const file of filesToUpload) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed");
          setIsUploading(false);
          return;
        }

        // Validate file size
        if (file.size > maxFileSize) {
          setError(`Image size must be less than ${maxFileSize / 1024 / 1024}MB`);
          setIsUploading(false);
          return;
        }

        // Upload to Cloudinary with progress tracking
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append("file", file);
        cloudinaryFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        cloudinaryFormData.append("folder", "skl_app_submissions");

        const fileKey = `${file.name}-${Date.now()}`;
        setCurrentFileName(file.name);

        const result = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Track upload progress
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              setUploadProgress((prev) => ({
                ...prev,
                [fileKey]: percentComplete,
              }));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status === 200) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data);
              } catch {
                reject(new Error("Invalid response from Cloudinary"));
              }
            } else {
              reject(new Error("Failed to upload image to Cloudinary"));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.open(
            "POST",
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
          );
          xhr.send(cloudinaryFormData);
        });

        newUrls.push(result.secure_url);
        console.log("[v0] Image uploaded successfully:", result.secure_url);

        // Clear progress for this file
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileKey];
          return newProgress;
        });
      }

      const allImages = [...uploadedImages, ...newUrls];
      setUploadedImages(allImages);
      onImagesUpload(allImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload images");
      console.error("[v0] Image upload error:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    onImagesUpload(newImages);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Upload Images <span className="text-gray-500">(Optional - Max {maxImages})</span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isUploading || uploadedImages.length >= maxImages}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || uploadedImages.length >= maxImages}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-600">
            {isUploading ? "Uploading..." : uploadedImages.length >= maxImages ? "Maximum images reached" : "Click to upload images"}
          </span>
        </button>
        <p className="text-xs text-gray-500 mt-1">
          {uploadedImages.length}/{maxImages} images • Max 20MB per image
        </p>
      </div>

      {/* Upload Progress */}
      {isUploading && Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              <p className="text-sm font-medium text-blue-900">
                Uploading: {currentFileName}
              </p>
            </div>
            <p className="text-sm text-blue-700 font-semibold">
              {Math.max(...Object.values(uploadProgress))}%
            </p>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${Math.max(...Object.values(uploadProgress))}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-blue-600">
            <span>Uploading...</span>
            <span>
              {Math.max(...Object.values(uploadProgress)) === 100
                ? "Processing..."
                : `${Math.max(...Object.values(uploadProgress))} MB/s`}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Uploaded Images ({uploadedImages.length}/{maxImages})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {uploadedImages.map((imageUrl, index) => (
              <div key={index} className="relative group overflow-hidden rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <img
                  src={imageUrl || "/placeholder.svg"}
                  alt={`Submission ${index + 1}`}
                  className="w-full h-24 sm:h-28 object-cover group-hover:brightness-75 transition-brightness"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
