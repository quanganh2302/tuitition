"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Cột doanh thu theo ngày, tách Trung tâm (CENTER) vs Gia sư (PRIVATE).
const AttendanceChart = ({
  data,
}: {
  data: { name: string; center: number; private: number }[];
}) => {
  return (
    <ResponsiveContainer width="100%" height="90%">
      <BarChart data={data} barSize={16}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          axisLine={false}
          tick={{ fill: "#d1d5db", fontSize: 11 }}
          tickLine={false}
          tickFormatter={(v) => `${Number(v) / 1000}k`}
          width={36}
        />
        <Tooltip
          formatter={(v) => `${Number(v).toLocaleString("vi-VN")}₫`}
          contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
        />
        <Legend
          align="left"
          verticalAlign="top"
          wrapperStyle={{ paddingTop: "10px", paddingBottom: "20px" }}
        />
        <Bar
          dataKey="center"
          name="Trung tâm"
          fill="#C3EBFA"
          legendType="circle"
          radius={[8, 8, 0, 0]}
        />
        <Bar
          dataKey="private"
          name="Gia sư"
          fill="#FAE27C"
          legendType="circle"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AttendanceChart;
