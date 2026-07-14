import type { LayoutTier } from '../layout/breakpoints';
import type { DiagramNodeRadii } from './diagramNodeGeometry';

export type DiagramPreserveAspectRatio = 'none' | 'xMidYMid meet' | 'xMidYMid slice';

export interface DiagramViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramContainerSize {
  width: number;
  height: number;
}

export interface SvgScaleAnalysis {
  sx: number;
  sy: number;
  contentWidth: number;
  contentHeight: number;
  unusedWidth: number;
  unusedHeight: number;
  fillRatioX: number;
  fillRatioY: number;
  stretchRatio: number;
}

export interface DiagramScreenMetrics {
  primaryNodeScreenRadius: number;
  groupNodeScreenRadius: number;
  stretchRatio: number;
  layoutScale: number;
}

export interface DiagramLayoutResolution {
  layoutTier: LayoutTier;
  isCompactDiagram: boolean;
  viewBox: DiagramViewBox;
  viewBoxString: string;
  preserveAspectRatio: DiagramPreserveAspectRatio;
  aspectRatioCorrection: number;
  nodeRadii: DiagramNodeRadii;
  scaleAnalysis: SvgScaleAnalysis;
  screenMetrics: DiagramScreenMetrics;
}
