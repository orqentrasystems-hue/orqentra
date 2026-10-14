import { requireMenuPage } from "../requireMenuPage";

export const metadata = {
  title: "Cost Type",
  description: "Cost Type",
};

export const dynamic = "force-dynamic";

export default async function CostTypePage() {
  await requireMenuPage("cost-type");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
        Cost Type
      </h1>
      <div className="h-0.5 w-12 bg-gold-600" aria-hidden="true" />
    </div>
  );
}
