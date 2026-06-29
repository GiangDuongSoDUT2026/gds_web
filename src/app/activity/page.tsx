"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, Play, Cpu, Radio, MessageSquare, TrendingUp, CheckCircle2, Upload, Tv2 } from "lucide-react";
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
  const completionData = tl?.days.map((d, i) => ({ day: d.slice(5), value: tl.completions[i] })) ?? [];
  const uploadData = tl?.days.map((d, i) => ({
    day: d.slice(5),
    "Tổng upload": tl.uploads[i],
    "Thất bại": tl.failed[i],
  })) ?? [];

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
          <p className="text-sm text-muted-foreground mt-0.5">Thời gian thực + thống kê 7 ngày qua</p>
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
            label="Bài giảng đang xem"
            value={rt?.lectures_watched ?? 0}
            icon={Play}
            color="text-green-500"
            sub="trong 5 phút qua"
          />
          <StatBox
            label="Đang xử lý hôm nay"
            value={rt?.processing_today ?? 0}
            icon={Cpu}
            color="text-yellow-500"
            sub="chưa hoàn thành"
          />
          <StatBox
            label="Video đang stream"
            value={rt?.streaming_now ?? 0}
            icon={Radio}
            color="text-red-500"
            sub="trong 2 phút qua"
          />
        </div>
      )}

      <hr className="border-border" />
      <p className="text-sm font-medium text-muted-foreground">Thống kê 7 ngày qua</p>

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

          {/* Chart 2: Access events */}
          <ChartCard title="Lượt truy cập" icon={TrendingUp}>
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

          {/* Chart 3: Completed lectures */}
          <ChartCard title="Bài hoàn thành" icon={CheckCircle2}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Hoàn thành" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 4: Uploads */}
          <ChartCard title="Video upload & xử lý" icon={Upload}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={uploadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Tổng upload" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Thất bại" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Chart 5: Streaming now (realtime bar — single value) */}
      {!isLoading && (
        <ChartCard title="Video đang được stream ngay bây giờ" icon={Tv2}>
          <div className="flex items-center gap-6 py-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-3 w-3 rounded-full ${(rt?.streaming_now ?? 0) > 0 ? "bg-red-500 animate-pulse" : "bg-gray-400"}`} />
              <span className="text-3xl font-bold">{rt?.streaming_now ?? 0}</span>
              <span className="text-muted-foreground text-sm">video đang stream</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{rt?.lectures_watched ?? 0}</span> bài giảng có người xem trong 5 phút qua
            </div>
          </div>
        </ChartCard>
      )}
    </div>
  );
}
