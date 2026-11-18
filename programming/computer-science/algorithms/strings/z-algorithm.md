# Z-algorithm — Z-функція рядка

**Z-функція** рядка `S` (довжина `n`) — масив `z`, де `z[i]` — довжина **найдовшого спільного префікса** рядка `S` і його суфікса `S[i..]`. Інакше: скільки символів, починаючи з позиції `i`, збігається з початком рядка. Z-алгоритм обчислює весь масив за `O(n)`. Він еквівалентний за можливостями [префікс-функції KMP](kmp.md), але для багатьох задач **простіший у використанні** та **інтуїтивніший**: пошук підрядка, періоди, підрахунок префіксів, стиснення рядків.

## 1. Визначення

Для `S = "aabcaabxaaz"`:

| `i` | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `S[i]` | a | a | b | c | a | a | b | x | a | a | z |
| `z[i]` | — | 1 | 0 | 0 | 3 | 1 | 0 | 0 | 2 | 1 | 0 |

Масив: `[11, 1, 0, 0, 3, 1, 0, 0, 2, 1, 0]` (за умовою `z[0] = n` або `0`; тут `z[0] = n`). `z[4] = 3`: суфікс `aabxaaz` починається з `aab`, що збігається з початком `aabcaab…`.

## 2. Наївне обчислення і чому воно повільне

Для кожного `i` порівнювати символи з початку: найгірший випадок `O(n²)` (рядок `aaaa…a`: `z[i] = n − i`). Z-алгоритм використовує вже обчислені значення.

## 3. Z-алгоритм: «Z-вікно» `[l, r)`

Тримаємо вікно `[l, r)` — найправіше з уже знайдених збігів із префіксом: `S[l..r)` дорівнює `S[0..r−l)`.

Для нового `i`:

1. Якщо `i < r` — ми **вже знаємо** частину збігу: `S[i..r)` збігається з `S[i−l..r−l)`, тому `z[i] ≥ min(z[i − l], r − i)`. Початкове значення: `z[i] = min(r − i, z[i − l])`.
2. Далі **розширюємо** посимвольно, поки `S[z[i]] = S[i + z[i]]`.
3. Якщо `i + z[i] > r` — оновлюємо вікно `[l, r) = [i, i + z[i])`.

**Чому лінійно:** `r` ніколи не зменшується. Кожне успішне розширення порівнянням збільшує `r`, тому сумарна кількість успішних порівнянь `≤ n`, плюс по одному невдалому на `i`. Разом `O(n)`.

**Чому коректно:** усередині вікна символи «дзеркальні», тож `z[i]` не менше, ніж у дзеркальної позиції `i − l`, обмежене краєм вікна. Якщо `z[i − l] < r − i`, розширення зупиниться миттєво (за межами вікна не буде збігу — перший символ порівняння вже відомо як невдалий); якщо `≥ r − i` — продовжуємо з `r`.

Трасування для `"aabcaabxaaz"`: - z[1] = 1, нове вікно [1, 2)
- z[2] = 0
- z[3] = 0, нове вікно [3, 3)
- z[4] = 3, нове вікно [4, 7)
- z[5] = 1 (початково 1 із вікна [4, 7))
- z[6] = 0
- z[7] = 0
- z[8] = 2, нове вікно [8, 10)
- z[9] = 1 (початково 1 із вікна [8, 10))
- z[10] = 0

## 4. Реалізація

```js
function zFunction(s) {
  const n = s.length;
  const z = new Array(n).fill(0);
  if (n === 0) return z;
  z[0] = n;
  let l = 0;
  let r = 0;
  for (let i = 1; i < n; i++) {
    if (i < r) z[i] = Math.min(r - i, z[i - l]);
    while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
    if (i + z[i] > r) { l = i; r = i + z[i]; }
  }
  return z;
}

function zTrace(s) {
  const n = s.length;
  const z = new Array(n).fill(0);
  const out = [];
  z[0] = n;
  let l = 0;
  let r = 0;
  for (let i = 1; i < n; i++) {
    const init = i < r ? Math.min(r - i, z[i - l]) : 0;
    z[i] = init;
    while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
    let note = 'z[' + i + '] = ' + z[i] + (init ? ' (початково ' + init + ' із вікна [' + l + ', ' + r + '))' : '');
    if (i + z[i] > r) { l = i; r = i + z[i]; note += ', нове вікно [' + l + ', ' + r + ')'; }
    out.push(note);
  }
  return out;
}

function zSearch(text, pattern) {
  if (pattern.length === 0) return [];
  const s = pattern + '\u0001' + text;
  const z = zFunction(s);
  const m = pattern.length;
  const res = [];
  for (let i = m + 1; i < s.length; i++) if (z[i] >= m) res.push(i - m - 1);
  return res;
}

function zNaive(s) {
  const n = s.length;
  const z = new Array(n).fill(0);
  if (n) z[0] = n;
  for (let i = 1; i < n; i++) {
    while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
  }
  return z;
}

function zNaiveComparisons(s) {
  let c = 0;
  for (let i = 1; i < s.length; i++) {
    let k = 0;
    while (i + k < s.length) {
      c++;
      if (s[k] !== s[i + k]) break;
      k++;
    }
  }
  return c;
}

function zComparisons(s) {
  const n = s.length;
  const z = new Array(n).fill(0);
  let c = 0;
  let l = 0;
  let r = 0;
  for (let i = 1; i < n; i++) {
    if (i < r) z[i] = Math.min(r - i, z[i - l]);
    while (i + z[i] < n) {
      c++;
      if (s[z[i]] !== s[i + z[i]]) break;
      z[i]++;
    }
    if (i + z[i] > r) { l = i; r = i + z[i]; }
  }
  return c;
}

function smallestPeriodZ(s) {
  const z = zFunction(s);
  const n = s.length;
  for (let p = 1; p < n; p++) if (n % p === 0 && z[p] === n - p) return p;
  return n;
}

function allPeriods(s) {
  const z = zFunction(s);
  const n = s.length;
  const res = [];
  for (let p = 1; p < n; p++) if (z[p] === n - p) res.push(p);
  res.push(n);
  return res;
}

function countPrefixOccurrencesZ(s) {
  const z = zFunction(s);
  const n = s.length;
  const cnt = new Array(n + 2).fill(0);
  for (let i = 0; i < n; i++) cnt[z[i]]++;
  for (let k = n - 1; k >= 1; k--) cnt[k] += cnt[k + 1];
  return cnt.slice(1, n + 1);
}

function distinctSubstringsCount(s) {
  let count = 0;
  let cur = '';
  for (const ch of s) {
    cur = ch + cur;
    const z = zFunction(cur);
    const mx = Math.max(0, ...z.slice(1));
    count += cur.length - mx;
  }
  return count;
}

function longestPrefixSuffix(s) {
  const z = zFunction(s);
  const n = s.length;
  let best = 0;
  for (let i = 1; i < n; i++) if (i + z[i] === n) { best = n - i; break; }
  return best;
}

function sumOfScores(s) {
  return zFunction(s).reduce((a, b) => a + b, 0);
}

function stringCompressionPieces(s) {
  const z = zFunction(s);
  const n = s.length;
  for (let p = 1; p <= n / 2; p++) if (n % p === 0 && z[p] === n - p) return { unit: s.slice(0, p), times: n / p };
  return { unit: s, times: 1 };
}

function isRotationZ(a, b) {
  if (a.length !== b.length) return false;
  return zSearch(a + a, b).length > 0;
}

function findAllPrefixMatchesInText(text, prefix) {
  return zSearch(text, prefix);
}

function lcpArrayWithZ(a, b) {
  const s = a + '\u0001' + b;
  return zFunction(s).slice(a.length + 1);
}

function prefixFunctionFromZ(s) {
  const z = zFunction(s);
  const n = s.length;
  const pi = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    for (let j = z[i] - 1; j >= 0 && pi[i + j] === 0; j--) pi[i + j] = j + 1;
  }
  return pi;
}
```

## 5. Пошук підрядка

Склеюємо `P + '#' + T` (символ-роздільник, якого немає в алфавіті) і обчислюємо `z`. Позиція `i` у частині тексту є входженням, якщо `z[i] ≥ m` (насправді `= m`, бо роздільник блокує подовження). `zSearch('abracadabra', 'abra')` = `[0, 7]`, `zSearch('aaaaa', 'aa')` = `[0, 1, 2, 3]`.

**Різниця з KMP.** KMP відповідає на «яка найдовша рамка закінчується тут?», Z-функція — «наскільки далеко збігається з початком від цієї позиції?». Одне виражається через інше за `O(n)`: `prefixFunctionFromZ('abacaba')` = `[0, 0, 1, 0, 1, 2, 3]`.

## 6. Застосування

- **Періоди й повтори:** `smallestPeriodZ('abcabcabc')` = `3`; усі періоди: `allPeriods('abcabcab')` = `[3, 6, 8]`; `stringCompressionPieces('ababab')` = `{ unit: 'ab', times: 3 }`.
- **Кількість входжень кожного префікса:** `countPrefixOccurrencesZ('abab')` = `[2, 2, 1, 1]`.
- **Сума Z-значень («оцінки» рядка):** `sumOfScores('babab')` = `9`.
- **Найдовший префікс, що є суфіксом (рамка):** `longestPrefixSuffix('abcdabc')` = `3`.
- **Спільні префікси двох рядків у кожній позиції:** `lcpArrayWithZ('abc', 'abcabd')` = `[3, 0, 0, 2, 0, 0]` (скільки символів кожен суфікс другого рядка збігається з початком першого).
- **Кількість різних підрядків** (за `O(n²)` Z-ом): `distinctSubstringsCount('abab')` = `7`. Ефективніше — суфіксний масив.
- **Циклічний зсув:** `isRotationZ('abcde', 'cdeab')` = `true`.
- **Стискання рядка, пошук повторюваних структур, перевірка «вкладеності»**.

## 7. Складність і порівняння

- **Час `O(n)`**, **пам'ять `O(n)`**.
- Для рядка `'a' × 2000` наївна Z-функція робить 1999000 порівнянь, Z-алгоритм — 1999.

| Алгоритм | Масив | Що дає |
|---|---|---|
| Префікс-функція | `π[i]` | найдовша рамка префікса `S[0..i]` |
| Z-функція | `z[i]` | спільний префікс з суфіксом `S[i..]` |
| Суфіксний масив | `SA`, `LCP` | порядок суфіксів, повторювані підрядки |

Z-функція та префікс-функція взаємно виражаються лінійно. Для пошуку й періодів вибір — питання смаку; для автоматів і «кроків відкату» зручніша префікс-функція, для «довжини збігу з початком» — Z.

## 8. Типові помилки

1. **`z[0]`:** домовленість — `n` (або `0`); не плутайте при підсумовуванні/використанні.
2. **Забути оновити вікно** `[l, r)` після розширення.
3. **Не обмежувати `z[i]` значенням `r − i`** при використанні дзеркального `z[i − l]`.
4. **Відсутність роздільника** при пошуку: `z` може перевищити `m` і давати хибні входження.
5. **Індекс у тексті:** `i − m − 1`, а не `i − m`.
6. **Порожній шаблон** обробляти окремо.
7. **Роздільник, що є в алфавіті** (наприклад, `#` у тексті) — використайте символ, якого точно немає.
8. **Плутанина між Z-функцією та префікс-функцією:** різні масиви.

## 9. Алгоритм (стисло)

1. `z[0] = n`, `l = r = 0`.
2. Для `i = 1..n − 1`: якщо `i < r` — `z[i] = min(r − i, z[i − l])`.
3. Розширювати `z[i]`, поки `s[z[i]] = s[i + z[i]]`.
4. Якщо `i + z[i] > r` — `l = i`, `r = i + z[i]`.
5. Час `O(n)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яка Z-функція `zFunction('aabcaabxaaz')`?

```js
zFunction('aabcaabxaaz')
```

**2.** Які кроки виконує `zTrace('aabcaabxaaz')`?

```js
zTrace('aabcaabxaaz')
```

**3.** Яка Z-функція `'aaaaa'` та `'abcde'`?

```js
[zFunction('aaaaa'), zFunction('abcde')]
```

**4.** Що поверне `zFunction('')` та `zFunction('a')`?

```js
[zFunction(''), zFunction('a')]
```

**5.** Яка Z-функція `'abababab'`?

```js
zFunction('abababab')
```

**6.** Чи збігаються `zFunction` і `zNaive` на 60 псевдовипадкових рядках довжини 12 з алфавіту `ab`?

```js
(() => { let ok = true; for (let t = 1; t <= 60; t++) { const s = Array.from({ length: 12 }, (_, i) => 'ab'[(t * 5 + i * i * 3 + i * t) % 2]).join(''); if (JSON.stringify(zFunction(s)) !== JSON.stringify(zNaive(s))) ok = false; } return ok; })()
```

**7.** Скільки порівнянь робить наївна Z-функція для `'a'.repeat(2000)` та Z-алгоритм?

```js
[zNaiveComparisons('a'.repeat(2000)), zComparisons('a'.repeat(2000))]
```

**8.** Скільки порівнянь для випадкового рядка з 2000 символів `(i*i*7 + i*13) % 26`?

```js
(() => { const s = Array.from({ length: 2000 }, (_, i) => String.fromCharCode(97 + (i * i * 7 + i * 13) % 26)).join(''); return [zNaiveComparisons(s), zComparisons(s)]; })()
```

**9.** Що поверне `zSearch('abracadabra', 'abra')`?

```js
zSearch('abracadabra', 'abra')
```

**10.** Що поверне `zSearch('aaaaa', 'aa')`?

```js
zSearch('aaaaa', 'aa')
```

**11.** Що поверне `zSearch('abc', 'abcd')`, `zSearch('abc', '')`, `zSearch('', 'a')`?

```js
[zSearch('abc', 'abcd'), zSearch('abc', ''), zSearch('', 'a')]
```

**12.** Який найменший період `'abcabcabc'`, `'abcab'`, `'aaaa'`?

```js
[smallestPeriodZ('abcabcabc'), smallestPeriodZ('abcab'), smallestPeriodZ('aaaa')]
```

**13.** Які всі періоди `'abcabcab'` та `'aaaa'`?

```js
[allPeriods('abcabcab'), allPeriods('aaaa')]
```

### Рівень 2. Робота алгоритму

**14.** Що поверне `stringCompressionPieces('ababab')` та `('abcd')`?

```js
[stringCompressionPieces('ababab'), stringCompressionPieces('abcd')]
```

**15.** Скільки разів кожен префікс `'abab'` зустрічається в рядку (`countPrefixOccurrencesZ`)?

```js
countPrefixOccurrencesZ('abab')
```

**16.** Яка сума оцінок `sumOfScores('babab')`?

```js
sumOfScores('babab')
```

**17.** Який найдовший префікс-суфікс `'abcdabc'` та `'abcd'`?

```js
[longestPrefixSuffix('abcdabc'), longestPrefixSuffix('abcd')]
```

**18.** Що поверне `lcpArrayWithZ('abc', 'abcabd')`?

```js
lcpArrayWithZ('abc', 'abcabd')
```

**19.** Скільки різних підрядків у `'abab'` та `'aaaa'`?

```js
[distinctSubstringsCount('abab'), distinctSubstringsCount('aaaa')]
```

**20.** Чи є `'cdeab'` циклічним зсувом `'abcde'`? А `'abced'`?

```js
[isRotationZ('abcde', 'cdeab'), isRotationZ('abcde', 'abced')]
```

**21.** Яка префікс-функція за Z для `'abacaba'`?

```js
prefixFunctionFromZ('abacaba')
```

**22.** Чи збігається `prefixFunctionFromZ` з прямою префікс-функцією для 'aabaaab'?

```js
prefixFunctionFromZ('aabaaab')
```

**23.** Яка Z-функція `'aabxaab'`?

```js
zFunction('aabxaab')
```

**24.** Що буде, якщо не додати роздільник: `zFunction('ab' + 'abab')` — чи може `z[i]` перевищити довжину шаблону 2?

```js
zFunction('ababab')
```

**25.** Скільки входжень шаблону `'ab'` у `'ababab'`?

```js
zSearch('ababab', 'ab').length
```

**26.** Яка Z-функція `'zzzazzzaz'`?

```js
zFunction('zzzazzzaz')
```

### Рівень 3. Складність і нюанси

**27.** Яке значення `z[4]` у `'aabcaabxaaz'` і який збіг воно описує?

```js
(() => { const s = 'aabcaabxaaz'; const z = zFunction(s); return [z[4], s.slice(4, 4 + z[4])]; })()
```

**28.** Скільки значень `z[i] = 0` у `'abcabcabc'`?

```js
zFunction('abcabcabc').slice(1).filter(x => x === 0).length
```

**29.** Напишіть `zBoundaryCheck(s)` — чи є в рядка нетривіальна рамка (префікс = суфікс).

**30.** Напишіть `countOccurrencesZ(text, pattern)` — кількість входжень через Z.

**31.** Напишіть `longestCommonPrefixWithText(text, pattern)` — найбільше `k`, для якого префікс шаблону довжини `k` збігається з підрядком тексту, що починається в будь-якій позиції (максимум Z у тексті, обмежений довжиною шаблону).

**32.** Напишіть `buildLps(s)` — префікс-функцію через Z (`prefixFunctionFromZ`) і перевірте на прямому обчисленні довжини останнього елемента.

**33.** Напишіть `minLengthToMakePalindromeZ(s)` — мінімум символів, які треба дописати спереду, щоб рядок став паліндромом (за Z на `s + '#' + reverse(s)`).

**34.** Напишіть `sumOfZValues(s)` без `z[0]` (сума `z[1..]`).

**35.** Напишіть `patternInfinite(a, b)` — чи є `b` підрядком нескінченного повторення `a` (достатньо `a` повторити так, щоб довжина ≥ `|b| + |a|`).

**36.** Напишіть `prefixMatchesAtEveryPosition(text, pattern)` — для кожної позиції `i` у тексті, скільки символів збігається з початком шаблону (масив довжини `|text|`, значення до `|pattern|`).

**37.** Напишіть `numberOfEqualSuffixPrefixLengths(s)` — довжини усіх рамок за Z (`i + z[i] = n` → рамка `n − i`), за зростанням.

**38.** Що означає `z[i]`?

**39.** Яка ідея Z-вікна `[l, r)`?

### Рівень 4. Задачі з інтерв'ю

**40.** Чому Z-алгоритм лінійний?

**41.** Як знайти шаблон у тексті за допомогою Z-функції?

**42.** Чим Z-функція відрізняється від префікс-функції?

**43.** Як знайти найменший період за допомогою Z?

**44.** Для чого потрібен роздільник між шаблоном і текстом?

**45.** Які практичні задачі зручно розв'язувати Z-функцією?

**46.** Чим Z-алгоритм поступається суфіксним структурам?

**47.** Чому `z[0]` умовно дорівнює `n` або `0`?

**48.** Яка Z-функція `'aaabaab'`?

```js
zFunction('aaabaab')
```

**49.** Яка Z-функція `'abcdabc'`?

```js
zFunction('abcdabc')
```

**50.** Яка Z-функція `'xyxyxy'`?

```js
zFunction('xyxyxy')
```

### Відповіді

1. `[11, 1, 0, 0, 3, 1, 0, 0, 2, 1, 0]`
2. `['z[1] = 1, нове вікно [1, 2)', 'z[2] = 0', 'z[3] = 0, нове вікно [3, 3)', 'z[4] = 3, нове вікно [4, 7)', 'z[5] = 1 (початково 1 із вікна [4, 7))', 'z[6] = 0', 'z[7] = 0', 'z[8] = 2, нове вікно [8, 10)', 'z[9] = 1 (початково 1 із вікна [8, 10))', 'z[10] = 0']`
3. `[[5, 4, 3, 2, 1], [5, 0, 0, 0, 0]]`
4. `[[], [1]]`
5. `[8, 0, 6, 0, 4, 0, 2, 0]`
6. `true`
7. `[1999000, 1999]`
8. `[154693, 3833]`
9. `[0, 7]`
10. `[0, 1, 2, 3]`
11. `[[], [], []]`
12. `[3, 5, 1]`
13. `[[3, 6, 8], [1, 2, 3, 4]]`
14. `[{ unit: 'ab', times: 3 }, { unit: 'abcd', times: 1 }]`
15. `[2, 2, 1, 1]`
16. `9`
17. `[3, 0]`
18. `[3, 0, 0, 2, 0, 0]`
19. `[7, 4]`
20. `[true, false]`
21. `[0, 0, 1, 0, 1, 2, 3]`
22. `[0, 1, 0, 1, 2, 2, 3]`
23. `[7, 1, 0, 0, 3, 1, 0]`
24. `[6, 0, 4, 0, 2, 0]`
25. `3`
26. `[9, 2, 1, 0, 5, 2, 1, 0, 1]`
27. `[3, 'aab']`
28. `6`
29. Приклад розв'язку:

   ```js
   const zBoundaryCheck = (s) => longestPrefixSuffix(s) > 0
   ```

   Виклик `[zBoundaryCheck('abcab'), zBoundaryCheck('abcd')]` → `[true, false]`

30. Приклад розв'язку:

   ```js
   const countOccurrencesZ = (t, p) => zSearch(t, p).length
   ```

   Виклик `[countOccurrencesZ('abababab', 'abab'), countOccurrencesZ('aaa', 'b')]` → `[3, 0]`

31. Приклад розв'язку:

   ```js
   function longestCommonPrefixWithText(t, p) {
     const z = lcpArrayWithZ(p, t);
     return Math.max(0, ...z.map(x => Math.min(x, p.length)));
   }
   ```

   Виклик `[longestCommonPrefixWithText('xxabcdxx', 'abcz'), longestCommonPrefixWithText('xyz', 'abc')]` → `[3, 0]`

32. Приклад розв'язку:

   ```js
   const buildLps = (s) => prefixFunctionFromZ(s)
   ```

   Виклик `[buildLps('abab'), buildLps('aaaa')]` → `[[0, 0, 1, 2], [0, 1, 2, 3]]`

33. Приклад розв'язку:

   ```js
   function minLengthToMakePalindromeZ(s) {
     const r = s.split('').reverse().join('');
     const t = s + '\u0001' + r;
     const z = zFunction(t);
     let best = 0;
     for (let i = s.length + 1; i < t.length; i++) if (i + z[i] === t.length) {
       best = z[i];
       break;
     }
     return s.length - best;
   }
   ```

   Виклик `[minLengthToMakePalindromeZ('aacecaaa'), minLengthToMakePalindromeZ('abcd'), minLengthToMakePalindromeZ('')]` → `[1, 3, 0]`

34. Приклад розв'язку:

   ```js
   const sumOfZValues = (s) => zFunction(s).slice(1).reduce((a, b) => a + b, 0)
   ```

   Виклик `[sumOfZValues('aabcaabxaaz'), sumOfZValues('aaaa')]` → `[8, 6]`

35. Приклад розв'язку:

   ```js
   function patternInfinite(a, b) {
     const rep = a.repeat(Math.ceil((b.length + a.length) / a.length) + 1);
     return zSearch(rep, b).length > 0;
   }
   ```

   Виклик `[patternInfinite('abc', 'cabca'), patternInfinite('abc', 'acb')]` → `[true, false]`

36. Приклад розв'язку:

   ```js
   const prefixMatchesAtEveryPosition = (t, p) => lcpArrayWithZ(p, t).map(x => Math.min(x, p.length))
   ```

   Виклик `prefixMatchesAtEveryPosition('abcabx', 'abcd')` → `[3, 0, 0, 2, 0, 0]`

37. Приклад розв'язку:

   ```js
   function numberOfEqualSuffixPrefixLengths(s) {
     const z = zFunction(s), n = s.length;
     const res = [];
     for (let i = 1; i < n; i++) if (i + z[i] === n) res.push(n - i);
     return res.sort((a, b) => a - b);
   }
   ```

   Виклик `[numberOfEqualSuffixPrefixLengths('abacaba'), numberOfEqualSuffixPrefixLengths('abcd')]` → `[[1, 3], []]`

38. Довжина найдовшого спільного префікса рядка `S` і його суфікса `S[i..]`, тобто скільки символів, починаючи з позиції `i`, збігається з початком рядка.
39. Тримаємо найправіший знайдений збіг із префіксом: `S[l..r)` дорівнює `S[0..r−l)`. Для `i` усередині вікна `z[i] ≥ min(z[i − l], r − i)` вже відомо; розширення продовжується лише за межі `r`, тому `r` не зменшується.
40. Кожне успішне порівняння при розширенні збільшує `r`, який лише зростає й не перевищує `n`, тому сумарна кількість успішних порівнянь `≤ n`; кожне `i` додає ще не більше одного невдалого порівняння.
41. Склеїти `P + роздільник + T` і обчислити Z. Входженням є позиція `i` у частині тексту з `z[i] = |P|`; роздільник гарантує, що `z[i] ≤ |P|`.
42. Z-функція дає довжину збігу суфікса з початком рядка (`z[i]` для позиції початку), префікс-функція — довжину найдовшої рамки префікса, що закінчується в позиції. Вони взаємно виражаються за `O(n)`.
43. Найменше `p`, яке ділить `n` і для якого `z[p] = n − p`: тоді рядок складається з повторів `S[0..p)`. Якщо такого `p` немає, період дорівнює `n`.
44. Щоб значення `z` не могли перейти межу й перевищити довжину шаблону: без роздільника збіг міг би продовжитись із шаблону в текст і дати хибні позиції.
45. Пошук підрядка, періоди й повтори, підрахунок входжень префіксів, найдовший префікс-суфікс, перевірка циклічного зсуву, підрахунок різних підрядків (повільно), задачі про стиснення та рамки.
46. Він працює з одним рядком і не відповідає на багато запитів про різні підрядки швидко: для таких задач (різні підрядки, LCP довільних суфіксів) використовують суфіксний масив чи автомат.
47. Весь рядок збігається з собою цілком, але в більшості застосувань ця клітинка виключається. Важливо тримати одне правило, щоб не спотворити суму Z-значень чи пошук.
48. `[7, 2, 1, 0, 2, 1, 0]`
49. `[7, 0, 0, 0, 3, 0, 0]`
50. `[6, 0, 4, 0, 2, 0]`
