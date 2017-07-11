const bower = require('bower');

export class BowerHelper {
  private shadowComponentsDirectory: string;

  constructor(shadowComponentsDirectory: string) {
    this.shadowComponentsDirectory = shadowComponentsDirectory;
  }

  async install(pkg: string): Promise<any> {
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
              void this.info(pkgInfo.resolver.source).then((meta) => {
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
    return new Promise<void>((resolve, reject) => {
      bower.commands.info(pkg)
        .on('end', (data: any) => {
          console.log("Package info: ", data);
          resolve(data.latest);
        }).on('error', (err: any) => {
          reject(new Error("Error while loading component: " + err.toString()));
        });
    });
  }

  async uninstallComponent(pkgInfo: any): Promise<void> {
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
