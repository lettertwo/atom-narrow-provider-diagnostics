const pkg = require('../package.json');
const {parseUpdate} = require('./utils');
const {requireFrom} = require('./utils');

const ProviderBase = requireFrom('narrow', 'lib/provider/provider-base');

module.exports = function createDiagnosticsProvider(service) {
  class Diagnostics extends ProviderBase {
    constructor(...args) {
      super(...args);
      this.showFileHeader = true;
      this.showLineHeader = true;
      this.showColumnOnLineHeader = true;
      this.supportReopen = true;
      this.supportCacheItems = true;
      this.itemHaveRange = true;

      // Internal state for converting diagnostics updates to narrow updates.
      // See comments in `scheduleRefreshIfNecessary()` for more.
      this.refreshPending = null;
      this.cachedItems = null;
    }

    finishUpdateItems(items) {
      if (this.refreshPending) {
        this.updateItems([]);
      } else if (this.refreshPending === false) {
        this.refreshPending = null;
        super.finishUpdateItems(items);
      }
    }

    scheduleRefreshIfNecessary() {
      if (this.refreshPending !== null) return;
      this.refreshPending = true;
      // HACK: We convert our push updates from the diagnostics provider
      // to pull updates from the narrow provider by manually refreshing
      // narrow whenever we see data from diagnostics, but aren't
      // already refreshing for narrow.
      this.ui.refresh({force: true});
    }

    cacheItems(items) {
      this.cachedItems = items;
    }

    getItems() {
      // Narrow asked us to get items, so no need to manually refresh.
      this.refreshPending = false;

      if (!this.messageUpdateSubscription) {
        // If this is our first time getting items, set up
        // a subscription to diagnostics message updates.
        this.messageUpdateSubscription = service.allMessageUpdates
          .map(updates => updates.map(parseUpdate))
          .do(this.cacheItems.bind(this))
          .do(this.scheduleRefreshIfNecessary.bind(this))
          .subscribe(this.finishUpdateItems.bind(this));
      } else {
        // If we're already subscribed to updates,
        // update with the last value from the subscription.
        this.finishUpdateItems(this.cachedItems);
      }
    }

    destroy() {
      super.destroy();
      this.refreshPending = null;
      this.cachedItems = null;
      if (this.messageUpdateSubscription) {
        this.messageUpdateSubscription.unsubscribe();
        this.messageUpdateSubscription = null;
      }
    }
  }

  Diagnostics.configScope = pkg.name;

  return Diagnostics;
};
