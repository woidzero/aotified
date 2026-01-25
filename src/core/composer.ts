import { Logger } from "./logger";
import { Settings } from "./settings";

export class Feature implements TFeature {
  name!: string;
  description!: string;
  default = false;
  hidden = false;
  requires?: string[];
  cleanup?: CleanupFn;

  run!: (ctx: FeatureContext) => void | CleanupFn;
  toggle?: () => boolean;

  module!: Module;

  constructor(options?: Partial<Feature>) {
    if (options) Object.assign(this, options);

    // auto bind
    const proto = Object.getPrototypeOf(this);
    for (const key of Object.getOwnPropertyNames(proto)) {
      const val = (this as any)[key];
      if (typeof val === "function" && key !== "constructor") {
        (this as any)[key] = val.bind(this);
      }
    }
  }

  shouldRun(): boolean {
    if (this.toggle) return this.toggle();
    return this.default;
  }
}

export class Module<F extends TFeature = Feature> implements TModule<F> {
  name: string;
  description: string;
  features: F[] = [];
  shared: Record<string, any> = {};
  settings?: TSettings;

  constructor(
    options: { name: string; description: string },
    sharedInit?: SharedInitializer
  ) {
    this.name = options.name;
    this.description = options.description;

    if (sharedInit) sharedInit(this.shared);
  }

  loadFeatures(features: F[]) {
    this.features.push(...features);

    for (const feature of features) {
      feature.module = this;
      feature.shared = this.shared;
    }
  }
}

export class Composer<M extends TModule = Module> {
  modules: M[];
  settings: TSettings;

  constructor(modules: M[]) {
    this.modules = modules;
    this.settings = new Settings(modules);

    for (const module of this.modules) {
      module.settings = this.settings;
    }
  }

  start() {
    for (const module of this.modules) {
      this.startModule(module);
    }
  }

  private startModule(module: M) {
    const logger = new Logger(`Module:${module.name}`);

    for (const feature of module.features) {
      if (!feature.shouldRun?.()) {
        logger.log(`feature "${feature.name}" skipped by toggle/default`);
        continue;
      }

      try {
        const ctx: FeatureContext = {
          module: module,
          feature: feature,
          settings: this.settings,
          logger: new Logger(`aotified.${module.name}/${feature.name}`),
        };

        const cleanup = feature.run(ctx);
        if (typeof cleanup === "function") feature.cleanup = cleanup;
      } catch (err) {
        logger.error(`failed to start feature "${feature.name}"`, err);
      }
    }
  }

  disableFeature(moduleName: string, featureName: string) {
    const module = this.modules.find((m) => m.name === moduleName);
    const feature = module?.features.find((f) => f.name === featureName);
    if (!feature) return;

    feature.cleanup?.();
    feature.cleanup = undefined;
    this.settings.setEnabled(moduleName, featureName, false);
  }

  enableFeature(moduleName: string, featureName: string) {
    this.settings.setEnabled(moduleName, featureName, true);
    this.start();
  }
}
