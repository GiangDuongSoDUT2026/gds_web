"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, Play, Cpu, Radio, MessageSquare, TrendingUp, CheckCircle2, Upload } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { getActivityStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StatBox({
  label, value, icon: Icon, color, sub,
}: { label: string; value: number | string; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 flex items-start gap-4">
        <div className={`rounded-lg p-2 ${color} bg-opacity-10 shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

const TICK_STYLE = { fontSize: 11 };

export default function ActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["activity-stats"],
    queryFn: getActivityStats,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const rt = data?.realtime;
  const tl = data?.timeline;

  // Build recharts data arrays
  const chatData = tl?.days.map((d, i) => ({ day: d.slice(5), value: tl.chat[i] })) ?? [];
  const accessData = tl?.days.map((d, i) => ({ day: d.slice(5), value: tl.access[i] })) ?? [];
  const uploadData = tl?.days.map((d, i) => ({ day: d.slice(5), value: tl.uploads[i] })) ?? [];
  const gpuData = tl?.days.map((d, i) => ({ day: d.slice(5), value: tl.gpu_completed[i] })) ?? [];

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Trang chủ
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Hoạt động hệ thống</h1>
        </div>
      </div>

      {/* 4 realtime stat boxes */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBox
            label="Người dùng đang hoạt động"
            value={rt?.active_users ?? 0}
            icon={Users}
            color="text-blue-500"
            sub="trong 5 phút qua"
          />
          <StatBox
            label="Số lượng video lưu trữ"
            value={rt?.total_videos_stored ?? 0}
            icon={Play}
            color="text-green-500"
          />
          <StatBox
            label="Đang xử lý"
            value={rt?.processing_today ?? 0}
            icon={Cpu}
            color="text-yellow-500"
            sub="chưa hoàn thành / thất bại"
          />
          <StatBox
            label="Video đang stream"
            value={rt?.streaming_now ?? 0}
            icon={Radio}
            color="text-red-500"
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chart 1: Chat messages */}
          <ChartCard title="Số lượng chat" icon={MessageSquare}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chatData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" name="Tin nhắn" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 2: Search events */}
          <ChartCard title="Lượt tìm kiếm" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={accessData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" name="Sự kiện" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 3: Video uploads per day */}
          <ChartCard title="Số video upload" icon={Upload}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={uploadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Upload" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 4: GPU activity — jobs completed per day */}
          <ChartCard title="GPU hoạt động" icon={CheckCircle2}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gpuData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Jobs hoàn thành" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

    </div>
  );
}
