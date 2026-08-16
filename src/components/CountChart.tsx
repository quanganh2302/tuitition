"use client";
import Image from "next/image";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

// Donut: tỉ lệ thu nhập tháng này giữa lớp Trung tâm (CENTER) vs Gia sư (PRIVATE).
const CountChart = ({ center, priv }: { center: number; priv: number }) => {
  const data = [
    { name: "Total", count: center + priv, fill: "white" },
    { name: "Gia sư", count: priv, fill: "#FAE27C" },
    { name: "Trung tâm", count: center, fill: "#C3EBFA" },
  ];
  return (
    <div className="relative w-full h-[75%]">
      <ResponsiveContainer>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="40%"
          outerRadius="100%"
          barSize={32}
          data={data}
        >
          <RadialBar background dataKey="count" />
        </RadialBarChart>
      </ResponsiveContainer>
      <Image
        src="/class.png"
        alt=""
        width={50}
        height={50}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
};

export default CountChart;
