type CleanupFn = () => void;

type SharedInitializer = (shared: Record<string, any>) => void;

type ObserveOptions = {
  once?: boolean;
  root?: ParentNode | JQuery;
  idle?: boolean;
  intersection?: boolean;
  intersectionOptions?: IntersectionObserverInit;
};

interface TLogger {
  scope: string;
  clear?: boolean;
  style?: string;

  log(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

interface FeatureOptions {
  name: string;
  description: string;
  default?: boolean;
  hidden?: boolean;
  trigger?: () => boolean;
}

interface FeatureContext {
  module: TModule;
  feature: TFeature;
  settings: TSettings;
  logger: TLogger;
}

interface TFeature {
  name: string;
  description: string;
  default?: boolean;
  hidden?: boolean;
  requires?: string[];
  cleanup?: CleanupFn;
  shared?: Record<string, any>;
  module?: TModule;

  /**
   * main run function
   */
  run: (ctx: FeatureContext) => void | CleanupFn;

  /**
   * run feature on trigger
   */
  trigger?: () => boolean;

  /**
   * checker function to run if trigger is true or default is true
   */
  shouldRun?(): boolean;
}

interface ModuleOptions<F extends TFeature = TFeature> {
  name: string;
  description: string;
  features: F[];
}

interface TModule<F extends TFeature = TFeature> {
  name: string;
  description: string;
  features: F[];
  shared: Record<string, any>;
  settings?: TSettings;
}

interface SettingsSchema {
  [moduleName: string]: {
    [featureName: string]: boolean;
  };
}

interface TSettings {
  schema: SettingsSchema;

  isEnabled(moduleName: string, featureName: string): boolean;
  setEnabled(moduleName: string, featureName: string, enabled: boolean): void;
}

interface TComposer<M extends TModule = TModule> {
  modules: M[];
  settings: TSettings;

  start(): void;
  enableFeature(moduleName: string, featureName: string): void;
  disableFeature(moduleName: string, featureName: string): void;
}


/**
 * Overlay
 */
type OverlayContent = string | HTMLElement | JQuery<HTMLElement>;

interface OverlayProps {
  id: string;

  heading: {
    label: string;
    icon?: string;
  };

  content: OverlayContent;
}

/**
 * SubHeadline
 */
interface SectionHeadingProps {
  text: string;
}