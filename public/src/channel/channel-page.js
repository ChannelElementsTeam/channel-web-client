class ChannelPage extends Polymer.Element {
  static get is() { return 'channel-page'; }

  static get properties() {
    return {
      channelInfo: {
        type: Object,
        observer: 'refreshChannel'
      },
      joinData: {
        type: Object,
        observer: 'onChannelJoined'
      }
    }
  }

  onActivate(route) {
    this.onDeactivate();
    this.channelUrl = route.segments[1];
    this.registryUrl = route.segments[2];
    this.refresh(route.context);
  }

  onDeactivate() {
    this.setBottomDrawer(false);
  }

  refresh(info) {
    if (info) {
      this.set("channelInfo", info);
    } else {
      $channels.getChannel(this.registryUrl, this.channelUrl).then((response) => {
        this.set("channelInfo", response);
      });
    }
  }

  refreshChannel() {
    if (!this.channelInfo) {
      return;
    }
    this.enableComposeArea(false);

    // update the app toolbar
    const barActions = [{
      icon: "chnls:share",
      name: "Share channel",
      callback: () => {
        this.shareChannel();
      }
    }];
    if (this.channelInfo.isCreator) {
      barActions.push({
        icon: "chnls:delete",
        name: "Delete channel",
        callback: () => {
          this.deleteChannel();
        }
      });
    }
    $app.setBarData({
      title: this.channelInfo.details.name,
      actions: barActions
    });

    this.$.controller.detach();
    // connect socket and join channel
    console.log("Connecting to socket for channel: ", this.channelInfo.channelId);
    $channels.connectTransport(this.channelInfo.registerUrl, this.channelInfo.channelId, this.channelInfo.transportUrl).then(() => {
      $channels.joinChannel({ channelId: this.channelInfo.channelId }).then((joinResponse) => {
        console.log("Joined channel: ", joinResponse);
        this.set("joinData", joinResponse);
        this.enableComposeArea(true);
        this.loadLastComposer();
      });
    }).catch((err) => {
      console.error(err);
    });
  }

  onChannelJoined() {
    if (!this.channelInfo) {
      return;
    }
    // Attach controller
    this.$.controller.channelInfo = this.channelInfo;
    this.$.controller.joinData = this.joinData;
    this.$.controller.attach();

    // Clear view
    this.set("items", []);

    // load history
    console.log("Fetching history");
    $channels.getHistory({
      channelId: this.channelInfo.channelId,
      before: (new Date()).getTime(),
      maxCount: 100
    }).then((response) => {
      console.log("History: ", response);
    });
  }

  deleteChannel() {
    $channels.deleteChannel(this.channelInfo.registerUrl, this.channelInfo.channelUrl).then(() => { });
  }

  // Compose area support methods

  onComponents() {
    this.setBottomDrawer(true);
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
    console.log("Switched composer: ", pkg);
    this.clearElement(this.$.composerPanel);

    var e = document.createElement(pkg.channelComponent.composerTag);
    e.packageSource = pkg.source;
    e.mode = "compose";
    e.channel = this.$.controller;
    this.currentComposeElement = e;

    this.$.composerPanel.appendChild(e);
    this.$.noComposer.style.display = "none";
    this.$.composerPanel.style.display = "";

    $service.dbService.setLocal("last-compose-package", pkg.source);
  }

  loadLastComposer() {
    if (!this.currentComposeElement) {
      var packageSource = $service.dbService.getLocal("last-compose-package");
      if (packageSource) {
        this.$.picker.loadComponent(packageSource, false);
      }
    }
  }

  enableComposeArea(enabled) {
    if (enabled) {
      this.$.composeArea.style.opacity = 1;
      this.$.composeArea.style.pointerEvents = "auto";
    } else {
      this.$.composeArea.style.opacity = 0;
      this.$.composeArea.style.pointerEvents = "none";
    }
  }

  // handle events from controller

  onMessage(event) {
    var detail = event.detail;
    if (detail) {
      this.processMessage(detail, false);
    }
  }

  onHistoryMessage(event) {
    var detail = event.detail;
    if (detail) {
      this.processMessage(detail, true);
    }
  }

  onChannelDeleted() {
    $router.goto("");
  }

  processMessage(detail, history) {
    const channelMessage = detail.channelMessage;
    if (channelMessage.valid) {
      const msg = channelMessage.json;
      const msgDetails = msg.details;
      switch (msg.type) {
        case 'add-card': {
          $service.componentManager.get(msgDetails.package).then((pkg) => {
            Polymer.importHref(this.resolveUrl(pkg.importHref), () => {
              detail.package = pkg;
              this.insertMessage(msgDetails.cardId, detail, history);
            });
          }).catch((err) => {
            console.error("Failed to import component", err);
          });
          break;
        }
        case 'card-to-card':
          // find card item with the spciedif id
          const cardView = this.shadowRoot.querySelector('channel-card[@data-card="' + msgDetails.cardId + '"]');
          if (cardView) {
            cardView.handleCardToCardMessage(detail);
          } else {
            console.warn("Ignoring card-to-card message: Card with id '" + msgDetails.cardId + "' not found.");
          }
          break;
        default:
          break;
      }
    }
  }

  insertMessage(cardId, detail, atTop) {
    const itemData = {
      cardId: cardId,
      detail: detail,
      channel: this.$.controller
    }
    if (atTop) {
      this.unshift('items', itemData);
    } else {
      this.push('items', itemData);
    }
    // TODO: not efficient because shit renders list again when bound
  }
}
window.customElements.define(ChannelPage.is, ChannelPage);