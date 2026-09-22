import { requireMenuPage } from "../requireMenuPage";

export const metadata = {
  title: "Cost Type",
  description: "Cost Type",
};

export const dynamic = "force-dynamic";

export default async function CostTypePage() {
  await requireMenuPage("cost-type");

  return (
    <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
      Cost Type
    </h1>
  );
}
