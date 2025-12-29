// frontend/src/features/individual/components/student/ProgressHistoryChart.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface WeeklyData {
  weekNumber: number;
  completionRate: number;
  averageScore?: number;
  completedLessons: number;
  totalLessons: number;
}

interface ProgressHistoryChartProps {
  data: WeeklyData[];
  chartType?: "line" | "bar";
  showLegend?: boolean;
  height?: number;
}

export function ProgressHistoryChart({
  data,
  chartType = "line",
  showLegend = true,
  height = 300,
}: ProgressHistoryChartProps) {
  const getTrendInfo = () => {
    if (data.length < 2) {
      return { trend: "stable", change: 0, icon: Minus, color: "text-gray-600" };
    }

    const recent = data[data.length - 1];
    const previous = data[data.length - 2];
    const change = recent.completionRate - previous.completionRate;

    if (change > 5) {
      return { trend: "improving", change, icon: TrendingUp, color: "text-green-600" };
    }
    if (change < -5) {
      return { trend: "declining", change, icon: TrendingDown, color: "text-red-600" };
    }
    return { trend: "stable", change, icon: Minus, color: "text-gray-600" };
  };

  const trendInfo = getTrendInfo();
  const TrendIcon = trendInfo.icon;

  const customTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <div className="font-semibold mb-2">Week {data.weekNumber}</div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Completion:</span>
            <span className="font-semibold text-primary">
              {Math.round(data.completionRate)}%
            </span>
          </div>
          {data.averageScore !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Avg Score:</span>
              <span className="font-semibold">{Math.round(data.averageScore)}%</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Lessons:</span>
            <span>
              {data.completedLessons} / {data.totalLessons}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Weekly Progress History</CardTitle>
          <div className="flex items-center gap-2">
            <TrendIcon className={`h-5 w-5 ${trendInfo.color}`} />
            <Badge
              variant="outline"
              className={
                trendInfo.trend === "improving"
                  ? "bg-green-500/10 text-green-700 border-green-200"
                  : trendInfo.trend === "declining"
                  ? "bg-red-500/10 text-red-700 border-red-200"
                  : "bg-gray-500/10 text-gray-700 border-gray-200"
              }
            >
              {trendInfo.trend === "improving" && "+"}
              {trendInfo.trend === "declining" && ""}
              {Math.abs(Math.round(trendInfo.change))}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="weekNumber"
                label={{ value: "Week", position: "insideBottom", offset: -5 }}
                className="text-xs"
              />
              <YAxis
                label={{ value: "Percentage (%)", angle: -90, position: "insideLeft" }}
                domain={[0, 100]}
                className="text-xs"
              />
              <Tooltip content={customTooltip} />
              {showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey="completionRate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Completion Rate"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              {data.some(d => d.averageScore !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="averageScore"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Average Score"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="weekNumber"
                label={{ value: "Week", position: "insideBottom", offset: -5 }}
                className="text-xs"
              />
              <YAxis
                label={{ value: "Percentage (%)", angle: -90, position: "insideLeft" }}
                domain={[0, 100]}
                className="text-xs"
              />
              <Tooltip content={customTooltip} />
              {showLegend && <Legend />}
              <Bar
                dataKey="completionRate"
                fill="hsl(var(--primary))"
                name="Completion Rate"
                radius={[4, 4, 0, 0]}
              />
              {data.some(d => d.averageScore !== undefined) && (
                <Bar
                  dataKey="averageScore"
                  fill="hsl(var(--chart-2))"
                  name="Average Score"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {Math.round(
                data.reduce((sum, d) => sum + d.completionRate, 0) / data.length
              )}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg Completion
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {data.reduce((sum, d) => sum + d.completedLessons, 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Total Completed
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {data.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Weeks Tracked
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}