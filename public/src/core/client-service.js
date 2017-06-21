class RestService {
  getJson(url) {
    return this.get(url, true);
  }

  getText(url) {
    return this.get(url, false);
  }

  get(url, asObject) {
    const jsonify = asObject ? true : false;
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.withCredentials = true;
      request.open("GET", url);
      request.onload = () => {
        const status = request.status;
        if (status === 0 || status >= 400) {
          if (request.responseText) {
            this.onError(reject, status, request.responseText);
          } else {
            this.onError(reject, status, 'Request failed with code: ' + status);
          }
        } else {
          if (jsonify && request.responseText) {
            resolve(JSON.parse(request.responseText));
          } else {
            resolve(request.responseText);
          }
        }
      };
      request.onerror = (err) => {
        this.onError(reject, 0, "There was a network error: " + err);
      };
      request.send();
    });
  }

  post(url, object) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.withCredentials = true;
      request.open("POST", url);
      request.setRequestHeader("Content-Type", 'application/json');
      request.onload = () => {
        const status = request.status;
        if (status === 0 || status >= 400) {
          if (request.responseText) {
            this.onError(reject, status, request.responseText);
          } else {
            this.onError(reject, status, 'Request failed with code: ' + status);
          }
        } else {
          if (request.responseText) {
            resolve(JSON.parse(request.responseText));
          } else {
            resolve(null);
          }
        }
      };
      request.onerror = (err) => {
        this.onError(reject, 0, "There was a network error: " + err);
      };
      if (object) {
        request.send(JSON.stringify(object));
      } else {
        request.send();
      }
    });
  }

  onError(reject, code, message) {
    const e = new Error(message);
    e.code = code;
    reject(e);
  }
}

class ClientService {
  constructor() {
    super();
    this.rest = new RestService();
    this.restBase = document.getElementById('restBase').getAttribute('href') || "";
    this.componentManager = new ComponentManager(this);
  }

  fetchComponent(packageName) {
    const request = { package: packageName };
    return this.rest.post(this.restBase + "/component", request);
  }
}
