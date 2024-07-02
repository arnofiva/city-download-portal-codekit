import CoreLengthDimension from "@arcgis/core/analysis/LengthDimension.js";
import { useDimensions } from "./dimensions-context";
import { memo, useEffect } from "react";
import { Point } from "@arcgis/core/geometry";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import useInstance from "~/hooks/useInstance";

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
}: LengthDimensionProps) {
  const measurement = useInstance(() => new CoreLengthDimension({
    startPoint,
    endPoint,
    measureType,
    orientation,
    offset
  }));
  const { analyses } = useDimensions();

  useEffect(() => {
    measurement.measureType = measureType ?? null!
  }, [measureType, measurement]);

  useEffect(() => {
    measurement.offset = offset ?? null!
  }, [measurement, offset]);

  useEffect(() => {
    measurement.startPoint = startPoint;
    measurement.endPoint = endPoint;
  }, [endPoint, measurement, startPoint]);

  useEffect(() => {
    analyses.dimensions.add(measurement);
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