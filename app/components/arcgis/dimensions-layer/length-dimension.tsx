import CoreLengthDimension from "@arcgis/core/analysis/LengthDimension.js";
import { useDimensions } from "./dimensions-context";
import { memo, useEffect, useState } from "react";
import { Point } from "@arcgis/core/geometry";
import { useSceneView } from "../views/scene-view/scene-view-context";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";

interface LengthDimensionProps {
  startPoint: Point;
  endPoint: Point;
  measureType?: 'horizontal' | 'vertical' | 'direct'
  orientation?: number;
  offset?: number;
  onMeasurementResult?: (result?: __esri.Length) => void;
}

function InternalLengthDimension({
  startPoint,
  endPoint,
  measureType,
  orientation,
  offset,
  onMeasurementResult
}: LengthDimensionProps) {
  const view = useSceneView();
  const [measurement] = useState(() => new CoreLengthDimension({
    startPoint,
    endPoint,
    measureType,
    orientation,
    offset
  }));
  const { layer, analyses } = useDimensions();

  useEffect(() => {
    measurement.measureType = measureType ?? null!
  }, [measureType, measurement]);

  useEffect(() => {
    measurement.offset = offset ?? null!
  }, [measurement, offset]);

  useEffect(() => {
    measurement.startPoint = startPoint;
    measurement.endPoint = endPoint;

    view.whenAnalysisView(analyses)
      .then(av => onMeasurementResult?.(av.results.find(r => r.dimension === measurement)?.length))
      .catch(() => { });

    view.whenLayerView(layer)
      .then(lv => onMeasurementResult?.(lv.results.find(r => r.dimension === measurement)?.length))
      .catch(() => { });

  }, [startPoint, endPoint, measurement, view, layer, analyses, onMeasurementResult]);

  useEffect(() => {
    analyses.dimensions.push(measurement);
    return () => { analyses.dimensions.remove(measurement) };
  }, [analyses.dimensions, measurement]);

  return null;
}

const LengthDimension = memo(InternalLengthDimension, (prev, next) => {
  return (
    geometryEngine.equals(prev.endPoint, next.endPoint) &&
    geometryEngine.equals(prev.startPoint, next.startPoint) &&
    prev.offset === next.offset &&
    prev.measureType === next.measureType &&
    prev.orientation === next.orientation &&
    prev.onMeasurementResult === next.onMeasurementResult
  )
});

export default LengthDimension;