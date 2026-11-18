# Edit Distance — відстань редагування (Левенштейна)

**Відстань Левенштейна** між двома рядками — мінімальна кількість **елементарних операцій**, що перетворюють один рядок на інший. Операції: **вставка** символа, **видалення** символа, **заміна** символа (кожна коштує 1). Саме на цьому працюють перевірка орфографії («Ви мали на увазі…»), нечіткий пошук, порівняння ДНК, виправлення опечаток, дедуплікація записів. Обчислюється ДП за `O(n·m)`.

## 1. Приклад

`kitten → sitting`: **3** операції — `kitten → sitten` (заміна `k→s`), `sitten → sittin` (заміна `e→i`), `sittin → sitting` (вставка `g`). `editDistance('kitten', 'sitting')` = `3`. Послідовність операцій: `['заміна k→s', 'заміна e→i', 'вставити g']`.

## 2. ДП

**Стан:** `dp[i][j]` — мінімальна відстань між префіксом `a[0..i)` і префіксом `b[0..j)`.

**Перехід.** Розглядаємо останні символи `a[i − 1]` та `b[j − 1]`:

- якщо **однакові** — нічого робити не треба: `dp[i][j] = dp[i − 1][j − 1]`;
- інакше беремо мінімум із трьох варіантів + 1:
  - **заміна** `a[i − 1] → b[j − 1]`: `dp[i − 1][j − 1] + 1`;
  - **видалення** `a[i − 1]`: `dp[i − 1][j] + 1`;
  - **вставка** `b[j − 1]` в кінець `a`: `dp[i][j − 1] + 1`.

**База:** `dp[i][0] = i` (видалити всі `i` символів), `dp[0][j] = j` (вставити `j` символів). **Відповідь:** `dp[n][m]`.

Усі три варіанти — це три «клітинки-сусіди» (діагональ, зверху, ліворуч). Для `kitten` і `sitting`:

```text
     · s i t t i n g
·    0 1 2 3 4 5 6 7
k    1 1 2 3 4 5 6 7
i    2 2 1 2 3 4 5 6
t    3 3 2 1 2 3 4 5
t    4 4 3 2 1 2 3 4
e    5 5 4 3 2 2 3 4
n    6 6 5 4 3 3 2 3
```

Права нижня клітинка — відстань.

## 3. Відновлення операцій

Йдемо з `(n, m)` назад, шукаючи, з якої сусідньої клітинки прийшли: діагональ (збіг чи заміна), вгору (видалення), вліво (вставка). Так будується «скрипт редагування» — основа `diff` на рівні символів.

## 4. Властивості

- Метрика: `d(a, b) ≥ 0`, `d(a, b) = 0 ⟺ a = b`, симетрична, нерівність трикутника.
- `|len(a) − len(b)| ≤ d(a, b) ≤ max(len(a), len(b))`.
- Верхня межа: `d ≤ len(a) + len(b)` (видалити все й вставити все).
- Відстань Левенштейна ≥ **хемінгова** для рядків однакової довжини (Хемінг дозволяє лише заміни).
- Пов'язана з LCS ([lcs.md](lcs.md)): якщо забрати заміни (вартість `2`), `d = |a| + |b| − 2·LCS`.

## 5. Реалізація

```js
function editTableData(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Array(m + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function editDistance(a, b) {
  return editTableData(a, b)[a.length][b.length];
}

function editTable(a, b) {
  const dp = editTableData(a, b);
  const header = '     ' + ['·', ...b].join(' ');
  return [header, ...dp.map((row, i) => (i === 0 ? '·' : a[i - 1]) + '    ' + row.join(' '))].join('\n');
}

function editScript(a, b) {
  const dp = editTableData(a, b);
  let i = a.length;
  let j = b.length;
  const ops = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) { i--; j--; }
    else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { ops.push('заміна ' + a[i - 1] + '→' + b[j - 1]); i--; j--; }
    else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.push('видалити ' + a[i - 1]); i--; }
    else { ops.push('вставити ' + b[j - 1]); j--; }
  }
  return ops.reverse();
}

function editDistanceTwoRows(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[b.length];
}

function editDistanceRecursive(a, b, i = a.length, j = b.length) {
  if (i === 0) return j;
  if (j === 0) return i;
  if (a[i - 1] === b[j - 1]) return editDistanceRecursive(a, b, i - 1, j - 1);
  return 1 + Math.min(
    editDistanceRecursive(a, b, i - 1, j - 1),
    editDistanceRecursive(a, b, i - 1, j),
    editDistanceRecursive(a, b, i, j - 1),
  );
}

function damerauLevenshtein(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Array(m + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[n][m];
}

function hamming(a, b) {
  if (a.length !== b.length) return -1;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

function weightedEdit(a, b, ins, del, sub) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i * del;
  for (let j = 1; j <= m; j++) dp[0][j] = j * ins;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    dp[i][j] = a[i - 1] === b[j - 1]
      ? dp[i - 1][j - 1]
      : Math.min(dp[i - 1][j - 1] + sub, dp[i - 1][j] + del, dp[i][j - 1] + ins);
  }
  return dp[n][m];
}

function closestWord(word, dictionary) {
  let best = null;
  let bestD = Infinity;
  for (const w of dictionary) {
    const d = editDistance(word, w);
    if (d < bestD) { bestD = d; best = w; }
  }
  return { word: best, distance: bestD };
}

function withinK(a, b, k) {
  if (Math.abs(a.length - b.length) > k) return false;
  return editDistance(a, b) <= k;
}

function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) && i < a.length;
  if (a.length > b.length) return a.slice(i + 1) === b.slice(i);
  return a.slice(i) === b.slice(i + 1);
}

function minDistanceDeleteOnly(a, b) {
  const dp = editTableData(a, b);
  return dp[a.length][b.length];
}

function similarity(a, b) {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : +(1 - editDistance(a, b) / max).toFixed(3);
}

function countCells(a, b) {
  return (a.length + 1) * (b.length + 1);
}
```

## 6. Складність

- **Час `O(n·m)`**, пам'ять `O(n·m)` (з відновленням) або `O(min(n, m))` (лише число; два рядки).
- Наївна рекурсія експоненційна: для `'abcdefg'` і `'gfedcba'` — 22892 викликів проти 64 станів.
- Для обмеженої відстані `k`: ДП лише в смузі `±k` навколо діагоналі — `O(n·k)` (алгоритм Укконена); якщо `|n − m| > k`, відповідь «більше `k`» миттєво.
- Існують швидші для фіксованих випадків (бітові паралелізми Майерса `O(n·m/w)`), але загальна нижня межа — майже квадратична.

## 7. Варіанти

- **Відстань Дамерау—Левенштейна:** додає **транспозицію** сусідніх символів (типова опечатка): `editDistance('ca', 'ac')` = `2`, а `damerauLevenshtein('ca', 'ac')` = `1`.
- **Зважені операції:** вартості вставки/видалення/заміни різні (клавіатурні відстані, BLOSUM для ДНК): `weightedEdit('kitten', 'sitting', 1, 1, 2)` = `5` (заміна вдвічі дорожча, тому дві заміни `k→s`, `e→i` коштують по 2).
- **Відстань Хемінга:** лише заміни, рядки однакової довжини: `hamming('karolin', 'kathrin')` = `3`.
- **Нечіткий пошук підрядка (approximate matching):** `dp[0][j] = 0` (початок підрядка будь-де) і мінімум по останньому рядку.
- **Відстань Джаро—Вінклера** для коротких імен; **n-грами** й **BK-дерева** для швидкого пошуку у словнику.

## 8. Застосування

- **Виправлення правопису:** `closestWord('speling', ['spelling', 'spieling', 'sapling'])` = `{ word: 'spelling', distance: 1 }`.
- **«Не більше `k` правок»:** `withinK('flaw', 'lawn', 2)` = `true`; одна правка: `oneEditApart('pale', 'ple')` = `true`, `oneEditApart('pale', 'bale')` = `true`, `oneEditApart('pale', 'bake')` = `false`.
- **Біоінформатика:** вирівнювання послідовностей (Needleman—Wunsch — зважена версія, Smith—Waterman — локальна).
- **Дедуплікація записів, злиття даних, пошук плагіату, порівняння версій.**
- **Автозаміна, пошук у IDE** (fuzzy finder).

## 9. Типові помилки

1. **Невірна база:** `dp[i][0] = i`, `dp[0][j] = j`.
2. **Плутанина вставки й видалення** в ході відновлення (напрямок залежить від того, який рядок перетворюється на який).
3. **Збіг — не завжди «безкоштовний шлях»:** при однакових символах `dp[i][j] = dp[i − 1][j − 1]` — коректно (можна довести, що це оптимально).
4. **Для транспозицій** класична відстань дає 2, а не 1.
5. **Індекси `i − 1`, `j − 1`** для символів.
6. **Рекурсія без мемоізації** — експоненційна.
7. **Порівняння за кодовими одиницями замість кодових точок** — емодзі й діакритика (`[...s]`, нормалізація `NFC`).
8. **Порівняння відстаней рядків різної довжини без нормалізації** — для «схожості» діліть на довжину.

## 10. Алгоритм (стисло)

1. `dp[i][0] = i`, `dp[0][j] = j`.
2. `dp[i][j] = dp[i−1][j−1]`, якщо символи збігаються, інакше `1 + min(заміна, видалення, вставка)`.
3. Відповідь `dp[n][m]`; відновлення — рух назад по мінімальних сусідах.
4. Час `O(n·m)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яка відстань Левенштейна між `'kitten'` і `'sitting'`?

```js
editDistance('kitten', 'sitting')
```

**2.** Які операції виконує `editScript('kitten', 'sitting')`?

```js
editScript('kitten', 'sitting')
```

**3.** Яка таблиця `editTable('ab', 'b')`?

```js
editTable('ab', 'b')
```

**4.** Яка відстань між порожнім рядком і `'abc'`?

```js
[editDistance('', 'abc'), editDistance('abc', '')]
```

**5.** Яка відстань між однаковими рядками?

```js
editDistance('hello', 'hello')
```

**6.** Яка відстань між `'horse'` і `'ros'`?

```js
editDistance('horse', 'ros')
```

**7.** Яка відстань між `'intention'` і `'execution'`?

```js
editDistance('intention', 'execution')
```

**8.** Яка відстань між `'sunday'` і `'saturday'`?

```js
editDistance('sunday', 'saturday')
```

**9.** Чи симетрична відстань: порівняйте `d('abc', 'yabd')` і `d('yabd', 'abc')`.

```js
[editDistance('abc', 'yabd'), editDistance('yabd', 'abc')]
```

**10.** Яка нижня межа `|len(a) − len(b)|` і верхня `max(len)` для `'abc'` та `'xyzwv'`? Яка фактична відстань?

```js
[Math.abs(3 - 5), 5, editDistance('abc', 'xyzwv')]
```

**11.** Чи збігаються `editDistance`, `editDistanceTwoRows` та `editDistanceRecursive` на 40 «псевдовипадкових» парах рядків довжини 6?

```js
(() => { let ok = true; for (let t = 1; t <= 40; t++) { const mkS = (s) => Array.from({ length: 6 }, (_, i) => 'abc'[(s * 5 + i * i * 3 + i * s) % 3]).join(''); const a = mkS(t), b = mkS(t * 2 + 3); const d = editDistance(a, b); if (d !== editDistanceTwoRows(a, b) || d !== editDistanceRecursive(a, b)) ok = false; } return ok; })()
```

**12.** Скільки станів у таблиці для `'abcdefg'` і `'gfedcba'`?

```js
countCells('abcdefg', 'gfedcba')
```

**13.** Яка відстань `'ca'` → `'ac'` за Левенштейном і за Дамерау?

```js
[editDistance('ca', 'ac'), damerauLevenshtein('ca', 'ac')]
```

### Рівень 2. Робота алгоритму

**14.** Яка відстань Дамерау між `'abcdef'` і `'abdcef'`?

```js
[editDistance('abcdef', 'abdcef'), damerauLevenshtein('abcdef', 'abdcef')]
```

**15.** Яка вага `weightedEdit('kitten', 'sitting', 1, 1, 2)` (заміна коштує 2)?

```js
weightedEdit('kitten', 'sitting', 1, 1, 2)
```

**16.** А `weightedEdit('kitten', 'sitting', 1, 1, 1)`?

```js
weightedEdit('kitten', 'sitting', 1, 1, 1)
```

**17.** Що поверне `weightedEdit('abc', 'abd', 5, 5, 1)`?

```js
weightedEdit('abc', 'abd', 5, 5, 1)
```

**18.** Яка відстань Хемінга між `'karolin'` та `'kathrin'`?

```js
hamming('karolin', 'kathrin')
```

**19.** Що поверне `hamming('abc', 'ab')` (різна довжина)?

```js
hamming('abc', 'ab')
```

**20.** Яке слово найближче до `'speling'` у `['spelling', 'spieling', 'sapling']`?

```js
closestWord('speling', ['spelling', 'spieling', 'sapling'])
```

**21.** Яке слово найближче до `'helo'` у `['hello', 'help', 'halo', 'hero']`?

```js
closestWord('helo', ['hello', 'help', 'halo', 'hero'])
```

**22.** Що поверне `withinK('flaw', 'lawn', 2)` та `withinK('flaw', 'lawn', 1)`?

```js
[withinK('flaw', 'lawn', 2), withinK('flaw', 'lawn', 1)]
```

**23.** Що поверне `oneEditApart('pale', 'ple')`, `('pale', 'bale')`, `('pale', 'bake')`, `('pale', 'pale')`?

```js
[oneEditApart('pale', 'ple'), oneEditApart('pale', 'bale'), oneEditApart('pale', 'bake'), oneEditApart('pale', 'pale')]
```

**24.** Яка схожість `similarity('kitten', 'sitting')`?

```js
similarity('kitten', 'sitting')
```

**25.** Яка схожість двох порожніх рядків?

```js
similarity('', '')
```

**26.** Яка відстань між `'abc'` та `'def'` (усі заміни)?

```js
editDistance('abc', 'def')
```

### Рівень 3. Складність і нюанси

**27.** Яка відстань між `'a'.repeat(10)` та `'a'.repeat(7)`?

```js
editDistance('a'.repeat(10), 'a'.repeat(7))
```

**28.** Яка відстань між `'abcd'` та `'dcba'`?

```js
editDistance('abcd', 'dcba')
```

**29.** Яка відстань і який скрипт перетворення `'a'` на `'b'`?

```js
[editDistance('a', 'b'), editScript('a', 'b')]
```

**30.** Напишіть `minDistanceDeleteInsert(a, b)` — мінімум операцій видалення/вставки (без заміни), використовуючи `lcsLength`-подібне ДП: `n + m − 2·LCS`.

**31.** Напишіть `approximateSubstringDistance(pattern, text)` — мінімальна відстань між шаблоном і будь-яким підрядком тексту (перший рядок ДП нулі, мінімум по останньому рядку).

**32.** Напишіть `editDistanceBanded(a, b, k)` — відстань, якщо вона `≤ k`, інакше `k + 1` (обмежте обчислення смугою `|i − j| ≤ k`).

**33.** Напишіть `autocorrect(word, dict, maxDist)` — слова словника на відстані `≤ maxDist`, відсортовані за відстанню, потім за алфавітом.

**34.** Напишіть `isOneEditDistanceLeetCode(s, t)` — чи рівно одна правка (вставка/видалення/заміна), використовуючи `editDistance`.

**35.** Напишіть `wordLadderEditNeighbors(word, dict)` — слова словника на відстані рівно 1 від `word`.

**36.** Напишіть `levenshteinMatrixDiagonal(a, b)` — значення на головній діагоналі таблиці (`dp[i][i]` для `i ≤ min(n, m)`).

**37.** Напишіть `stringsWithinDistance(a, list, k)` — кількість рядків зі `list`, що відрізняються від `a` не більше ніж на `k`.

**38.** Напишіть `longestCommonSubsequenceViaEdit(a, b)` — LCS через відстань без заміни: `(n + m − d)/2` (де `d` — відстань видалення/вставки).

**39.** Напишіть `transformationCost(a, b, ins, del, sub)` — вартість перетворення з довільними цінами (обгортка `weightedEdit`).

### Рівень 4. Задачі з інтерв'ю

**40.** Які операції дозволені у відстані Левенштейна і чому їх три?

**41.** Запишіть рекурентність відстані редагування.

**42.** Чому при збігу останніх символів достатньо `dp[i − 1][j − 1]`?

**43.** Як відновити послідовність операцій?

**44.** Чим відстань Дамерау—Левенштейна відрізняється від Левенштейна?

**45.** Чим відстань Хемінга відрізняється від Левенштейна?

**46.** Як зменшити пам'ять і час, якщо потрібно знати лише чи відстань `≤ k`?

**47.** Яка складність і які існують нижні межі?

**48.** Як використовують відстань редагування для виправлення правопису?

**49.** Як пов'язані LCS і відстань редагування?

**50.** Яка відстань між `'flaw'` та `'lawn'`?

```js
editDistance('flaw', 'lawn')
```

### Відповіді

1. `3`
2. `['заміна k→s', 'заміна e→i', 'вставити g']`
3. `'     · b\n·    0 1\na    1 1\nb    2 1'`
4. `[3, 3]`
5. `0`
6. `3`
7. `5`
8. `3`
9. `[2, 2]`
10. `[2, 5, 5]`
11. `true`
12. `64`
13. `[2, 1]`
14. `[2, 1]`
15. `5`
16. `3`
17. `1`
18. `3`
19. `-1`
20. `{ word: 'spelling', distance: 1 }`
21. `{ word: 'hello', distance: 1 }`
22. `[true, false]`
23. `[true, true, false, false]`
24. `0.571`
25. `1`
26. `3`
27. `3`
28. `4`
29. `[1, ['заміна a→b']]`
30. Приклад розв'язку:

   ```js
   function minDistanceDeleteInsert(a, b) {
     const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
     for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
     return a.length + b.length - 2 * dp[a.length][b.length];
   }
   ```

   Виклик `[minDistanceDeleteInsert('sea', 'eat'), minDistanceDeleteInsert('abc', 'abc')]` → `[2, 0]`

31. Приклад розв'язку:

   ```js
   function approximateSubstringDistance(p, t) {
     let prev = new Array(t.length + 1).fill(0);
     for (let i = 1; i <= p.length; i++) {
       const cur = [i];
       for (let j = 1; j <= t.length; j++) cur[j] = p[i - 1] === t[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
       prev = cur;
     }
     return Math.min(...prev);
   }
   ```

   Виклик `[approximateSubstringDistance('abc', 'xxabxcxx'), approximateSubstringDistance('abc', 'zzabczz'), approximateSubstringDistance('abc', '')]` → `[1, 0, 3]`

32. Приклад розв'язку:

   ```js
   function editDistanceBanded(a, b, k) {
     const n = a.length, m = b.length;
     if (Math.abs(n - m) > k) return k + 1;
     const INF = k + 1;
     let prev = Array.from({ length: m + 1 }, (_, j) => j <= k ? j : INF);
     for (let i = 1; i <= n; i++) {
       const cur = new Array(m + 1).fill(INF);
       if (i <= k) cur[0] = i;
       for (let j = Math.max(1, i - k); j <= Math.min(m, i + k); j++) {
         cur[j] = Math.min(INF, a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]));
       }
       prev = cur;
     }
     return Math.min(prev[m], INF);
   }
   ```

   Виклик `[editDistanceBanded('kitten', 'sitting', 3), editDistanceBanded('kitten', 'sitting', 2), editDistanceBanded('abc', 'abc', 0)]` → `[3, 3, 0]`

33. Приклад розв'язку:

   ```js
   function autocorrect(w, dict, k) {
     return dict.map(x => [editDistance(w, x), x]).filter(([d]) => d <= k).sort((p, q) => p[0] - q[0] || (p[1] < q[1] ? -1 : 1)).map(p => p[1]);
   }
   ```

   Виклик `autocorrect('speling', ['spelling', 'spieling', 'sapling', 'speaking', 'hello'], 2)` → `['spelling', 'spieling', 'sapling', 'speaking']`

34. Приклад розв'язку:

   ```js
   const isOneEditDistanceLeetCode = (s, t) => editDistance(s, t) === 1
   ```

   Виклик `[isOneEditDistanceLeetCode('ab', 'acb'), isOneEditDistanceLeetCode('', ''), isOneEditDistanceLeetCode('a', '')]` → `[true, false, true]`

35. Приклад розв'язку:

   ```js
   const wordLadderEditNeighbors = (w, dict) => dict.filter(x => editDistance(w, x) === 1)
   ```

   Виклик `wordLadderEditNeighbors('cat', ['cot', 'cut', 'dog', 'cart', 'at', 'cat'])` → `['cot', 'cut', 'cart', 'at']`

36. Приклад розв'язку:

   ```js
   function levenshteinMatrixDiagonal(a, b) {
     const dp = editTableData(a, b);
     const k = Math.min(a.length, b.length);
     return Array.from({ length: k + 1 }, (_, i) => dp[i][i]);
   }
   ```

   Виклик `levenshteinMatrixDiagonal('kitten', 'sitting')` → `[0, 1, 1, 1, 1, 2, 2]`

37. Приклад розв'язку:

   ```js
   const stringsWithinDistance = (a, list, k) => list.filter(x => editDistance(a, x) <= k).length
   ```

   Виклик `stringsWithinDistance('book', ['back', 'boot', 'cook', 'look', 'bake'], 1)` → `3`

38. Приклад розв'язку:

   ```js
   function longestCommonSubsequenceViaEdit(a, b) {
     const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
     for (let i = 0; i <= a.length; i++) for (let j = 0; j <= b.length; j++) dp[i][j] = i === 0 ? j : j === 0 ? i : a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1]);
     return (a.length + b.length - dp[a.length][b.length]) / 2;
   }
   ```

   Виклик `[longestCommonSubsequenceViaEdit('ABCBDAB', 'BDCABA'), longestCommonSubsequenceViaEdit('abc', 'def')]` → `[4, 0]`

39. Приклад розв'язку:

   ```js
   const transformationCost = (a, b, i, d, s) => weightedEdit(a, b, i, d, s)
   ```

   Виклик `[transformationCost('intention', 'execution', 1, 1, 2), transformationCost('', 'ab', 3, 1, 1)]` → `[8, 6]`

40. Вставка, видалення і заміна символа (кожна вартістю 1). Усі три потрібні для повного перетворення: вставки й видалення змінюють довжину, заміна — вміст без зміни довжини. Видалення та вставка симетричні, тому відстань симетрична.
41. `dp[i][j] = dp[i − 1][j − 1]`, якщо `a[i − 1] = b[j − 1]`; інакше `1 + min(dp[i − 1][j − 1], dp[i − 1][j], dp[i][j − 1])` (заміна, видалення, вставка). База: `dp[i][0] = i`, `dp[0][j] = j`.
42. Якщо символи збігаються, оптимальна послідовність правок може залишити їх без змін; будь-яка інша послідовність не краща, бо відстань не спадає більше ніж на 1 при додаванні символа до одного з рядків, а `dp[i − 1][j − 1]` не перевищує жодного із сусідів плюс 1.
43. Від `(n, m)` рухатись назад: якщо `dp[i][j]` дорівнює діагональному значенню (збіг) або діагональному + 1 (заміна), іти діагоналлю; якщо `dp[i − 1][j] + 1` — видалення; якщо `dp[i][j − 1] + 1` — вставка. Результат розвернути.
44. Вона додає операцію транспозиції двох сусідніх символів з вартістю 1, що відображає типові опечатки: `'ca' → 'ac'` має відстань 2 за Левенштейном і 1 за Дамерау.
45. Хемінг визначений лише для рядків однакової довжини й рахує позиції, що відрізняються (тільки заміни). Левенштейн допускає вставки та видалення, тож і працює для рядків різної довжини, і зазвичай не перевищує Хемінга.
46. Обчислювати лише смугу `|i − j| ≤ k` навколо діагоналі: `O(n·k)` часу й `O(k)` пам'яті; якщо `|n − m| > k`, відповідь негативна одразу.
47. Класичне ДП `O(n·m)`. Для загального випадку підквадратичного алгоритму `O(n^{2−ε})` не існує за гіпотезою SETH; тому практичні прискорення — бітові паралелізми й смуги.
48. Для слова з помилкою шукають у словнику слова з найменшою відстанню (або в межах `k`), часто з попередньою фільтрацією за довжиною, n-грамами чи BK-деревом, щоб не рахувати відстань до всього словника.
49. Якщо дозволити лише вставки та видалення (без заміни), відстань дорівнює `n + m − 2·LCS`. Заміна дозволяє «зекономити» одну пару видалення+вставка і робить відстань меншою або рівною цьому значенню.
50. `2`
