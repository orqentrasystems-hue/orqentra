import { requireMenuPage } from "../requireMenuPage";
import TransportCompaniesGrid from "./TransportCompaniesGrid";

export const metadata = {
  title: "Transport Channels",
  description: "Transport Channels",
};

export const dynamic = "force-dynamic";

export default async function TransportChannelsPage() {
  await requireMenuPage("transport-channels");

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
          Transport Channels
        </h1>
        <div className="h-0.5 w-12 bg-gold-600" aria-hidden="true" />
      </div>
      <TransportCompaniesGrid />
    </div>
  );
}
