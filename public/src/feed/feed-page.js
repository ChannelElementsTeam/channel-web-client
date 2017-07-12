class FeedPage extends Polymer.Element {
  static get is() { return 'feed-page' }
  static get properties() {
    return {
      channels: Array
    }
  }

  onActivate() {
    const barActions = [
      {
        icon: "chnls:add",
        name: "New channel",
        callback: () => { this.onCreate(); }
      },
      {
        icon: "chnls:share",
        name: "join a channel",
        callback: () => { this.join(); }
      }
    ];
    $app.setBarData({
      title: "Channels",
      actions: barActions
    });

    this.refreshChannels();
  }

  onDeactivate() {
    this.set("channels", []);
  }

  refreshChannels() {
    this.set("channels", []);
    $channels.listAllChannels($service.identityManager.signedAddress).then((list) => {
      this.set("channels", list);
      console.log("channels: ", list);
    }).catch((err) => {
      console.error("Failed to load list of channels: ", err);
    });
  }

  onItemClick(event) {
    const data = event.model.item;
    $router.goto(['channel', data.providerId, data.channelAddress]);
  }

  onCreate() {
    Polymer.importHref(this.resolveUrl("../dialogs/create-channel-dlg.html"), () => {
      this.$.dlgCreate.show();
    });
  }

  join() {
    this._join();
  }

  _join(code) {
    Polymer.importHref(this.resolveUrl("../dialogs/join-channel-dlg.html"), () => {
      this.$.dlgJoin.show(code);
    });
  }
}
window.customElements.define(FeedPage.is, FeedPage);