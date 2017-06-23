class HomePage extends Polymer.Element {
  static get is() { return 'home-page'; }

  onCreate() {
    Polymer.importHref(this.resolveUrl("../dialogs/create-channel-dlg.html"), () => {
      this.$.dlgCreate.show();
    });
  }

  onJoin() {
    Polymer.importHref(this.resolveUrl("../dialogs/join-channel-dlg.html"), () => {
      this.$.dlgJoin.show();
    });
  }
}

window.customElements.define(HomePage.is, HomePage);