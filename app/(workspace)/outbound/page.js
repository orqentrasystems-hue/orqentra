import { requireMenuPage } from "../requireMenuPage";

export const metadata = {
  title: "Outbound",
  description: "Outbound",
};

export const dynamic = "force-dynamic";

export default async function OutboundPage() {
  await requireMenuPage("outbound");

  return (
    <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
      Outbound
    </h1>
  );
}
