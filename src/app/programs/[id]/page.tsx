"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, BookOpen, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getProgram,
  getCoursesByProgram,
  createCourse,
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

const courseSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  code: z.string().min(1, "Course code is required").max(20),
  description: z.string().max(500).optional().default(""),
});

type CourseFormValues = z.infer<typeof courseSchema>;

function AddCourseDialog({ programId }: { programId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { name: "", code: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: CourseFormValues) =>
      createCourse(programId, {
        name: values.name,
        code: values.code,
        description: values.description ?? "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.byProgram(programId),
      });
      toast.success("Course created successfully");
      setOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to create course");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Course
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Course</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Machine Learning" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Code</FormLabel>
                    <FormControl>
                      <Input placeholder="CS401" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Course description..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="gap-2">
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Create Course
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const programId = params.id;

  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: queryKeys.programs.detail(programId),
    queryFn: () => getProgram(programId),
    enabled: !!programId,
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: queryKeys.courses.byProgram(programId),
    queryFn: () => getCoursesByProgram(programId),
    enabled: !!programId,
  });

  const isLoading = programLoading || coursesLoading;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/programs">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Programs
          </Link>
        </Button>
      </div>

      {/* Program header */}
      {programLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      ) : program ? (
        <div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{program.name}</h1>
              {program.description && (
                <p className="text-muted-foreground mt-1">
                  {program.description}
                </p>
              )}
            </div>
            <AddCourseDialog programId={programId} />
          </div>
        </div>
      ) : null}

      {/* Courses */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Courses{" "}
          {courses && (
            <span className="text-muted-foreground font-normal">
              ({courses.length})
            </span>
          )}
        </h2>

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        )}

        {!isLoading && courses && courses.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No courses yet</p>
            <p className="text-sm text-muted-foreground">
              Add a course to this program
            </p>
          </div>
        )}

        {courses && courses.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <CardTitle className="text-sm line-clamp-1">
                            {course.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {course.code}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                    {course.description && (
                      <CardDescription className="line-clamp-2 text-xs">
                        {course.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Click to view chapters and lectures
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
