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
      if (list && list.length) {
        for (let i = 0; i < list.length; i++) {
          list[i]._order = i;
        }
      }
      this.set("channels", list);
      console.log("channels: ", list);
    }).catch((err) => {
      console.error("Failed to load list of channels: ", err);
    });
  }

  getItemStyle(item) {
    return "order: " + item._order + ";";
  }

  onItemClick(event) {
    const data = event.model.item;
    $router.goto(['channel', data.providerId, data.channelAddress]);
  }

  onItemUpdate(event) {
    const itemAddress = event.model.item.channelAddress;
    let historyUpdate = false;
    for (let i = 0; i < this.channels.length; i++) {
      const c = this.channels[i];
      if (c.channelAddress === itemAddress) {
        c.lastUpdated = event.detail.timestamp;
        historyUpdate = event.detail.history;
        break;
      }
    }
    this.channels.sort((a, b) => {
      return b.lastUpdated - a.lastUpdated;
    });
    for (let i = 0; i < this.channels.length; i++) {
      const c = this.channels[i];
      if (c._order != i) {
        c._order = i;
        const cardView = this.shadowRoot.querySelector('channel-feed-item[data-address="' + c.channelAddress + '"]');
        if (cardView) {
          cardView.style = this.getItemStyle(c);
          if ((c.channelAddress === itemAddress) && (!historyUpdate)) {
            cardView.ripple();
          }
        }
      }
    }
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