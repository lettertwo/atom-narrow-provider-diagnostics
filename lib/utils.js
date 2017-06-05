const {Point} = require('atom');

function requireFrom(pkg, path) {
  const pkgPath = atom.packages.resolvePackagePath(pkg);
  return require(`${pkgPath}/${path}`);
}

function parseUpdate(update) {
  const {filePath, text, range} = update;
  return {
    filePath,
    text,
    range,
    point: range ? range.start : new Point(0, 0),
  };
}

module.exports = {
  requireFrom,
  parseUpdate,
};
