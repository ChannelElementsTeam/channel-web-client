class HomePage extends Polymer.Element {
  static get is() { return 'home-page'; }

  onCreate() {
    Polymer.importHref(this.resolveUrl("../dialogs/create-channel-dlg.html"), () => {
      this.$.dlgCreate.show();
    });
  }

  onJoin() {
    $router.goto("join-channel");
  }
}

window.customElements.define(HomePage.is, HomePage);