"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, ChevronRight, Loader2, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

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
import { getPrograms, createProgram, updateProgram, deleteProgram } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { Program } from "@/types/api";

const programSchema = z.object({
  name: z.string().min(1, "Tên chương trình không được để trống").max(200),
  description: z.string().max(500).optional().default(""),
});

type ProgramFormValues = z.infer<typeof programSchema>;

function CreateProgramDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: { name: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ProgramFormValues) =>
      createProgram({
        name: values.name,
        description: values.description ?? "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all() });
      toast.success("Đã tạo chương trình học");
      setOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Không thể tạo chương trình");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm chương trình
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo chương trình học</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên chương trình</FormLabel>
                  <FormControl>
                    <Input placeholder="Công nghệ Thông tin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mô tả ngắn về chương trình..."
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
                Hủy
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="gap-2">
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Tạo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditProgramDialog({ program, onClose }: { program: Program; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: { name: program.name, description: program.description ?? "" },
  });
  const mutation = useMutation({
    mutationFn: (values: ProgramFormValues) => updateProgram(program.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all() });
      toast.success("Đã cập nhật chương trình");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message ?? "Không thể cập nhật"),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Chỉnh sửa chương trình</DialogTitle></DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Tên chương trình</FormLabel>
              <FormControl><Input {...field} /></FormControl><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Mô tả</FormLabel>
              <FormControl><Textarea {...field} /></FormControl><FormMessage />
            </FormItem>
          )} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

export default function ProgramsPage() {
  const [editProgram, setEditProgram] = useState<Program | null>(null);
  const { isSchoolAdminOrAbove } = useAuthStore();
  const canManage = isSchoolAdminOrAbove();
  const queryClient = useQueryClient();

  const { data: programs, isLoading, error } = useQuery({
    queryKey: queryKeys.programs.all(),
    queryFn: getPrograms,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all() });
      toast.success("Đã xóa chương trình");
    },
    onError: (err: Error) => toast.error(err.message ?? "Không thể xóa"),
  });

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chương trình học</h1>
          <p className="text-muted-foreground">
            Quản lý các chương trình học và môn học
          </p>
        </div>
        <CreateProgramDialog />
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Không tải được danh sách chương trình. Vui lòng thử lại.
        </div>
      )}

      {programs && programs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Chưa có chương trình nào</p>
          <p className="text-sm text-muted-foreground mb-4">
            Tạo chương trình học đầu tiên để bắt đầu
          </p>
          <CreateProgramDialog />
        </div>
      )}

      {programs && programs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <div key={program.id} className="relative group">
              <Link href={`/programs/${program.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary shrink-0" />
                        <CardTitle className="text-base line-clamp-1">
                          {program.name}
                        </CardTitle>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                    {program.description && (
                      <CardDescription className="line-clamp-2">
                        {program.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Nhấn để xem các môn học
                    </p>
                  </CardContent>
                </Card>
              </Link>
              {canManage && (
                <div className="absolute top-2 right-8 hidden group-hover:flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={(e) => { e.preventDefault(); setEditProgram(program); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={(e) => { e.preventDefault(); if (confirm(`Xóa "${program.name}"?`)) deleteMutation.mutate(program.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editProgram} onOpenChange={(o) => !o && setEditProgram(null)}>
        {editProgram && <EditProgramDialog program={editProgram} onClose={() => setEditProgram(null)} />}
      </Dialog>
    </div>
  );
}
