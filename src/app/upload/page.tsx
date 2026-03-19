"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadForm } from "@/components/upload/UploadForm";
import { useAuthStore } from "@/store/useAuthStore";

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, isTeacherOrAbove } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated()) {
    return null;
  }

  if (!isTeacherOrAbove()) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h1 className="text-xl font-semibold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to upload lectures. This feature is available to Teachers
            and Administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Upload Lecture</h1>
        <p className="text-muted-foreground mt-1">
          Upload a video lecture to process it through the AI pipeline. After upload, the system
          will extract scenes, transcribe audio, detect text on slides, and create semantic
          embeddings.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
