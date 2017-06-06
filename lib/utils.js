const {Point} = require('atom');
const {Observable} = require('rxjs');

function requireFrom(pkg, path) {
  const pkgPath = atom.packages.resolvePackagePath(pkg);
  return require(`${pkgPath}/${path}`);
}

function updateContextFromEditor(update, editor) {
  const {row} = update.range.start;
  const rowCount = row - update.range.end.row + 1;
  const items = [];

  for (let i = 0; i < rowCount; i++) {
    items.push(editor.lineTextForBufferRow(row));
  }

  return items.join('\n');
}

const filePath = update => update.filePath;

const groupAndEditor = group =>
  group.toArray().combineLatest(editorForGroup(group));

const editorForGroup = group =>
  atom.workspace.open(group.key, {activateItem: false});

const itemsWithContext = ([group, editor]) => [
  headerForFilePath(editor.buffer.file.path),
  ...group.reduce(
    (a, v) => [...a, headerForUpdate(v), itemForUpdate(v, editor)],
    []
  ),
];

const itemForUpdate = (update, editor) => ({
  text: updateContextFromEditor(update, editor),
  filePath: update.filePath,
  range: update.range,
  point: update.range ? update.range.start : new Point(0, 0),
  providerName: update.providerName,
  type: update.type,
  info: update.text,
});

const headerForFilePath = filePath => ({
  filePath,
  header: `## ${atom.project.relativize(filePath)}`,
  skip: true,
});

const headerForUpdate = update => ({
  filePath: update.filePath,
  header: `### ${update.providerName} ${update.type}: ${update.text}`,
  skip: true,
});

function processUpdates(updates) {
  return Observable.from(updates)
    .groupBy(filePath)
    .mergeMap(groupAndEditor)
    .mergeMap(itemsWithContext)
    .toArray();
}

module.exports = {
  requireFrom,
  processUpdates,
};
