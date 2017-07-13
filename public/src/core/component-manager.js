class ComponentManager {
  constructor(service) {
    this.service = service;
    this.loadedPackages = {};
    this.pendingPackages = {};
  }

  get(packageName, forceFetch) {
    return new Promise((resolve, reject) => {
      if (!this.loadedPackages[packageName]) {
        forceFetch = true;
      }
      if (forceFetch) {
        this._doFetch(packageName, resolve, reject);
        return;
      }
      this.service.dbService.open().then(() => {
        this.service.dbService.getComponent(null, packageName).then((response) => {
          if (response) {
            resolve(response);
          } else {
            this._doFetch(packageName, resolve, reject);
          }
        });
      }).catch(() => {
        this._doFetch(packageName, resolve, reject);
      });
    });
  }

  _doFetch(packageName, resolve, reject) {
    if (!this.pendingPackages[packageName]) {
      this.pendingPackages[packageName] = [];
    }
    const cb = { resolve: resolve, reject: reject };
    if (this.pendingPackages[packageName].length) {
      this.pendingPackages[packageName].push(cb);
    } else {
      this.pendingPackages[packageName].push(cb);
      this._fetchComponent(packageName).then((response) => {
        this.loadedPackages[packageName] = true;
        this.service.dbService.saveComponent(response).then(() => { });
        try {
          const list = this.pendingPackages[packageName] || [];
          for (const cb of list) {
            cb.resolve(response);
          }
        } finally {
          this.pendingPackages[packageName] = [];
        }
      }).catch((err) => {
        try {
          const list = this.pendingPackages[packageName] || [];
          for (const cb of list) {
            cb.reject(err);
          }
        } finally {
          this.pendingPackages[packageName] = [];
        }
      });
    }
  }

  _fetchComponent(packageName) {
    return this.service.fetchComponent(packageName);
  }

  list() {
    return this.service.dbService.getAllComponents();
  }
}