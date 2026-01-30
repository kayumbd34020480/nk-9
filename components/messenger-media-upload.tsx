"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ImageIcon, Video, Upload, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaItem {
  url: string;
  type: "image" | "video";
}

interface UploadProgress {
  fileName: string;
  progress: number;
  size: number;
  status: "uploading" | "complete" | "error";
  error?: string;
}

interface MessengerMediaUploadProps {
  onUpload: (media: MediaItem[]) => void;
  onClose: () => void;
}

const CLOUDINARY_CLOUD_NAME = "dfrtk7d4k";
const CLOUDINARY_UPLOAD_PRESET = "skl_app_upload";
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_IMAGES = 20;
const MAX_VIDEOS = 5;

export function MessengerMediaUpload({ onUpload, onClose }: MessengerMediaUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (files: FileList | File[]): { valid: File[]; errors: string[] } => {
    const validFiles: File[] = [];
    const errors: string[] = [];
    const fileArray = Array.from(files);

    let imageCount = 0;
    let videoCount = 0;

    for (const file of fileArray) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        errors.push(`${file.name}: Unsupported file type`);
        continue;
      }

      if (isImage) {
        if (file.size > MAX_IMAGE_SIZE) {
          errors.push(`${file.name}: Image exceeds 20MB limit`);
          continue;
        }
        imageCount++;
        if (imageCount > MAX_IMAGES) {
          errors.push(`Maximum ${MAX_IMAGES} images allowed`);
          continue;
        }
      }

      if (isVideo) {
        if (file.size > MAX_VIDEO_SIZE) {
          errors.push(`${file.name}: Video exceeds 20MB limit`);
          continue;
        }
        videoCount++;
        if (videoCount > MAX_VIDEOS) {
          errors.push(`Maximum ${MAX_VIDEOS} videos allowed`);
          continue;
        }
      }

      validFiles.push(file);
    }

    return { valid: validFiles, errors };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const { valid, errors } = validateFiles(e.target.files);

    if (errors.length > 0) {
      setError(errors.join("\n"));
    } else {
      setError(null);
    }

    setSelectedFiles((prev) => {
      const newFiles = [...prev, ...valid];
      // Re-validate combined files
      const combined = validateFiles(newFiles);
      if (combined.errors.length > 0) {
        setError(combined.errors.join("\n"));
        return combined.valid;
      }
      return newFiles;
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadToCloudinary = async (file: File, index: number): Promise<MediaItem | null> => {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const resourceType = file.type.startsWith("video/") ? "video" : "image";
      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress((prev) =>
            prev.map((p, i) =>
              i === index ? { ...p, progress, status: "uploading" } : p
            )
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setUploadProgress((prev) =>
            prev.map((p, i) =>
              i === index ? { ...p, progress: 100, status: "complete" } : p
            )
          );
          resolve({
            url: response.secure_url,
            type: resourceType as "image" | "video",
          });
        } else {
          setUploadProgress((prev) =>
            prev.map((p, i) =>
              i === index ? { ...p, status: "error", error: "Upload failed" } : p
            )
          );
          resolve(null);
        }
      };

      xhr.onerror = () => {
        setUploadProgress((prev) =>
          prev.map((p, i) =>
            i === index ? { ...p, status: "error", error: "Network error" } : p
          )
        );
        resolve(null);
      };

      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    // Initialize progress tracking
    setUploadProgress(
      selectedFiles.map((file) => ({
        fileName: file.name,
        progress: 0,
        size: file.size,
        status: "uploading" as const,
      }))
    );

    // Upload all files
    const uploadPromises = selectedFiles.map((file, index) =>
      uploadToCloudinary(file, index)
    );

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((r): r is MediaItem => r !== null);

    if (successfulUploads.length > 0) {
      onUpload(successfulUploads);
    }

    if (successfulUploads.length < selectedFiles.length) {
      setError(`${selectedFiles.length - successfulUploads.length} file(s) failed to upload`);
    }

    setIsUploading(false);
  };

  const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
  const imageCount = selectedFiles.filter((f) => f.type.startsWith("image/")).length;
  const videoCount = selectedFiles.filter((f) => f.type.startsWith("video/")).length;
  const overallProgress =
    uploadProgress.length > 0
      ? uploadProgress.reduce((acc, p) => acc + p.progress, 0) / uploadProgress.length
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:w-[450px] sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Send Media</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isUploading}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*"
            multiple
            className="hidden"
          />

          {/* Drop Zone */}
          {selectedFiles.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-blue-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">Select photos or videos</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Up to {MAX_IMAGES} images (20MB each) or {MAX_VIDEOS} videos (20MB each)
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {imageCount > 0 && `${imageCount} image${imageCount > 1 ? "s" : ""}`}
                  {imageCount > 0 && videoCount > 0 && ", "}
                  {videoCount > 0 && `${videoCount} video${videoCount > 1 ? "s" : ""}`}
                  {" - "}
                  {formatFileSize(totalSize)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-blue-500"
                >
                  Add more
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {selectedFiles.map((file, index) => {
                  const isImage = file.type.startsWith("image/");
                  const progress = uploadProgress[index];

                  return (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      {isImage ? (
                        <img
                          src={URL.createObjectURL(file) || "/placeholder.svg"}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Video className="h-8 w-8 text-gray-500" />
                        </div>
                      )}

                      {/* Upload Progress Overlay */}
                      {progress && progress.status === "uploading" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="text-center text-white">
                            <p className="text-2xl font-bold">{progress.progress}%</p>
                          </div>
                        </div>
                      )}

                      {/* Complete Indicator */}
                      {progress && progress.status === "complete" && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Error Indicator */}
                      {progress && progress.status === "error" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Remove Button */}
                      {!isUploading && (
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 h-6 w-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      )}

                      {/* File size badge */}
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overall Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="font-semibold text-blue-500">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <p className="text-xs text-gray-500">
                {uploadProgress.filter((p) => p.status === "complete").length} of{" "}
                {uploadProgress.length} files uploaded
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isUploading ? "Uploading..." : `Send ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
