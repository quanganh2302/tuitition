"use client";

import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Doanh thu (Σ học phí có mặt) vs Lương (Σ giá trị buổi TAUGHT) theo tháng trong năm.
const FinanceChart = ({
  data,
  periodLabel,
  nav,
  showSalary = true,
}: {
  data: { name: string; revenue: number; salary: number }[];
  periodLabel?: string;
  nav?: React.ReactNode;
  showSalary?: boolean;
}) => {
  const t = useTranslations("Dashboard");
  return (
    <div className="bg-white rounded-xl w-full h-full p-4 transition-opacity has-[[aria-busy=true]]:opacity-60">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold">{t("finance_title")}</h1>
          {periodLabel && <span className="text-xs text-gray-400">{periodLabel}</span>}
        </div>
        {nav}
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickMargin={10}
            tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(1)}tr`}
          />
          <Tooltip
            formatter={(v) => `${Number(v).toLocaleString("vi-VN")}₫`}
            contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
          />
          <Legend
            align="center"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "10px", paddingBottom: "30px" }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name={t("revenue")}
            stroke="#C3EBFA"
            strokeWidth={4}
          />
          {showSalary && (
            <Line
              type="monotone"
              dataKey="salary"
              name={t("salary")}
              stroke="#CFCEFF"
              strokeWidth={4}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinanceChart;
