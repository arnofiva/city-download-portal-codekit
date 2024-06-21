import { CalciteButton } from "@esri/calcite-components-react";
import { Suspense, lazy } from "react";

const LazyDownloadButton = lazy(() => import('./internal-download-button'));

export default function DownloadButton() {
  return (
    <Suspense fallback={<CalciteButton width="full" disabled iconStart="download" scale="l">Export model</CalciteButton>}>
      <LazyDownloadButton />
    </Suspense>
  )
}