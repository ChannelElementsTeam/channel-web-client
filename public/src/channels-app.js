class ChannelsApp extends Polymer.Element {
  static get is() { return 'channels-app'; }

  static get properties() {
    return {
      barData: Object
    };
  }

  constructor() {
    super();
    this.lastActivePage = null;
    window.$app = this;
  }

  setBarData(data) {
    this.set("barData", data);
  }

  connectedCallback() {
    super.connectedCallback();
    window.$router = this.$.router;
    window.$channels = new ChannelsClient();

    window.addEventListener("resize", () => {
      this.needsLayout();
    });
    Polymer.RenderStatus.beforeNextRender(this, () => {
      this.refreshLayout();
    });

    Polymer.importHref(this.resolveUrl('channel/channel-list.html'));
  }

  onRouteChange(event) {
    const route = event.detail.route;
    let pageName = route.segments[0] || "home";

    // show the correct page. hide others
    const pages = this.shadowRoot.querySelectorAll(".page");
    if (pages) {
      for (let i = 0; i < pages.length; i++) {
        pages[i].style.display = "none";
      }
    }
    let activePage = this.shadowRoot.querySelector("." + pageName);
    if (!activePage) {
      activePage = this.$.home;
      pageName = "home";
    }
    activePage.style.display = "";

    // clear toolbar
    this.setBarData(null);

    // Notify prev page it's being hidden
    if (this.lastActivePage) {
      if (this.lastActivePage != activePage) {
        if (this.lastActivePage.onDeactivate) {
          this.lastActivePage.onDeactivate();
        }
      }
    }
    this.lastActivePage = activePage;

    // import page and activate it
    const pageHref = activePage.getAttribute("data-href");
    const pageCallback = () => {
      if (activePage.onActivate) {
        activePage.onActivate(route);
      }
    };
    if (pageHref) {
      Polymer.importHref(this.resolveUrl(pageHref), pageCallback);
    } else {
      pageCallback();
    }

    // scroll to the top after every page transition
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    this.closeMenu();
  }

  showMenu() {
    this.$.glass.style.display = "";
    this.$.leftDrawer.style.left = 0;
  }

  closeMenu() {
    this.$.glass.style.display = "none";
    this.$.leftDrawer.style.left = "";
  }

  needsLayout() {
    if (this.layoutPending) {
      return;
    }
    if (this.layoutDebouncing) {
      this.layoutPending = true;
      return;
    }
    this.refreshLayout();
    this.layoutDebouncing = true;
    setTimeout(() => {
      this.layoutDebouncing = false;
      if (this.layoutPending) {
        this.refreshLayout();
      }
      this.layoutPending = false;
    }, 600);
  }

  refreshLayout() {
    this.closeMenu();
  }

  onAction(event) {
    const callback = event.model.item.callback;
    if (callback) {
      callback();
    }
  }
}

window.customElements.define(ChannelsApp.is, ChannelsApp);