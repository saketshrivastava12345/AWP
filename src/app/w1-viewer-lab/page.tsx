// TEMPORARY W1 test harness — renders the 3D viewer outside the detail page
// while that page is being recomposed. Deleted before W1 reports.
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Car3DViewer, type Car3DViewerModel } from "@/components/3d/Car3DViewer";
import { CarShowcase } from "@/components/3d/CarShowcase";
import { getVariantDetail } from "@/lib/queries/cars";
import { listPartCategories } from "@/lib/queries/parts";
import { carBuildFromDetail } from "@/lib/car-build";
import { buildAnatomyTour } from "@/lib/anatomy-tour";
import { formatEnumLabel, formatNumber } from "@/lib/format";
import type { Part, ViewerGroup } from "@/types/domain";

type Search = Promise<Record<string, string | string[] | undefined>>;

async function Lab({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const car = typeof params.car === "string" ? params.car : "porsche/911/gt3";
  const [manufacturer = "", model = "", variant = ""] = car.split("/");
  const detail = await getVariantDetail(manufacturer, model, variant);
  if (!detail) notFound();
  const partCategories = await listPartCategories();

  const partsByGroup: Partial<Record<ViewerGroup, Part[]>> = {};
  const partDetails: Record<string, string> = {};
  for (const { part, detail: note } of detail.parts) {
    if (note) partDetails[part.slug] = note;
    if (!part.viewer_group) continue;
    (partsByGroup[part.viewer_group] ??= []).push(part);
  }
  const groupNotes: Partial<Record<ViewerGroup, string>> = {};
  if (detail.engine) {
    groupNotes.engine = [
      detail.engine.configuration,
      detail.engine.displacement_cc ? `${formatNumber(detail.engine.displacement_cc)} cc` : null,
      formatEnumLabel(detail.engine.aspiration, ""),
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (detail.ev) {
    groupNotes.battery = [
      detail.ev.battery_kwh ? `${detail.ev.battery_kwh} kWh` : null,
      detail.ev.motor_count ? `${detail.ev.motor_count} motors` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (detail.transmission) {
    groupNotes.transmission = [
      detail.transmission.name,
      detail.transmission.gears ? `${detail.transmission.gears} gears` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const build = carBuildFromDetail(detail);
  const allParts = partCategories.flatMap((category) => category.parts);
  const tour = buildAnatomyTour(detail, allParts);
  const p = detail.performance;
  const hud = [
    p?.power_hp ? { label: "Power", value: `${formatNumber(p.power_hp)} hp` } : null,
    p?.torque_nm ? { label: "Torque", value: `${formatNumber(p.torque_nm)} Nm` } : null,
    p?.zero_to_100_s ? { label: "0–100", value: `${p.zero_to_100_s.toFixed(1)} s` } : null,
    p?.top_speed_kmh ? { label: "Top speed", value: `${formatNumber(p.top_speed_kmh)} km/h` } : null,
  ].filter((entry): entry is { label: string; value: string } => entry !== null);
  const glb = typeof params.glb === "string" ? params.glb : null;
  const modelProp: Car3DViewerModel | null = glb
    ? {
        url: glb,
        isExact: params.exact === "1",
        format: "glb",
        compression: typeof params.compression === "string" ? params.compression.split(",") : [],
        credit: "LOCAL TEST MODEL",
        license: "CC0 (test)",
        author: "W1 harness",
        sourceUrl: "https://example.com/test",
        posterUrl: null,
      }
    : null;
  const title = `${detail.manufacturer.name} ${detail.model.name} ${detail.variant.name}`;

  return (
    <>
      {params.tour === "1" ? (
        <CarShowcase build={build} stops={tour} label={title} intro={<h1 className="font-display text-3xl">{title}</h1>} />
      ) : (
        <Container className="pt-24">
          <h1 className="font-display text-xl">{title}</h1>
        </Container>
      )}
      <Container className="py-10">
        <nav className="mb-4 flex gap-4 text-xs" data-lab-nav="">
          {["porsche/911/gt3", "tesla/model-s/plaid", "ferrari/296-gtb/296-gtb"].map((slug) => (
            <Link key={slug} href={`/w1-viewer-lab?car=${slug}${params.tour === "1" ? "&tour=1" : ""}`}>
              {slug}
            </Link>
          ))}
        </nav>
        <section id="explore-3d">
          <Car3DViewer
            build={build}
            title={title}
            model={modelProp}
            partsByGroup={partsByGroup}
            partDetails={partDetails}
            groupNotes={groupNotes}
            hud={hud}
            dimensions={detail.dimensions}
            colors={detail.colors}
            carbonCeramic={detail.parts.some(({ part }) => part.slug === "carbon-ceramic-disc")}
            initialInspect={
              typeof params.inspect === "string" ? (params.inspect as ViewerGroup) : null
            }
          />
        </section>
        <div style={{ height: params.tall === "1" ? "400vh" : "20vh" }} />
      </Container>
    </>
  );
}

export default function ViewerLab({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<p className="p-24">Loading lab…</p>}>
      <Lab searchParams={searchParams} />
    </Suspense>
  );
}
