// Figma API types (simplified for our use case)

export interface FigmaFile {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  // Style properties (when applicable)
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  effects?: FigmaEffect[];
  // Text properties
  characters?: string;
  style?: FigmaTypeStyle;
  // Layout properties
  absoluteBoundingBox?: FigmaRectangle;
  constraints?: FigmaConstraints;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  documentationLinks?: string[];
}

export interface FigmaStyle {
  key: string;
  name: string;
  description: string;
  styleType: "FILL" | "TEXT" | "EFFECT" | "GRID";
}

export interface FigmaPaint {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  gradientStops?: FigmaGradientStop[];
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaGradientStop {
  position: number;
  color: FigmaColor;
}

export interface FigmaEffect {
  type: string;
  visible?: boolean;
  radius?: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
}

export interface FigmaTypeStyle {
  fontFamily: string;
  fontPostScriptName?: string;
  fontWeight: number;
  fontSize: number;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  letterSpacing?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
}

export interface FigmaRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaConstraints {
  vertical: string;
  horizontal: string;
}

// Design token extraction types
export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing?: SpacingToken[];
}

export interface ColorToken {
  name: string;
  value: string; // hex
  opacity?: number;
  styleKey?: string;
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight?: number;
  letterSpacing?: number;
  styleKey?: string;
}

export interface SpacingToken {
  name: string;
  value: number;
}

// Component summary for listing
export interface ComponentSummary {
  key: string;
  name: string;
  description: string;
  nodeId: string;
}

// Cached file with metadata
export interface CachedFigmaFile {
  file: FigmaFile;
  fetchedAt: string;
}
