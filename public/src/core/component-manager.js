class ComponentManager {
  constructor(service) {
    this.service = service;
  }

  get(packageName, forceFetch) {
    return new Promise((resolve, reject) => {
      const doFetch = () => {
        this._fetchComponent(packageName).then((response) => {
          this.service.dbService.saveComponent(response).then(() => { });
          resolve(response);
        });
      };
      if (forceFetch) {
        doFetch();
        return;
      }
      this.service.dbService.open().then(() => {
        this.service.dbService.getComponent(null, packageName).then((response) => {
          if (response) {
            resolve(response);
          } else {
            doFetch();
          }
        });
      }).catch(() => {
        doFetch();
      });
    });
  }

  _fetchComponent(packageName) {
    return this.service.fetchComponent(packageName);
  }

  list() {
    return this.service.dbService.getAllComponents();
  }
}