import { requireMenuPage } from "../requireMenuPage";

export const metadata = {
  title: "Virtual Location",
  description: "Virtual Location",
};

export const dynamic = "force-dynamic";

export default async function VirtualLocationPage() {
  await requireMenuPage("virtual-location");

  return (
    <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
      Virtual Location
    </h1>
  );
}
