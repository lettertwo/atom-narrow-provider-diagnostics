const pkg = require('../package.json');
const {Point} = require('atom');
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
      // See comments in `updateItems()` for more.
      this.needsRefresh = null;
      this.cachedItems = null;
    }

    updateItems(items) {
      if (this.needsRefresh) {
        // HACK: We convert our push updates from the diagnostics provider
        // to pull updates from the narrow provider by manually refreshing
        // narrow whenever we see data from diagnostics, but aren't
        // already refreshing for narrow.
        this.ui.refreshManually();
      } else {
        this.needsRefresh = null;
        super.updateItems(items);
      }
    }

    scheduleRefreshIfNecessary() {
      if (this.needsRefresh === false) return;
      this.needsRefresh = true;
    }

    cacheItems(items) {
      this.cachedItems = items;
    }

    getItems() {
      // Narrow asked us to get items, so no need to manually refresh.
      this.needsRefresh = false;

      if (!this.messageUpdateSubscription) {
        // If this is our first time getting items, set up
        // a subscription to diagnostics message updates.
        this.messageUpdateSubscription = service.allMessageUpdates
          .do(this.scheduleRefreshIfNecessary.bind(this))
          .map(updates => updates.map(parseUpdate))
          .do(this.cacheItems.bind(this))
          .subscribe(this.updateItems.bind(this));
      } else {
        // If we're already subscribed to updates,
        // update with the last value from the subscription.
        this.updateItems(this.cachedItems);
      }
    }

    destroy() {
      super.destroy();
      this.needsRefresh = null;
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

function parseUpdate(update) {
  const {filePath, text, range} = update;
  return {filePath, text, point: range ? range.start : new Point(0, 0)};
}
