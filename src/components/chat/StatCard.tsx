import { CheckCircle, Clock, Loader2, Video, X, BookOpen, BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChatCard, StatsCard, TableCard } from "@/types/api";

const ICON_MAP: Record<string, React.ReactNode> = {
  video: <Video className="h-4 w-4" />,
  check: <CheckCircle className="h-4 w-4" />,
  loader: <Loader2 className="h-4 w-4 animate-spin" />,
  x: <X className="h-4 w-4" />,
  clock: <Clock className="h-4 w-4" />,
  book: <BookOpen className="h-4 w-4" />,
};

const COLOR_MAP: Record<string, string> = {
  green: "text-green-600 bg-green-50",
  red: "text-red-600 bg-red-50",
  blue: "text-blue-600 bg-blue-50",
  orange: "text-orange-600 bg-orange-50",
};

function StatsCardView({ data }: { data: StatsCard }) {
  return (
    <Card className="w-full max-w-xl my-2 border-primary/20">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart className="h-4 w-4 text-primary" />
          {data.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {data.metrics.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 flex flex-col gap-1 ${m.color ? COLOR_MAP[m.color] : "bg-muted"}`}
            >
              <div className="flex items-center gap-1 text-xs opacity-70">
                {m.icon && ICON_MAP[m.icon]}
                {m.label}
              </div>
              <div className="text-xl font-bold">{m.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TableCardView({ data }: { data: TableCard }) {
  return (
    <Card className="w-full my-2 border-primary/20">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">{data.title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              {data.columns.map((col) => (
                <th key={col} className="text-left py-1 px-2 font-medium text-muted-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                {row.map((cell, j) => (
                  <td key={j} className="py-1.5 px-2">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function ChatCardView({ card }: { card: ChatCard }) {
  if (card.__card_type === "stats") return <StatsCardView data={card as StatsCard} />;
  if (card.__card_type === "table") return <TableCardView data={card as TableCard} />;
  return null;
}
