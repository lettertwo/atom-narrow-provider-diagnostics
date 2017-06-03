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
    }

    getItems() {
      if (this.messageUpdateSubscription) {
        this.messageUpdateSubscription.unsubscribe();
      }
      this.messageUpdateSubscription = service.allMessageUpdates
        .map(updates => updates.map(parseUpdate))
        .subscribe(this.updateItems.bind(this));
    }

    destroy() {
      super.destroy();
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
