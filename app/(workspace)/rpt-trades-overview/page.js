import { requireMenuPage } from "../requireMenuPage";
import TradesOverviewPanel from "./TradesOverviewPanel";

export const metadata = {
  title: "Trades Overview",
  description: "Trades Overview",
};

export const dynamic = "force-dynamic";

export default async function RptTradesOverviewPage() {
  await requireMenuPage("rpt-trades-overview");

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
          Trades Overview
        </h1>
        <div className="h-0.5 w-12 bg-gold-600" aria-hidden="true" />
      </div>
      <TradesOverviewPanel />
    </div>
  );
}
