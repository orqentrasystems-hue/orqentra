import { requireMenuPage } from "../requireMenuPage";

export const metadata = {
  title: "Virtual Location",
  description: "Virtual Location",
};

export const dynamic = "force-dynamic";

export default async function VirtualLocationPage() {
  await requireMenuPage("virtual-location");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
        Virtual Location
      </h1>
      <div className="h-0.5 w-12 bg-gold-600" aria-hidden="true" />
    </div>
  );
}
