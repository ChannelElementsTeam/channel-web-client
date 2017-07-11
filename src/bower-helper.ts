import { db } from "./db";
import { Utils } from "./utils";
import { configuration } from "./configuration";
import * as LRU from 'lru-cache';

const bower = require('bower');

interface PackageEntry {
  installed: boolean;
  at: number;
  pkgInfo: any;
}

interface InfoEntry {
  fetched: number;
  info: any;
}

export class BowerHelper {
  private shadowComponentsDirectory: string;
  private packageCache = LRU<PackageEntry>({ max: 1000, maxAge: 1000 * 60 * 15 });
  private infoCache = LRU<InfoEntry>({ max: 1000, maxAge: 1000 * 60 * 60 });

  constructor(shadowComponentsDirectory: string) {
    this.shadowComponentsDirectory = shadowComponentsDirectory;
  }

  async install(pkg: string): Promise<any> {
    const cached = this.packageCache.get(pkg);
    if (cached && cached.installed) {
      return cached.pkgInfo;
    }
    await this.lockBower("Installing " + pkg);
    try {
      const pkgInfo = await this.installInternal(pkg);
      this.packageCache.set(pkg, { installed: true, at: Date.now(), pkgInfo: pkgInfo });
      return pkgInfo;
    } finally {
      await this.unlockBower();
    }
  }

  private async lockBower(description: string): Promise<void> {
    let count = 0;
    const serverId = configuration.get('serverId');
    let bowerManagement = await db.findBowerManagement('main');
    while (true) {
      if (count++ > 100) {
        throw new Error("Timeout waiting for bower lock to become available");
      }
      if (bowerManagement && bowerManagement.status === 'busy') {
        if (Date.now() - bowerManagement.timestamp > 1000 * 90) {
          console.warn("BowerHelper: encountered stale bower lock.  Forcing.", description);
          await db.upsertBowerManagement('main', serverId, 'busy', Date.now());
          break;
        }
        console.log("BowerHelper: waiting while another process is busy", description);
        await Utils.sleep(1000);
      } else {
        if (await db.upsertBowerManagement('main', serverId, 'busy', Date.now(), bowerManagement ? bowerManagement.status : null, bowerManagement ? bowerManagement.timestamp : null)) {
          break;
        } else {
          console.warn("BowerHelper: collision trying to get lock. Waiting then trying again", description);
          await Utils.sleep(1000);
        }
      }
      bowerManagement = await db.findBowerManagement('main');
    }
    console.log("BowerHelper: Lock acquired", description);
  }

  private async unlockBower(): Promise<void> {
    await db.upsertBowerManagement('main', configuration.get('serverId'), 'available', Date.now());
    console.log("BowerHelper: Lock released");
  }

  private async installInternal(pkg: string): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      let pkgInfo: any;
      console.log("Bower.install " + pkg + "...");
      bower.commands
        .install([pkg], { production: true, json: true }, { directory: this.shadowComponentsDirectory })
        .on('end', (installed: any) => {
          if (pkgInfo && pkgInfo.pkgMeta && pkgInfo.pkgMeta.name && pkgInfo.pkgMeta.main) {
            resolve(pkgInfo);
          } else {
            if (pkgInfo && pkgInfo.endpoint && pkgInfo.resolver) {
              void this.infoInternal(pkgInfo.resolver.source).then((meta) => {
                if (meta) {
                  pkgInfo.pkgMeta = meta;
                  resolve(pkgInfo);
                } else {
                  reject(new Error("Component does not appear to be correct.  pkgMeta is missing or incomplete (require at least name and main)."));
                }
                resolve();
              }).catch((err) => {
                reject(err);
              });
            } else {
              reject(new Error("Component does not appear to be correct.  pkgMeta is missing or incomplete (require at least name and main)."));
            }
          }
        })
        .on('error', (err: any) => {
          reject(new Error("Error while loading component: " + err.toString()));
        })
        .on('log', (log: any) => {
          if (log.data && log.data.endpoint && log.data.endpoint.source === pkg.split('#')[0]) {
            pkgInfo = log.data;
          }
          console.log("Bower logging:", log);
        });
    });
  }

  async info(pkg: string): Promise<any> {
    const cached = this.infoCache.get(pkg);
    if (cached) {
      return cached.info;
    }
    await this.lockBower("Getting info on " + pkg);
    try {
      const result = await this.infoInternal(pkg);
    } finally {
      await this.unlockBower();
    }
  }

  private async infoInternal(pkg: string): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      bower.commands.info(pkg)
        .on('end', (data: any) => {
          console.log("Package info: ", data);
          this.infoCache.set(pkg, { fetched: Date.now(), info: data.latest });
          resolve(data.latest);
        }).on('error', (err: any) => {
          reject(new Error("Error while loading component: " + err.toString()));
        });
    });
  }

  async uninstallComponent(pkgInfo: any): Promise<void> {
    await this.lockBower("Uninstalling " + JSON.stringify(pkgInfo));
    try {
      await this.uninstallComponentInternal(pkgInfo);
      this.packageCache.reset();
      this.infoCache.reset();
    } finally {
      await this.unlockBower();
    }
  }

  private async uninstallComponentInternal(pkgInfo: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      bower.commands
        .uninstall([pkgInfo.pkgMeta.name], { json: true }, { directory: this.shadowComponentsDirectory })
        .on('end', (installed: any) => {
          console.error("Uninstalled component", pkgInfo);
          resolve();
        })
        .on('error', (err: any) => {
          console.error("Failure trying to uninstall a component", pkgInfo);
          resolve();
        })
        .on('log', (log: any) => {
          console.log("Bower logging while uninstalling:", log);
        });
    });
  }
}
