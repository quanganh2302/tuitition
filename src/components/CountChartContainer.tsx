import Image from "next/image";
import CountChart from "./CountChart";
import prisma from "@/lib/prisma";
import { getScope, orgWhere } from "@/lib/scope";
import { getTranslations } from "next-intl/server";

const CountChartContainer = async () => {
  const t = await getTranslations("Dashboard");
  const grouped = await prisma.class.groupBy({
    by: ["type"],
    _count: true,
    where: { ...orgWhere(getScope()) }, // chỉ lớp trong trung tâm của actor
  });
  const center = grouped.find((g) => g.type === "CENTER")?._count ?? 0;
  const priv = grouped.find((g) => g.type === "PRIVATE")?._count ?? 0;
  const total = center + priv;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">{t("class_types")}</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <CountChart center={center} priv={priv} />
      <div className="flex justify-center gap-16">
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-lucasSky rounded-full" />
          <h1 className="font-bold">{center}</h1>
          <h2 className="text-xs text-gray-300">{t("type_center_pct", { pct: pct(center) })}</h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-lucasYellow rounded-full" />
          <h1 className="font-bold">{priv}</h1>
          <h2 className="text-xs text-gray-300">{t("type_private_pct", { pct: pct(priv) })}</h2>
        </div>
      </div>
    </div>
  );
};

export default CountChartContainer;
