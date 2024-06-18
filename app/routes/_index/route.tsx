import { CalciteScrim } from "@esri/calcite-components-react";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "City download portal" },
];

export default function Index() {
  return <CalciteScrim loading />;
}
