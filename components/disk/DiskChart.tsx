"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DiskChartProps {
  sequence: number[];
}

export default function DiskChart({ sequence }: DiskChartProps) {
  // build { step, track } data
  const data = sequence.map((track, idx) => ({ step: idx, track }));
  return (
    <div className="w-full h-64 bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="step"
            label={{ value: "Step", position: "insideBottom", offset: -5 }}
          />
          <YAxis
            label={{ value: "Track#", angle: -90, position: "insideLeft" }}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="track"
            stroke="#3b82f6"
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
