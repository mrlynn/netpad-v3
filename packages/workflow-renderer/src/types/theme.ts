/**
 * Theme types for @netpad/workflow-renderer
 */

/**
 * Complete theme definition
 */
export interface RendererTheme {
  /** Theme name for identification */
  name: string;

  /** Canvas styling */
  canvas: {
    background: string;
    backgroundPattern: string;
  };

  /** Node styling */
  node: {
    background: string;
    border: string;
    borderRadius: number;
    text: string;
    textSecondary: string;
    shadow: string;
  };

  /** Category colors for node headers */
  nodeCategories: {
    trigger: string;
    logic: string;
    data: string;
    action: string;
    ai: string;
    utility: string;
  };

  /** Edge styling */
  edge: {
    default: string;
    selected: string;
    animated: string;
    error: string;
    label: string;
    labelBackground: string;
  };

  /** Control panel styling */
  controls: {
    background: string;
    border: string;
    icon: string;
    iconHover: string;
  };

  /** Minimap styling */
  minimap: {
    background: string;
    mask: string;
    node: string;
  };

  /** Status indicator colors */
  status: {
    idle: string;
    running: string;
    success: string;
    error: string;
  };
}

/**
 * Partial theme for customization
 */
export type PartialTheme = {
  [K in keyof RendererTheme]?: RendererTheme[K] extends object
    ? Partial<RendererTheme[K]>
    : RendererTheme[K];
};
