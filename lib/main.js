const pkg = require('../package.json');
const {CompositeDisposable} = require('atom');
const {requireFrom} = require('./utils');

const settings = requireFrom('narrow', 'lib/settings');

class Main {
  constructor() {
    this.config = settings.createProviderConfig({
      autoPreview: false,
      autoPreviewOnQueryChange: false,
      negateNarrowQueryByEndingExclamation: true,
      revealOnStartCondition: 'never',
    });

    this.narrow = null;
    this.awaitNarrow();
  }

  awaitNarrow() {
    if (this.narrowPromise) return this.narrowPromise;

    this.narrowPromise = new Promise(resolve => {
      Promise.all([
        new Promise(resolve => {
          this.consumeNarrow = service => {
            resolve(service);
          };
        }),
        new Promise(resolve => {
          this.consumeObservableDiagnosticUpdates = service => {
            resolve(service);
          };
        }),
      ]).then(([narrow, diagnostics]) => {
        this.consumeServices(narrow, diagnostics);
        resolve(narrow.narrow);
      });
    });

    return this.narrowPromise;
  }

  consumeServices(narrow, diagnostics) {
    this.narrow = narrow.narrow;
    narrow.registerProvider(
      'diagnostics',
      require('./createDiagnosticsProvider')(diagnostics)
    );
  }

  activate() {
    if (atom.inDevMode()) {
      try {
        this.setupSubscriptions();
      } catch (e) {
        console.error(e); // eslint-disable-line no-console
      }
    } else {
      this.setupSubscriptions();
    }
  }

  setupSubscriptions() {
    this.subscriptions = new CompositeDisposable();

    let {narrow} = this;
    const {narrowPromise = this.awaitNarrow()} = this;

    function execute() {
      if (narrow) {
        return narrow('diagnostics');
      } else {
        atom.commands.dispatch(this, 'narrow:activate-package');
        return narrowPromise.then(narrow => {
          narrow('diagnostics');
        });
      }
    }

    this.subscriptions.add(
      atom.commands.add('atom-text-editor', {
        'narrow:diagnostics': execute,
      })
    );
  }

  deactivate() {
    if (this.subscriptions) this.subscriptions.dispose();
  }

  consumeAutoreload(reloader) {
    reloader({pkg: pkg.name});
  }
}

module.exports = new Main();
