"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UploadCloud, File, X, Loader2, Files, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProcessingStatus } from "@/components/lecture/ProcessingStatus";
import {
  getPrograms,
  getCoursesByProgram,
  getChaptersByCourse,
  uploadVideo,
  uploadVideoBulk,
  createProgram,
  createCourse,
  createChapter,
} from "@/lib/api";
import { useUploadStore } from "@/store/useUploadStore";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

const CREATE_VALUE = "__create__";

const uploadSchema = z.object({
  title: z.string().max(200).optional(),
  programId: z.string().min(1, "Please select a program"),
  courseId: z.string().min(1, "Please select a course"),
  chapterId: z.string().min(1, "Please select a chapter"),
  uploadedBy: z.string().optional(),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

type CreateDialog = "program" | "course" | "chapter" | null;

export function UploadForm() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    taskId: string;
    lectureId: string;
  } | null>(null);
  const [batchResult, setBatchResult] = useState<{ batch_id: string; total: number } | null>(null);

  // Create-new dialog state
  const [createDialog, setCreateDialog] = useState<CreateDialog>(null);
  const [createName, setCreateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { addBatch } = useUploadStore();
  const queryClient = useQueryClient();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      programId: "",
      courseId: "",
      chapterId: "",
      uploadedBy: "",
    },
  });

  const programId = form.watch("programId");
  const courseId = form.watch("courseId");

  // Cascading selects
  const { data: programs } = useQuery({
    queryKey: queryKeys.programs.all(),
    queryFn: getPrograms,
  });

  const { data: courses } = useQuery({
    queryKey: queryKeys.courses.byProgram(programId),
    queryFn: () => getCoursesByProgram(programId),
    enabled: !!programId,
  });

  const { data: chapters } = useQuery({
    queryKey: queryKeys.chapters.byCourse(courseId),
    queryFn: () => getChaptersByCourse(courseId),
    enabled: !!courseId,
  });

  // Handle Select change — intercept the special __create__ value
  const handleProgramChange = (val: string) => {
    if (val === CREATE_VALUE) {
      setCreateName("");
      setCreateDialog("program");
      return;
    }
    form.setValue("programId", val);
    form.setValue("courseId", "");
    form.setValue("chapterId", "");
  };

  const handleCourseChange = (val: string) => {
    if (val === CREATE_VALUE) {
      setCreateName("");
      setCreateDialog("course");
      return;
    }
    form.setValue("courseId", val);
    form.setValue("chapterId", "");
  };

  const handleChapterChange = (val: string) => {
    if (val === CREATE_VALUE) {
      setCreateName("");
      setCreateDialog("chapter");
      return;
    }
    form.setValue("chapterId", val);
  };

  // Create handlers
  const handleCreateSubmit = async () => {
    if (!createName.trim()) return;
    setIsCreating(true);
    try {
      if (createDialog === "program") {
        const created = await createProgram({ name: createName.trim(), description: "" });
        await queryClient.invalidateQueries({ queryKey: queryKeys.programs.all() });
        form.setValue("programId", created.id);
        form.setValue("courseId", "");
        form.setValue("chapterId", "");
        toast.success(`Program "${created.name}" created`);
      } else if (createDialog === "course") {
        if (!programId) { toast.error("Select a program first"); return; }
        const created = await createCourse(programId, { name: createName.trim(), code: "", description: "" });
        await queryClient.invalidateQueries({ queryKey: queryKeys.courses.byProgram(programId) });
        form.setValue("courseId", created.id);
        form.setValue("chapterId", "");
        toast.success(`Course "${created.name}" created`);
      } else if (createDialog === "chapter") {
        if (!courseId) { toast.error("Select a course first"); return; }
        const nextIndex = (chapters?.length ?? 0) + 1;
        const created = await createChapter(courseId, { title: createName.trim(), order_index: nextIndex });
        await queryClient.invalidateQueries({ queryKey: queryKeys.chapters.byCourse(courseId) });
        form.setValue("chapterId", created.id);
        toast.success(`Chapter "${created.title}" created`);
      }
      setCreateDialog(null);
      setCreateName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setIsCreating(false);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setSelectedFiles(acceptedFiles);
      // Auto-fill title from first filename (single file mode)
      if (acceptedFiles.length === 1) {
        const nameWithoutExt = acceptedFiles[0].name.replace(/\.[^/.]+$/, "");
        if (!form.getValues("title")) {
          form.setValue("title", nameWithoutExt);
        }
      }
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [] },
    multiple: true,
    maxFiles: 20,
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: UploadFormValues) => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one video file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      if (selectedFiles.length === 1) {
        // Single file upload
        const formData = new FormData();
        formData.append("file", selectedFiles[0]);
        formData.append("chapter_id", values.chapterId);
        formData.append("title", values.title || selectedFiles[0].name.replace(/\.[^/.]+$/, ""));
        if (values.uploadedBy) formData.append("uploaded_by", values.uploadedBy);

        const result = await uploadVideo(formData, (pct) => {
          setUploadProgress(pct);
        });

        setUploadResult({
          taskId: result.task_id,
          lectureId: result.lecture_id,
        });

        toast.success("Upload complete! Processing has started.");
      } else {
        // Bulk upload
        const result = await uploadVideoBulk(selectedFiles, values.chapterId, (pct) => {
          setUploadProgress(pct);
        });

        // Register batch in store for polling
        addBatch({
          batch_id: result.batch_id,
          total: result.total,
          succeeded: 0,
          failed: 0,
          processing: result.total,
          status: "PROCESSING",
          items: (result.items as { lecture_id?: string; task_id?: string; filename: string; status: string }[]).map((item) => ({
            lecture_id: item.lecture_id,
            task_id: item.task_id,
            filename: item.filename,
            status: item.status,
          })),
          is_done: false,
        });

        setBatchResult({ batch_id: result.batch_id, total: result.total });
        toast.success(`${result.total} files uploaded. Processing in background — you'll be notified when done.`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (uploadResult) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          Video uploaded successfully. The processing pipeline has started.
        </div>
        <ProcessingStatus
          taskId={uploadResult.taskId}
          lectureId={uploadResult.lectureId}
        />
      </div>
    );
  }

  if (batchResult) {
    return (
      <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 space-y-2">
        <p className="font-semibold">Bulk upload started!</p>
        <p>{batchResult.total} videos are being processed in the background.</p>
        <p className="text-xs text-green-700">
          Batch ID: <code>{batchResult.batch_id}</code> — you&apos;ll receive a notification when processing completes.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setBatchResult(null);
            setSelectedFiles([]);
            form.reset();
          }}
          className="mt-2"
        >
          Upload More
        </Button>
      </div>
    );
  }

  const dialogTitle =
    createDialog === "program" ? "Create new Program" :
    createDialog === "course" ? "Create new Course" :
    "Create new Chapter";

  const dialogPlaceholder =
    createDialog === "program" ? "e.g. Computer Science" :
    createDialog === "course" ? "e.g. Introduction to AI" :
    "e.g. Week 1: Introduction";

  return (
    <>
      {/* Create-new Dialog */}
      <Dialog open={createDialog !== null} onOpenChange={(open) => { if (!open) setCreateDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={dialogPlaceholder}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateSubmit(); } }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(null)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={isCreating || !createName.trim()}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Upload Lecture Video</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Drag-drop zone */}
              <div
                {...getRootProps()}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50",
                  isUploading && "cursor-not-allowed opacity-50"
                )}
              >
                <input {...getInputProps()} />
                {selectedFiles.length > 0 ? (
                  <div className="w-full space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium mb-3">
                      <Files className="h-5 w-5 text-primary" />
                      <span>{selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {selectedFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 rounded px-2 py-1 bg-muted text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <File className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate">{file.name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {(file.size / 1024 / 1024).toFixed(1)} MB
                            </Badge>
                          </div>
                          {!isUploading && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(i);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {!isUploading && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Click or drag to add more files
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {isDragActive
                          ? "Drop video files here"
                          : "Drag & drop video files here"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse — supports MP4, MOV, AVI, MKV (up to 20 files)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload progress */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Form fields — title only shown for single file */}
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedFiles.length <= 1 && (
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Lecture Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Introduction to Machine Learning" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Program selector */}
                <FormField
                  control={form.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={handleProgramChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select program" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {programs?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                          <SelectItem value={CREATE_VALUE} className="text-primary font-medium border-t mt-1 pt-2">
                            <span className="flex items-center gap-1.5">
                              <Plus className="h-3.5 w-3.5" /> Create new program...
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Course selector */}
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={handleCourseChange}
                        disabled={!programId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={programId ? "Select course" : "Select program first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courses?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                          <SelectItem value={CREATE_VALUE} className="text-primary font-medium border-t mt-1 pt-2">
                            <span className="flex items-center gap-1.5">
                              <Plus className="h-3.5 w-3.5" /> Create new course...
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Chapter selector */}
                <FormField
                  control={form.control}
                  name="chapterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chapter</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={handleChapterChange}
                        disabled={!courseId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={courseId ? "Select chapter" : "Select course first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {chapters
                            ?.slice()
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((ch) => (
                              <SelectItem key={ch.id} value={ch.id}>
                                {ch.order_index}. {ch.title}
                              </SelectItem>
                            ))}
                          <SelectItem value={CREATE_VALUE} className="text-primary font-medium border-t mt-1 pt-2">
                            <span className="flex items-center gap-1.5">
                              <Plus className="h-3.5 w-3.5" /> Create new chapter...
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading{selectedFiles.length > 1 ? ` ${selectedFiles.length} files` : ""}...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    {selectedFiles.length > 1
                      ? `Upload ${selectedFiles.length} Files`
                      : "Upload Lecture"}
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
