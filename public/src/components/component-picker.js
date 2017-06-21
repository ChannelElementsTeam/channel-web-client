class ComponentPicker extends Polymer.Element {
  static get is() { return 'component-picker'; }
  static get properties() {
    return {
      items: {
        type: Array,
        value: () => {
          return [
            // { package: { name: "Package A", description: "This is where the description goes." } },
            // { package: { name: "Package B", description: "This is where the description goes." } },
            // { package: { name: "Package C", description: "This is where the description goes." } },
            // { package: { name: "Package D", description: "This is where the description goes." } }
          ]
        }
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    Polymer.RenderStatus.beforeNextRender(this, () => {
      this.reset();
    });
  }

  onInput() {
    const url = this.$.txtUrl.value.trim();
    this.$.btnImport.disabled = !(url);
  }

  onImport() {
    this.$.txtUrl.value = "";
    this.$.importPanel.style.display = "";
    this.onInput();
    setTimeout(() => {
      this.$.txtUrl.focus();
    }, 50);
  }

  reset() {
    this.$.txtUrl.value = "";
    this.$.importPanel.style.display = "none";
    this.onInput();
  }
}
window.customElements.define(ComponentPicker.is, ComponentPicker);