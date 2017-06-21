class ComponentManager {
  constructor(service) {
    this.service = service;
    this.componentMap = {};
  }

  getComponent(packageName) {
    return new Promise((resolve, reject) => {
      if (this.componentMap[service]) {
        resolve(this.componentMap[service].data);
      } else {
        this.service.fetchComponent(packageName).then((response) => {
          this.componentMap[packageName] = {
            loaded: false,
            data: response
          };
          resolve(response);
        }).catch((err) => {
          reject(err);
        });
      }
    });
  }

  loadComponent(packageName) {

  }
}