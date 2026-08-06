import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

// /works has no overview of its own — canvas is the section you land on. The
// locale-aware redirect keeps /de/works on /de/works/canvas.
export default async function WorksIndex({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: "/works/canvas", locale });
}
