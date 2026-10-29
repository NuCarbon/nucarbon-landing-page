import assert from 'node:assert/strict';
import test from 'node:test';
import { shareIcons, shareMethodIcons } from '../src/components/calculator/share/share-icons.ts';

// Mirrors the ShareMethod union in src/lib/share-links.ts; every method renders an icon.
const SHARE_METHODS = [
  'whatsapp',
  'x',
  'facebook',
  'linkedin',
  'telegram',
  'instagram_stories',
  'native',
  'copy_link',
  'download',
];

const VIEW_BOXES = new Set(['0 0 24 24', '0 -960 960 960']);

test('every share icon is a known viewBox plus path data only', () => {
  for (const [name, icon] of Object.entries(shareIcons)) {
    assert.ok(VIEW_BOXES.has(icon.viewBox), `${name} has an unexpected viewBox`);
    assert.ok(icon.source.length > 0, `${name} has no source`);
    assert.match(icon.path, /^[Mm][\d\s.,\-+MmZzLlHhVvCcSsQqTtAaEe]+$/, `${name} is not path data`);
    assert.ok(!icon.path.includes('<'), `${name} contains markup`);
    assert.ok(!/svg/i.test(icon.path), `${name} contains markup`);
  }
});

test('every share method has an icon', () => {
  assert.deepEqual(Object.keys(shareMethodIcons).sort(), [...SHARE_METHODS].sort());
  for (const method of SHARE_METHODS) {
    assert.ok(shareMethodIcons[method] in shareIcons, `${method} has no icon`);
  }
});

test('brand marks use the Simple Icons grid, UI glyphs the Material Symbols one', () => {
  for (const [name, icon] of Object.entries(shareIcons)) {
    const expected = icon.source.startsWith('material-symbols/') ? '0 -960 960 960' : '0 0 24 24';
    assert.equal(icon.viewBox, expected, name);
  }
});
