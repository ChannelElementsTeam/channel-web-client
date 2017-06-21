class ComponentPicker extends Polymer.Element {
  static get is() { return 'component-picker'; }
  static get properties() {
    return {
      items: Array
    };
  }

  refresh() {
    this.reset();
    $service.componentManager.list().then((response) => {
      this.set("items", response);
    });
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
    this.$.loadingPanel.style.display = "none";
    this.onInput();
    setTimeout(() => {
      this.$.txtUrl.focus();
    }, 50);
  }

  reset() {
    this.$.txtUrl.value = "";
    this.$.importPanel.style.display = "none";
    this.$.loadingPanel.style.display = "none";
    this.onInput();
  }

  onSubmit() {
    const url = this.$.txtUrl.value.trim();
    if (url) {
      this.loadComponent(url);
    }
  }

  onItemClick(event) {
    const newEvent = new CustomEvent('select', { bubbles: true, composed: true, detail: event.model.item });
    this.dispatchEvent(newEvent);
  }

  loadComponent(url) {
    this.$.importPanel.style.display = "none";
    this.$.loadingPanel.style.display = "";
    $service.componentManager.get(url, true).then((result) => {
      console.log("Loaded component: ", result);
      const event = new CustomEvent('select', { bubbles: true, composed: true, detail: result });
      this.dispatchEvent(event);
    }).catch((err) => {
      console.error("Failed to import component", err);
      this.reset();
    });
  }
}
window.customElements.define(ComponentPicker.is, ComponentPicker);