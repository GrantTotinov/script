// Скрипт за почистване на текстовете на законите в all_laws_full.json
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'all_laws_full.json');
const outputPath = path.join(__dirname, 'public', 'all_laws_full_clean.json');

const raw = fs.readFileSync(inputPath, 'utf8');
const laws = JSON.parse(raw);



const STOP_PHRASES = [
  'Законодателство',
  'Правилник',
  'Законопроекти',
  'Проекти на решения',
  'Решения',
  'Декларации',
  'Парламентарен контрол',
  'Програма за парламентарен контрол',
  'Питания',
  'Въпроси',
  'Изслушвания',
  'Вот на доверие',
  'Вот на недоверие',
  'Блиц контрол',
  'Разисквания по питания',
  'Европейски съюз',
  'Закони, свързани с правото на ЕС',
  'Консолидирана версия',
  'Годишна работна програма',
  'Членове на Европейския парламент',
  'Европейски център',
  'КОСАК',
  'Междупарламентарна обмяна',
  'Документи на Европейската комисия',
  'Документи на Съвета на ЕС',
  'Документи на Европейския парламент',
  'Европейски документационен център',
  'Полезни връзки',
  'Международна дейност',
  'Парламентарни делегации',
  'Групи за приятелство',
  'Българско председателство',
  'Пролетна сесия',
  'Регистри',
  'Публични процедури',
  'Регистър по чл.',
  'Регистър по Закона',
  'Контакти',
  'Интернет порталът е надграден',
  'НАРОДНО СЪБРАНИЕ НА РЕПУБЛИКА БЪЛГАРИЯ',
  'София 1169',
  'Държавен вестник',
  'пленарна зала',
  'парламентарни групи',
  'постоянни и временни комисии',
  'приемна за граждани',
  'предоставяне на достъп',
  'обществени поръчки',
  'Телефонна централа',
  '© 2021 Народно събрание',
];

const cleanLawText = (text) => {
  if (!text) return '';
  // Търси първото срещане на УКАЗ или ЗАКОН (начало на закона), case-insensitive
  const match = text.match(/(УКАЗ\s*№.*|ЗАКОН[^\n]*)/is);
  if (match && match.index !== undefined) {
    const candidate = text.slice(match.index).trim();
    // Ако започва със стоп-фраза, не е закон
    for (const stop of STOP_PHRASES) {
      if (candidate.toLowerCase().startsWith(stop.toLowerCase())) {
        return '';
      }
    }
    return candidate;
  }
  return '';
};

const cleaned = laws
  .map(law => {
    if (!law || typeof law !== 'object') {
      return null;
    }
    const cleanedText = cleanLawText(law.text);
    if (!cleanedText) return null;
    return {
      ...law,
      text: cleanedText
    };
  })
  .filter(Boolean);

fs.writeFileSync(outputPath, JSON.stringify(cleaned, null, 2), 'utf8');
console.log(`Готово! Записано в ${outputPath}`);