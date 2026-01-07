/* =========================
 * SETTINGS
 * ========================= */
export class Settings {
  schema: SettingsSchema = {};
  
  private key = "__userscript_settings__";
  private cache: SettingsSchema;

  constructor(modules: TModule[]) {
    this.cache = this.load();

    // init defaults
    for (const mod of modules) {
      if (!this.cache[mod.name]) {
        this.cache[mod.name] = {};
      }
      const moduleCache = this.cache[mod.name]!;
      for (const feature of mod.features) {
        if (!(feature.name in moduleCache)) {
          moduleCache[feature.name] = feature.default ?? false;
        }
      }
    }

    this.save();
  }

  private load(): SettingsSchema {
    try {
      return JSON.parse(localStorage.getItem(this.key) || "{}");
    } catch {
      return {};
    }
  }

  private save() {
    localStorage.setItem(this.key, JSON.stringify(this.cache));
  }

  isEnabled(module: string, feature: string): boolean {
    return !!this.cache[module]?.[feature];
  }

  setEnabled(module: string, feature: string, value: boolean) {
    this.cache[module] ??= {};
    this.cache[module][feature] = value;
    this.save();
  }

  toggle(module: string, feature: string) {
    this.setEnabled(module, feature, !this.isEnabled(module, feature));
  }

  getModule(module: string) {
    return this.cache[module] ?? {};
  }
}
