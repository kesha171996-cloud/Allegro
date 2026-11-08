// Локальная база демонстрационных примеров. Это не полный каталог Allegro.
// Наличие категории в базе не подтверждает, что она актуальна на дату запроса.
const EXAMPLES = [
  {
    id: '254702',
    name: 'Elementy mocujące',
    path: ['Motoryzacja', 'Części samochodowe', 'Części karoserii', 'Zderzaki', 'Elementy mocujące'],
    oems: ['LR114212', 'K8D25K261BA', 'K8D25K261BB', 'K8D25K261BC', 'K8D25K261BD', 'K8D25K261BE'],
    kind: /теплозащит|экран|osłon|heat shield|щит.*тепл|zderzak|bumper/i,
    sourceUrl: 'https://allegro.pl/kategoria/zderzaki-elementy-mocujace-254702',
    note: 'Образец из исходных примеров. Категория не проверяется автоматически в реальном времени.'
  },
  {
    id: '251124',
    name: 'Przewody chłodnic wody',
    path: ['Motoryzacja', 'Części samochodowe', 'Układ chłodzenia silnika', 'Przewody układów chłodzenia', 'Przewody chłodnic wody'],
    oems: ['LR139856', 'J9C25933', 'M8D28C480BB'],
    kind: /шланг|охлажден|przew[oó]d|chłodzen|hose|coolant|radiator/i,
    sourceUrl: 'https://allegro.pl/kategoria/przewody-ukladow-chlodzenia-przewody-chlodnic-wody-251124',
    note: 'Образец из исходных примеров. Категория не проверяется автоматически в реальном времени.'
  }
];
function normalizeText(text) {
  return String(text || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}
function findExample(text) {
  const input = normalizeText(text);
  // В отличие от поиска подстроки, избегаем ложных совпадений LR114212 и LR1142129.
  const upper = input.toUpperCase();
  for (const e of EXAMPLES) {
    if (!e.kind.test(input)) continue;
    const matched = e.oems.some(o => {
      const escaped = o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^A-Z0-9])${escaped}($|[^A-Z0-9])`, 'i').test(upper);
    });
    if (!matched) continue;
    return {
      status: 'example', id: e.id, name: e.name, path: e.path,
      sourceUrl: e.sourceUrl, sourceLabel: 'Страница категории Allegro.pl', note: e.note
    };
  }
  return null;
}
window.CategoryData = {normalizeText,findExample};
