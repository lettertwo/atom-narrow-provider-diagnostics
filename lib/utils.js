function requireFrom(pkg, path) {
  const pkgPath = atom.packages.resolvePackagePath(pkg);
  return require(`${pkgPath}/${path}`);
}

module.exports = {
  requireFrom,
};
