class ChannelPage extends Polymer.Element {
  static get is() { return 'channel-page'; }

  onDeactivate() {
    this.setBottomDrawer(false);
  }

  onComponents() {
    Polymer.importHref(this.resolveUrl("../components/component-picker.html"), () => {
      this.setBottomDrawer(true);
    });
  }

  onCancelDrawer() {
    this.setBottomDrawer(false);
  }

  setBottomDrawer(open) {
    if (open) {
      this.$.picker.reset();
      this.$.bottomDrawer.style.display = "";
      this.$.glassPane.style.display = "";
      setTimeout(() => {
        this.$.bottomDrawer.style.transform = "none";
        this.$.glassPane.style.background = "rgba(0, 0, 0, 0.2)";
      }, 100);
    } else {
      this.$.bottomDrawer.style.transform = "translateY(110%)";
      this.$.glassPane.style.background = "rgba(0, 0, 0, 0)";
      setTimeout(() => {
        this.$.bottomDrawer.style.display = "none";
        this.$.glassPane.style.display = "none";
      }, 500);
    }
  }
}
window.customElements.define(ChannelPage.is, ChannelPage);