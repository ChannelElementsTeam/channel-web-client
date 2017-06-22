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
      this.$.picker.refresh();
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

  onComposerSelected(event) {
    this.setBottomDrawer(false);
    var pkg = event.detail;
    if (pkg && pkg.importHref) {
      Polymer.importHref(this.resolveUrl(pkg.importHref), () => {
        this.switchToComposer(pkg);
      });
    }
  }

  clearElement(node) {
    while (node.hasChildNodes()) {
      node.removeChild(node.lastChild);
    }
  }

  switchToComposer(pkg) {
    console.log("switched", pkg);
    this.clearElement(this.$.composerPanel);
    var e = document.createElement(pkg.channelComponent.composerTag);
    this.$.composerPanel.appendChild(e);
    this.$.noComposer.style.display = "none";
    this.$.composerPanel.style.display = "";
  }
}
window.customElements.define(ChannelPage.is, ChannelPage);