class HomePage extends Polymer.Element {
  static get is() { return 'home-page'; }

  onCreate() {
    $router.goto("new-channel")
  }

  onJoin() {
    $router.goto("join-channel");
  }
}

window.customElements.define(HomePage.is, HomePage);