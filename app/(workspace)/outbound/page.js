import { requireMenuPage } from "../requireMenuPage";

export const metadata = {
  title: "Outbound",
  description: "Outbound",
};

export const dynamic = "force-dynamic";

export default async function OutboundPage() {
  await requireMenuPage("outbound");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
        Outbound
      </h1>
      <div className="h-0.5 w-12 bg-gold-600" aria-hidden="true" />
    </div>
  );
}
