class HomePage extends Polymer.Element {
  static get is() { return 'home-page'; }

  onCreate() {
    Polymer.importHref(this.resolveUrl("../dialogs/create-channel-dlg.html"), () => {
      this.$.dlgCreate.show();
    });
  }

  onJoin() {
    this._join();
  }

  _join(code) {
    Polymer.importHref(this.resolveUrl("../dialogs/join-channel-dlg.html"), () => {
      this.$.dlgJoin.show(code);
    });
  }

  onActivate(route) {
    const hash = route.segments[0];
    if (hash) {
      switch (hash) {
        case "join": {
          const code = route.segments[1];
          if (code) {
            this._join(code);
          }
        }
        default:
          break;
      }
    }
  }
}

window.customElements.define(HomePage.is, HomePage);