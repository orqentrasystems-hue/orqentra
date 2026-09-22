import { requireMenuPage } from "../requireMenuPage";

export const metadata = {
  title: "Inbound",
  description: "Inbound",
};

export const dynamic = "force-dynamic";

export default async function InboundPage() {
  await requireMenuPage("inbound");

  return (
    <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
      Inbound
    </h1>
  );
}
