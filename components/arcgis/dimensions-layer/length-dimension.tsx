import CoreLengthDimension from "@arcgis/core/analysis/LengthDimension.js";
import { useDimensions } from "./dimensions-context";
import { useEffect, useState } from "react";
import { Point } from "@arcgis/core/geometry";

interface LengthDimensionProps {
  startPoint: Point;
  endPoint: Point;
  measureType?: 'horizontal' | 'vertical' | 'direct'
  orientation?: number;
  offset?: number;
}
export default function LengthDimension({
  startPoint,
  endPoint,
  measureType,
  orientation,
  offset
}: LengthDimensionProps) {
  const [measurement] = useState(() => new CoreLengthDimension({
    startPoint,
    endPoint,
    measureType,
    orientation,
    offset
  }));
  const { analyses } = useDimensions();

  useEffect(() => {
    measurement.offset = offset ?? null!
  }, [measurement, offset]);

  useEffect(() => {
    measurement.startPoint = startPoint;
    measurement.endPoint = endPoint;
  }, [startPoint, endPoint, measurement])

  useEffect(() => {
    analyses.dimensions.push(measurement);
    return () => { analyses.dimensions.remove(measurement) };
  }, [analyses.dimensions, measurement]);

  return null;
}