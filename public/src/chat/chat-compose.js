class ChatCompose extends Polymer.Element {
  static get is() { return 'chat-compose'; }

  connectedCallback() {
    super.connectedCallback();
    Polymer.RenderStatus.beforeNextRender(this, () => {
      this.onInput();
    });
  }

  onInput() {
    const text = this.$.txt.value.trim();
    this.$.btnSend.disabled = !(text);
  }

  onKeydown(event) {
    if (event.keyCode === 13) {
      setTimeout(() => {
        this.onSend();
      }, 50);
    }
  }

  clear() {
    this.$.txt.value = "";
    this.onInput();
  }

  onSend() {
    const text = this.$.txt.value.trim();
    if (text) {
      var detail = {
        message: { text: text },
        history: true,
        priority: false
      };
      const event = new CustomEvent('compose', {bubbles: true, composed: true, detail: detail});
      this.dispatchEvent(event);
    }
  }
}

window.customElements.define(ChatCompose.is, ChatCompose);