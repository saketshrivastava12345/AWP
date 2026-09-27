import type { Metadata } from "next";
import {
  AdminPageHeader,
  Panel,
  TableFrame,
  TD,
  TH,
} from "@/components/admin/AdminChrome";
import { CsvImport } from "@/components/admin/CsvImport";
import { adminPage } from "@/lib/admin/page";

export const metadata: Metadata = { title: "Import prices" };

const COLUMNS: [string, string, string][] = [
  ["variant", "Required", "manufacturer/model/variant slugs, e.g. porsche/911/turbo-s"],
  [
    "market",
    "Required",
    "country[/state[/city]] slugs, e.g. india/maharashtra/mumbai or india",
  ],
  [
    "price_type",
    "Required",
    "manufacturer_list, dealer_list, ex_showroom, on_road or estimated_on_road",
  ],
  [
    "currency",
    "Optional",
    "ISO code; empty means the country's own currency. Never converted.",
  ],
  [
    "ex_showroom_price",
    "Listed types",
    "Required for manufacturer_list, dealer_list and ex_showroom",
  ],
  [
    "rto_tax, registration_fee, insurance_estimate, handling_charges, fastag, other_charges",
    "Optional",
    "Published on-road components, ≥ 0",
  ],
  [
    "on_road_price",
    "On-road types",
    "The total the source publishes; required for on_road and estimated_on_road, not allowed otherwise",
  ],
  ["effective_from", "Required", "YYYY-MM-DD, the date the price applies from"],
  ["effective_to", "Optional", "YYYY-MM-DD, empty while in force"],
  ["source", "Required", "Who published the figure"],
  ["source_url", "Required", "http(s) link to the page it came from"],
  ["last_verified_at", "Required", "YYYY-MM-DD, not in the future"],
  ["is_verified", "Optional", "true / false (default false)"],
  ["notes", "Optional", "Free text"],
];

export default async function PriceImportPage() {
  await adminPage();
  return (
    <>
      <AdminPageHeader
        title="Import prices"
        crumbs={[{ label: "Prices", href: "/admin/prices" }, { label: "CSV import" }]}
        description="Check a file first: every row is validated with the same rules as the price form and shown with its errors. Only valid rows are imported."
      />
      <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_28rem]">
        <CsvImport />
        <Panel title="Columns" bodyClassName="p-0 sm:p-0">
          <TableFrame
            label="CSV columns"
            maxHeight={false}
            className="rounded-none border-0"
          >
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Column
                  </th>
                  <th scope="col" className={TH}>
                    Rule
                  </th>
                </tr>
              </thead>
              <tbody>
                {COLUMNS.map(([name, need, rule]) => (
                  <tr key={name}>
                    <td className={`${TD} font-mono text-xs break-words`}>{name}</td>
                    <td className={`${TD} text-xs`}>
                      <span className="block text-ink-100">{need}</span>
                      <span className="text-ink-500">{rule}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
        </Panel>
      </div>
    </>
  );
}
