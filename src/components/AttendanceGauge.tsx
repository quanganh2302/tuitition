"use client";

import { PieChart, Pie } from "recharts";

// Kích thước cố định bằng px (không dùng ResponsiveContainer — % trong card siêu rộng dễ ra kích
// thước sai/không ổn định). cy = outerRadius nên cung chạm sát mép trên, không dư khoảng trắng.
const W = 220;
const OUTER_R = 82;
const INNER_R = 50;
const CY = OUTER_R; // cung sát mép trên hộp
const H = OUTER_R + 44; // + chỗ cho chữ %/tên bên dưới tâm cung

// Nửa vòng tròn % chuyên cần — theo tinh thần Performance.tsx (demo): cung dày, gọn.
const AttendanceGauge = ({
  present,
  total,
  centerLabel,
  presentLabel,
  absentLabel,
}: {
  present: number;
  total: number;
  centerLabel?: string;
  presentLabel: string;
  absentLabel: string;
}) => {
  const absent = total - present;
  const rate = total > 0 ? Math.round((present / total) * 100) : null;

  return (
    <div className="flex flex-col items-center mt-3">
      <div className="relative" style={{ width: W, height: H }}>
        <PieChart width={W} height={H}>
          <Pie
            dataKey="count"
            startAngle={180}
            endAngle={0}
            cx={W / 2}
            cy={CY}
            innerRadius={INNER_R}
            outerRadius={OUTER_R}
            stroke="none"
            data={[
              { name: "present", count: present, fill: "#C3EBFA" },
              { name: "absent", count: absent, fill: "#FAE27C" },
            ]}
          />
        </PieChart>
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ top: CY }}
        >
          <p className="text-2xl font-bold">{rate === null ? "—" : `${rate}%`}</p>
          {centerLabel && <p className="text-xs text-gray-400">{centerLabel}</p>}
        </div>
      </div>
      <p className="text-sm text-gray-400 -mt-2">
        {present} {presentLabel} · {absent} {absentLabel}
      </p>
    </div>
  );
};

export default AttendanceGauge;
