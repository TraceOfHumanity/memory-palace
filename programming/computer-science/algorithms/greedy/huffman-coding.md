# Huffman Coding — кодування Хаффмана

Кодування Хаффмана — алгоритм **стиснення без втрат**: часті символи отримують **короткі** двійкові коди, рідкісні — **довгі**. Він будує **оптимальний префіксний код** (серед усіх кодів, де символ кодується цілим числом бітів) за допомогою жадібного об'єднання двох найрідших символів. Хаффман лежить в основі DEFLATE (ZIP, gzip, PNG), JPEG, MP3 та багатьох форматів. Це чудовий приклад **жадібного алгоритму** з елегантним доведенням ([activity-selection.md](activity-selection.md)).

## 1. Проблема: кодування змінної довжини

Звичайне кодування (ASCII) використовує **8 бітів** на символ незалежно від частоти. Для тексту `"aaaaabbbcc"` (5×a, 3×b, 2×c) потрібно 80 бітів. Фіксований код на 3 символи вимагає 2 біти: 20 бітів. Але якщо дати `a → 0` (1 біт), `b → 10`, `c → 11`, отримаємо `5·1 + 3·2 + 2·2 = 15` бітів.

Щоб розкодувати потік без розділювачів, код має бути **префіксним**: жоден код не є початком іншого. Тоді, читаючи біти, ми однозначно знаємо, коли символ закінчився.

Префіксний код природно представляється **двійковим деревом**: символи — **листки**, шлях від кореня (`0` — ліворуч, `1` — праворуч) — код символа.

## 2. Алгоритм Хаффмана

1. Порахувати частоти символів.
2. Створити по листку-вузлу на кожен символ із вагою = частота; покласти в **мін-купу** за вагою.
3. Поки в купі більше одного вузла: вийняти **два вузли з найменшою вагою**, створити їхній **батьківський** вузол із вагою-сумою, покласти в купу.
4. Останній вузол — корінь дерева. Коди: `0` для лівого ребра, `1` для правого.

Для `"aaaaabbbcc"`: частоти `a:5, b:3, c:2`. Об'єднуємо `c(2) + b(3) = 5`, потім `5 + a(5) = 10`. Коди: `{ a: '0', c: '10', b: '11' }`. Загальна довжина: 15 бітів проти 80 у ASCII.

Класичний приклад: `"this is an example of a huffman tree"`. Коди за частотами:

```text
" "  частота 7  код 111
"a"  частота 4  код 000
"e"  частота 4  код 001
"f"  частота 3  код 1101
"h"  частота 2  код 0101
"i"  частота 2  код 0110
"m"  частота 2  код 1001
"n"  частота 2  код 1000
"s"  частота 2  код 0111
"t"  частота 2  код 0100
"l"  частота 1  код 10110
"o"  частота 1  код 10111
"p"  частота 1  код 10101
"r"  частота 1  код 11001
"u"  частота 1  код 11000
"x"  частота 1  код 10100
```

## 3. Чому це оптимально (ідея доведення)

**Лема.** У будь-якого оптимального дерева два символи з найменшими частотами `x` та `y` можуть бути **сусідніми листками** на найглибшому рівні.

*Доказ.* Якщо листок `a` глибший за `x`, а `f(a) > f(x)`, поміняємо `a` і `x` місцями: вартість змінюється на `(f(a) − f(x))·(depth(x) − depth(a)) ≤ 0` — не гірше. Те саме для `y`. ∎

**Індукція.** Об'єднання `x` і `y` у один «псевдосимвол» із вагою `f(x) + f(y)` зводить задачу до меншої з `n − 1` символом; вартість зростає на `f(x) + f(y)` незалежно від решти. За індукцією оптимальне дерево для зменшеної задачі розширюється до оптимального для вихідної.

**Межа Шеннона.** Середня довжина коду `L` задовольняє `H ≤ L < H + 1`, де `H = −Σ p_i · log₂ p_i` — **ентропія** джерела (теоретичний мінімум біт на символ). Хаффман досягає межі лише коли всі `p_i` — степені `1/2`. Для `"aaaaabbbcc"`: `H = 1.485`, середня довжина Хаффмана `L = 1.500`.

## 4. Реалізація

```js
function frequencies(text) {
  const f = new Map();
  for (const ch of text) f.set(ch, (f.get(ch) || 0) + 1);
  return f;
}

function buildTree(freq) {
  let nodes = [...freq].map(([sym, w], i) => ({ sym, w, id: i, left: null, right: null }));
  let nextId = nodes.length;
  const order = (a, b) => a.w - b.w || a.id - b.id;
  while (nodes.length > 1) {
    nodes.sort(order);
    const a = nodes.shift();
    const b = nodes.shift();
    nodes.push({ sym: null, w: a.w + b.w, id: nextId++, left: a, right: b });
  }
  return nodes[0];
}

function codesFromTree(root) {
  const codes = {};
  if (!root) return codes;
  if (root.sym !== null) { codes[root.sym] = '0'; return codes; }
  const go = (n, prefix) => {
    if (n.sym !== null) { codes[n.sym] = prefix; return; }
    go(n.left, prefix + '0');
    go(n.right, prefix + '1');
  };
  go(root, '');
  return codes;
}

function huffman(text) {
  const freq = frequencies(text);
  const root = buildTree(freq);
  const codes = codesFromTree(root);
  let totalBits = 0;
  for (const [s, w] of freq) totalBits += w * codes[s].length;
  return { codes, totalBits, root, freq };
}

function encode(text, codes) {
  let out = '';
  for (const ch of text) out += codes[ch];
  return out;
}

function decode(bits, root) {
  if (root.sym !== null) return root.sym.repeat(bits.length);
  let out = '';
  let n = root;
  for (const b of bits) {
    n = b === '0' ? n.left : n.right;
    if (n.sym !== null) { out += n.sym; n = root; }
  }
  return out;
}

function huffmanTable(text) {
  const { codes, freq } = huffman(text);
  return [...freq]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([s, w]) => JSON.stringify(s) + '  частота ' + w + '  код ' + codes[s])
    .join('\n');
}

function entropy(text) {
  const freq = frequencies(text);
  let h = 0;
  for (const w of freq.values()) {
    const p = w / text.length;
    h -= p * Math.log2(p);
  }
  return h;
}

function avgLength(text) {
  const { totalBits } = huffman(text);
  return totalBits / text.length;
}

function isPrefixFree(codes) {
  const list = Object.values(codes);
  for (let i = 0; i < list.length; i++) for (let j = 0; j < list.length; j++) if (i !== j && list[j].startsWith(list[i])) return false;
  return true;
}

function kraftSum(codes) {
  return Object.values(codes).reduce((s, c) => s + 2 ** -c.length, 0);
}

function canonicalCodes(codes) {
  const items = Object.entries(codes).map(([s, c]) => [s, c.length]).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  const out = {};
  let code = 0;
  let prevLen = items[0][1];
  for (const [s, len] of items) {
    code <<= len - prevLen;
    out[s] = code.toString(2).padStart(len, '0');
    code++;
    prevLen = len;
  }
  return out;
}

function packBits(bits) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
  return bytes;
}

function compressionRatio(text) {
  const { totalBits } = huffman(text);
  return +(totalBits / (text.length * 8)).toFixed(3);
}

function minimumTotalMerge(weights) {
  const w = weights.slice();
  let total = 0;
  while (w.length > 1) {
    w.sort((a, b) => a - b);
    const s = w.shift() + w.shift();
    total += s;
    w.push(s);
  }
  return total;
}

function treeDepths(root) {
  const d = {};
  const go = (n, depth) => {
    if (n.sym !== null) { d[n.sym] = depth; return; }
    go(n.left, depth + 1);
    go(n.right, depth + 1);
  };
  go(root, 0);
  return d;
}

function leavesCount(root) {
  if (root.sym !== null) return 1;
  return leavesCount(root.left) + leavesCount(root.right);
}
```

## 5. Кодування й декодування

`encode('aab', huffman('aab').codes)` дає `110`, а `decode` відновлює текст за деревом: `decode(encode('this is an example', huffman('this is an example').codes), huffman('this is an example').root)` = `'this is an example'`.

Декодування за деревом: починаємо з кореня; за кожним бітом спускаємось, при досягненні листка видаємо символ і повертаємось у корінь. Час `O(довжина бітового рядка)`.

**Практичні питання.**

- **Передача дерева:** декодер має знати коди. Передають **таблицю частот** або **довжини кодів** (канонічний Хаффман: за довжинами однозначно відновлюються коди — `canonicalCodes(huffman('aaaaabbbcc').codes)` = `{ a: '0', b: '10', c: '11' }`). Це економить місце заголовка й прискорює декодування таблицями.
- **Виняток:** текст з **одним** унікальним символом — дерево з єдиного листка; призначаємо код `'0'`.
- **Двопрохідність:** потрібні частоти всього файлу; для потоків — адаптивний Хаффман (FGK, Vitter) або арифметичне кодування.
- **Нерівномірність:** алгоритм дає **цілу** кількість біт на символ, тому для дуже ймовірних символів (`p > 0,5`) втрачає: мінімум 1 біт. Арифметичне й ANS-кодування (zstd, JPEG XL) наближаються до ентропії точніше.

## 6. Складність

- **Підрахунок частот:** `O(n)`.
- **Побудова дерева:** `k` унікальних символів → `O(k log k)` з купою (у нашій навчальній реалізації з пересортуванням — `O(k² log k)`, що для алфавіту порядку сотень несуттєво).
- **Кодування й декодування:** `O(n)`.
- **Пам'ять:** `O(k)` для дерева.
- Існує лінійний алгоритм, якщо частоти вже відсортовані (дві черги): `O(k)`.

## 7. Властивості

- **Префіксність:** `isPrefixFree(huffman('abracadabra').codes)` = `true`.
- **Нерівність Крафта:** для префіксного коду `Σ 2^{−len} ≤ 1`; для повного дерева Хаффмана рівність: `kraftSum(huffman('abracadabra').codes)` = `1`.
- **Не єдиний:** при рівних частотах дерево залежить від порядку; *довжини* кодів можуть відрізнятися, але **середня довжина** однакова.
- **Глибина дерева** не перевищує `k − 1` для `k` унікальних символів.
- **Вартість побудови:** сума ваг усіх внутрішніх вузлів = загальна кількість бітів (`minimumTotalMerge([5, 3, 2])` = `15`) — це і є задача «оптимальне злиття файлів».

## 8. Застосування

- **DEFLATE** (gzip, zip, PNG): LZ77 + Хаффман.
- **JPEG, MP3, MPEG:** Хаффман на квантованих коефіцієнтах.
- **Оптимальне злиття файлів:** мінімальна сума вартостей — те саме жадібне правило (завжди зливати два найменші): `minimumTotalMerge([20, 30, 10, 5, 30])` = `205`.
- **Стиснення тексту:** `compressionRatio('this is an example of a huffman tree')` = `0.469` від розміру ASCII.
- **Префіксні схеми в протоколах**, коди Морзе (ідея частотності).

## 9. Типові помилки

1. **Беремо два найбільші** замість двох найменших.
2. **Не фіксуємо порядок при рівних вагах** — недетермінована таблиця (різні, але однаково ефективні коди).
3. **Один символ у тексті:** порожній код — декодер не знає довжину; потрібен хоч 1 біт.
4. **Не передати таблицю/дерево** разом із даними.
5. **Біти як рядки `'0'/'1'` у продакшені** — витрата в 8 разів; пакуйте в байти (`packBits`).
6. **Підрахунок довжини з урахуванням заголовка** — для малих файлів стиснення може бути гіршим за початковий розмір.
7. **Плутати вузли-листки та внутрішні** при декодуванні.
8. **Unicode:** ітерація `for (const ch of text)` працює за кодовими точками, а `text.length` — за кодовими одиницями; для порівняння з ASCII враховуйте це.

## 10. Алгоритм (стисло)

1. Частоти → листки в мін-купі.
2. Поки вузлів > 1: злити два найлегші в батьківський із сумою ваг.
3. Коди: шлях від кореня (`0` — ліворуч, `1` — праворуч).
4. Час `O(k log k)`; код оптимальний серед префіксних.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Які частоти символів у `'aaaaabbbcc'`?

```js
frequencies('aaaaabbbcc')
```

**2.** Які коди будує `huffman('aaaaabbbcc').codes`?

```js
huffman('aaaaabbbcc').codes
```

**3.** Скільки бітів потрібно для `'aaaaabbbcc'` і скільки в ASCII (8 біт на символ)?

```js
[huffman('aaaaabbbcc').totalBits, 'aaaaabbbcc'.length * 8]
```

**4.** Яка таблиця `huffmanTable('abracadabra')`?

```js
huffmanTable('abracadabra')
```

**5.** Що поверне `encode('aab', huffman('aaaaabbbcc').codes)`?

```js
encode('aab', huffman('aaaaabbbcc').codes)
```

**6.** Чи відновить `decode` текст після `encode` для `'this is an example'`?

```js
(() => { const h = huffman('this is an example'); return decode(encode('this is an example', h.codes), h.root); })()
```

**7.** Яка ентропія `'aaaaabbbcc'` і середня довжина коду Хаффмана? Округліть до 3 знаків.

```js
[+entropy('aaaaabbbcc').toFixed(3), +avgLength('aaaaabbbcc').toFixed(3)]
```

**8.** Чи виконується `H ≤ L < H + 1` для `'abracadabra'`?

```js
(() => { const H = entropy('abracadabra'), L = avgLength('abracadabra'); return [H <= L + 1e-9, L < H + 1]; })()
```

**9.** Яка ентропія тексту з 4 рівноймовірних символів `'abcd'` і довжина коду Хаффмана?

```js
[entropy('abcd'), avgLength('abcd')]
```

**10.** Що поверне `huffman('aaaa').codes` (один символ)?

```js
huffman('aaaa').codes
```

**11.** А `decode('000', huffman('aaa').root)`?

```js
decode('000', huffman('aaa').root)
```

**12.** Що поверне `huffman('').codes` для порожнього тексту?

```js
huffman('').codes
```

**13.** Чи префіксний код для `'abracadabra'` і яка сума Крафта?

```js
[isPrefixFree(huffman('abracadabra').codes), kraftSum(huffman('abracadabra').codes)]
```

### Рівень 2. Робота алгоритму

**14.** Чи префіксний набір кодів `{ a: '0', b: '01', c: '11' }`?

```js
isPrefixFree({ a: '0', b: '01', c: '11' })
```

**15.** Яка сума Крафта для `{ a: '0', b: '10', c: '110' }` (неповне дерево)?

```js
kraftSum({ a: '0', b: '10', c: '110' })
```

**16.** Які канонічні коди для `huffman('aaaaabbbcc').codes`?

```js
canonicalCodes(huffman('aaaaabbbcc').codes)
```

**17.** Які канонічні коди для `{ a: '1', b: '00', c: '01' }`?

```js
canonicalCodes({ a: '1', b: '00', c: '01' })
```

**18.** Скільки байтів у `packBits('0101010111')`?

```js
packBits('0101010111')
```

**19.** Який коефіцієнт стиснення для `'this is an example of a huffman tree'`?

```js
compressionRatio('this is an example of a huffman tree')
```

**20.** Який коефіцієнт стиснення для `'abcdefgh'` (однакові частоти, 8 символів)?

```js
compressionRatio('abcdefgh')
```

**21.** Яка сума `minimumTotalMerge([5, 3, 2])` та `([20, 30, 10, 5, 30])`?

```js
[minimumTotalMerge([5, 3, 2]), minimumTotalMerge([20, 30, 10, 5, 30])]
```

**22.** Яка вартість злиття одного файла `[7]` та порожнього набору?

```js
[minimumTotalMerge([7]), minimumTotalMerge([])]
```

**23.** Які глибини листків у дереві `'aaaaabbbcc'`?

```js
treeDepths(huffman('aaaaabbbcc').root)
```

**24.** Скільки листків у дереві для `'hello world'` та скільки унікальних символів?

```js
[leavesCount(huffman('hello world').root), new Set('hello world').size]
```

**25.** Чи збігаються `totalBits` і `minimumTotalMerge` частот для `'abracadabra'`?

```js
[huffman('abracadabra').totalBits, minimumTotalMerge([...huffman('abracadabra').freq.values()])]
```

**26.** Яка середня довжина коду для рівномірних 8 символів `'abcdefgh'`?

```js
avgLength('abcdefgh')
```

### Рівень 3. Складність і нюанси

**27.** Чи може код Хаффмана бути коротшим за 1 біт на символ? Для тексту `'aaaaaaaab'`: середня довжина.

```js
avgLength('aaaaaaaab')
```

**28.** Яка ентропія для `'aaaaaaaab'` (нижня межа) порівняно з довжиною Хаффмана?

```js
[+entropy('aaaaaaaab').toFixed(3), avgLength('aaaaaaaab')]
```

**29.** Скільки різних дерев можна отримати при рівних частотах `'abcd'`? Перевірте, що довжини кодів однакові (по 2 біти).

```js
Object.values(huffman('abcd').codes).map(c => c.length)
```

**30.** Напишіть `decodeWithTable(bits, codes)` — розкодувати за таблицею кодів (без дерева).

**31.** Напишіть `bitsSaved(text)` — на скільки бітів Хаффман економить порівняно з 8 бітами на символ.

**32.** Напишіть `fixedLengthBits(text)` — біти при фіксованому коді мінімальної довжини `⌈log₂ k⌉` на символ.

**33.** Напишіть `codeLengths(text)` — об'єкт символ → довжина коду.

**34.** Напишіть `mostFrequentGetsShortest(text)` — чи символ із найбільшою частотою має найкоротший код.

**35.** Напишіть `huffmanTwoQueue(weights)` — загальну вартість Хаффмана за лінійний час на **відсортованих** вагах двома чергами.

**36.** Напишіть `treeToBracket(root)` — рядкове представлення дерева (`(лівий,правий)` для внутрішніх, символ для листка).

**37.** Напишіть `expectedLengthFromProbs(probs)` — середню довжину коду Хаффмана для заданих ймовірностей (сума внутрішніх вузлів).

**38.** Напишіть `isOptimalPrefixCode(codes, freq)` — чи вага кодів дорівнює вазі Хаффмана (для Map частот).

**39.** Напишіть `runLengthEncode(text)` — RLE (`aaabcc` → `a3b1c2`) для порівняння з Хаффманом.

### Рівень 4. Задачі з інтерв'ю

**40.** Що таке префіксний код і чому він потрібен?

**41.** Опишіть алгоритм Хаффмана.

**42.** Чому злиття двох найменших частот оптимальне?

**43.** Як ентропія пов'язана з довжиною коду Хаффмана?

**44.** Чому для тексту з одним унікальним символом потрібна особлива обробка?

**45.** Що таке канонічний код Хаффмана і навіщо він?

**46.** Які обмеження кодування Хаффмана?

**47.** Яка складність побудови дерева Хаффмана?

**48.** Де використовується кодування Хаффмана?

**49.** Чому коди Хаффмана не єдині?

**50.** Скільки бітів потрібно для `'abracadabra'` за Хаффманом і за фіксованим кодом по 3 біти?

```js
[huffman('abracadabra').totalBits, 11 * 3]
```

### Відповіді

1. `Map(3) {'a' => 5, 'b' => 3, 'c' => 2}`
2. `{ a: '0', c: '10', b: '11' }`
3. `[15, 80]`
4. `'"a"  частота 5  код 0\n"b"  частота 2  код 110\n"r"  частота 2  код 111\n"c"  частота 1  код 100\n"d"  частота 1  код 101'`
5. `'0011'`
6. `'this is an example'`
7. `[1.485, 1.5]`
8. `[true, true]`
9. `[2, 2]`
10. `{ a: '0' }`
11. `'aaa'`
12. `{}`
13. `[true, 1]`
14. `false`
15. `0.875`
16. `{ a: '0', b: '10', c: '11' }`
17. `{ a: '0', b: '10', c: '11' }`
18. `[85, 192]`
19. `0.469`
20. `0.375`
21. `[15, 205]`
22. `[0, 0]`
23. `{ a: 1, c: 2, b: 2 }`
24. `[8, 8]`
25. `[23, 23]`
26. `3`
27. `1`
28. `[0.503, 1]`
29. `[2, 2, 2, 2]`
30. Приклад розв'язку:

   ```js
   function decodeWithTable(bits, codes) {
     const rev = {};
     for (const [s, c] of Object.entries(codes)) rev[c] = s;
     let cur = '', out = '';
     for (const b of bits) {
       cur += b;
       if (cur in rev) {
         out += rev[cur];
         cur = '';
       }
     }
     return out;
   }
   ```

   Виклик `(() => { const h = huffman('abracadabra'); return decodeWithTable(encode('abracadabra', h.codes), h.codes); })()` → `'abracadabra'`

31. Приклад розв'язку:

   ```js
   const bitsSaved = (t) => t.length * 8 - huffman(t).totalBits
   ```

   Виклик `[bitsSaved('aaaaabbbcc'), bitsSaved('abcdefgh')]` → `[65, 40]`

32. Приклад розв'язку:

   ```js
   const fixedLengthBits = (t) => t.length * Math.ceil(Math.log2(new Set(t).size) || 1)
   ```

   Виклик `[fixedLengthBits('aaaaabbbcc'), fixedLengthBits('abcdefgh'), huffman('aaaaabbbcc').totalBits]` → `[20, 24, 15]`

33. Приклад розв'язку:

   ```js
   function codeLengths(t) {
     const c = huffman(t).codes;
     return Object.fromEntries(Object.entries(c).map(([s, x]) => [s, x.length]));
   }
   ```

   Виклик `codeLengths('aaaaabbbcc')` → `{ a: 1, c: 2, b: 2 }`

34. Приклад розв'язку:

   ```js
   function mostFrequentGetsShortest(t) {
     const h = huffman(t);
     const freq = [...h.freq].sort((a, b) => b[1] - a[1]);
     const top = freq[0][0];
     const minLen = Math.min(...Object.values(h.codes).map(c => c.length));
     return h.codes[top].length === minLen;
   }
   ```

   Виклик `[mostFrequentGetsShortest('aaaaabbbcc'), mostFrequentGetsShortest('abracadabra')]` → `[true, true]`

35. Приклад розв'язку:

   ```js
   function huffmanTwoQueue(w) {
     const q1 = w.slice().sort((a, b) => a - b), q2 = [];
     let i = 0, j = 0, total = 0;
     const pick = () => {
       if (i < q1.length && (j >= q2.length || q1[i] <= q2[j])) return q1[i++];
       return q2[j++];
     };
     let remaining = w.length;
     while (remaining > 1) {
       const s = pick() + pick();
       total += s;
       q2.push(s);
       remaining--;
     }
     return total;
   }
   ```

   Виклик `[huffmanTwoQueue([5, 3, 2]), huffmanTwoQueue([20, 30, 10, 5, 30])]` → `[15, 205]`

36. Приклад розв'язку:

   ```js
   function treeToBracket(n) {
     if (n.sym !== null) return JSON.stringify(n.sym);
     return '(' + treeToBracket(n.left) + ',' + treeToBracket(n.right) + ')';
   }
   ```

   Виклик `treeToBracket(huffman('aaaaabbbcc').root)` → `'("a",("c","b"))'`

37. Приклад розв'язку:

   ```js
   function expectedLengthFromProbs(p) {
     const w = p.slice();
     let total = 0;
     while (w.length > 1) {
       w.sort((a, b) => a - b);
       const s = w.shift() + w.shift();
       total += s;
       w.push(s);
     }
     return +total.toFixed(6);
   }
   ```

   Виклик `[expectedLengthFromProbs([0.5, 0.25, 0.25]), expectedLengthFromProbs([0.4, 0.3, 0.2, 0.1])]` → `[1.5, 1.9]`

38. Приклад розв'язку:

   ```js
   function isOptimalPrefixCode(codes, freq) {
     let bits = 0;
     for (const [s, w] of freq) bits += w * codes[s].length;
     return bits === huffman([...freq].map(([s, w]) => s.repeat(w)).join('')).totalBits;
   }
   ```

   Виклик `[isOptimalPrefixCode({ a: '0', b: '10', c: '11' }, new Map([['a', 5], ['b', 3], ['c', 2]])), isOptimalPrefixCode({ a: '00', b: '01', c: '1' }, new Map([['a', 5], ['b', 3], ['c', 2]]))]` → `[true, false]`

39. Приклад розв'язку:

   ```js
   function runLengthEncode(t) {
     let out = '', i = 0;
     while (i < t.length) {
       let j = i;
       while (j < t.length && t[j] === t[i]) j++;
       out += t[i] + (j - i);
       i = j;
     }
     return out;
   }
   ```

   Виклик `[runLengthEncode('aaabcc'), runLengthEncode('abc'), runLengthEncode('')]` → `['a3b1c2', 'a1b1c1', '']`

40. Код, у якому жоден кодовий рядок не є початком іншого. Тоді потік бітів розкодовується однозначно без розділювачів: щойно прочитано повний код символа, він не може бути початком іншого коду.
41. Порахувати частоти, покласти листки в мін-купу, поки вузлів більше одного — об'єднувати два з найменшою вагою в батьківський вузол із сумою ваг. Коди — шлях від кореня до листка (`0` ліворуч, `1` праворуч).
42. Існує оптимальне дерево, де два найрідші символи — сусідні листки на найглибшому рівні (обмін глибших, але частіших листків із ними не збільшує вартість). Об'єднавши їх у один вузол, отримуємо меншу задачу, яку розв'язуємо за індукцією.
43. Середня довжина коду `L` задовольняє `H ≤ L < H + 1`, де `H` — ентропія джерела (мінімум біт на символ). Хаффман досягає `H` лише коли всі ймовірності — степені `1/2`.
44. Дерево складається з єдиного листка, і код порожній — декодер не знає, скільки символів зашифровано. Тому такому символу призначають код `0` (1 біт) або передають довжину окремо.
45. Код, у якому коди визначаються лише довжинами за правилом: сортуємо символи за довжиною й алфавітом і призначаємо послідовні двійкові числа. Тоді в заголовку достатньо передавати довжини кодів, а не все дерево.
46. Ціла кількість бітів на символ (мінімум 1 біт — неефективно при `p > 0,5`), потреба в таблиці частот (двопрохідність або адаптивні варіанти) і неможливість враховувати залежності між символами. Арифметичне кодування й ANS наближаються до ентропії точніше.
47. `O(k log k)` для `k` унікальних символів із мін-купою; `O(k)`, якщо частоти вже відсортовані (двочергова версія). Кодування й декодування — `O(n)`.
48. DEFLATE (gzip, zip, PNG), JPEG, MP3, MPEG, у багатьох форматах стиснення як останній етап після перетворень (LZ77, квантування, дельта-кодування).
49. При рівних вагах порядок злиття не визначений, тому можливі різні дерева та різні набори довжин кодів, але вони мають однакову мінімальну загальну вартість (середню довжину).
50. `[23, 33]`
