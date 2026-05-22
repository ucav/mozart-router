import { GatewayAdapter } from '../types';

// Plugin system for Mozart.
// Community members can publish npm packages named "mozart-router-adapter-*"
// and Mozart will auto-discover them at runtime.

export interface MozartPlugin {
  name: string;
  version: string;
  adapters: GatewayAdapter[];
  onRegister?: () => Promise<void>;
}

export class PluginRegistry {
  private plugins: Map<string, MozartPlugin> = new Map();

  register(plugin: MozartPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  get(name: string): MozartPlugin | undefined {
    return this.plugins.get(name);
  }

  list(): MozartPlugin[] {
    return Array.from(this.plugins.values());
  }

  getAllAdapters(): GatewayAdapter[] {
    const adapters: GatewayAdapter[] = [];
    for (const plugin of this.plugins.values()) {
      adapters.push(...plugin.adapters);
    }
    return adapters;
  }

  async loadFromDirectory(dirPath: string): Promise<number> {
    let loaded = 0;
    try {
      const fs = require('fs');
      const path = require('path');
      if (!fs.existsSync(dirPath)) return 0;

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pkgPath = path.join(dirPath, entry.name, 'package.json');
        if (!fs.existsSync(pkgPath)) continue;

        try {
          const mod = require(path.join(dirPath, entry.name));
          if (mod?.mozartPlugin) {
            const plugin = mod.mozartPlugin as MozartPlugin;
            this.register(plugin);
            if (plugin.onRegister) await plugin.onRegister();
            loaded++;
          }
        } catch {
          // skip modules that fail to load
        }
      }
    } catch {
      // directory doesn't exist or can't be read
    }
    return loaded;
  }

  // Scan node_modules for mozart-router-adapter-* packages
  async loadInstalledPlugins(): Promise<number> {
    let loaded = 0;
    try {
      const fs = require('fs');
      const path = require('path');

      const searchPaths = [
        path.join(process.cwd(), 'node_modules'),
      ];

      // Try to find the global node_modules
      try {
        const { execSync } = require('child_process');
        const globalPath = execSync('npm root -g', { encoding: 'utf-8' }).trim();
        if (globalPath) searchPaths.push(globalPath);
      } catch { /* ignore */ }

      for (const nodeModulesPath of searchPaths) {
        if (!fs.existsSync(nodeModulesPath)) continue;
        const entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (!entry.name.startsWith('mozart-router-adapter-')) continue;

          const pkgPath = path.join(nodeModulesPath, entry.name, 'package.json');
          if (!fs.existsSync(pkgPath)) continue;

          try {
            const mod = require(path.join(nodeModulesPath, entry.name));
            if (mod?.mozartPlugin) {
              const plugin = mod.mozartPlugin as MozartPlugin;
              this.register(plugin);
              if (plugin.onRegister) await plugin.onRegister();
              loaded++;
            }
          } catch {
            // skip broken plugins
          }
        }
      }
    } catch {
      // no plugins found
    }
    return loaded;
  }
}

// Default plugin registry singleton
export const pluginRegistry = new PluginRegistry();
