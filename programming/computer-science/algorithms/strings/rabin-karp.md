# Rabin–Karp — алгоритм Рабіна—Карпа

Рабін—Карп шукає шаблон `P` (довжина `m`) у тексті `T` (довжина `n`), порівнюючи не самі підрядки, а їхні **хеші**. Ключова ідея — **рухомий (rolling) хеш**: хеш вікна `T[i+1..i+m]` обчислюється з хеша вікна `T[i..i+m−1]` за `O(1)` — «викинути» старий символ, «додати» новий. Збіг хешів означає *можливе* входження, яке підтверджується прямим порівнянням. У середньому `O(n + m)`, у гіршому — `O(n·m)` (багато колізій). Головна перевага — природне узагальнення на **багато шаблонів**, 2D-пошук і задачі про повторення підрядків.

## 1. Ідея: хеш як число в системі числення

Розглянемо рядок як число в системі з основою `b` (наприклад, `b = 256` для байтів чи просто просте число):

`H(s) = s[0]·b^{m−1} + s[1]·b^{m−2} + … + s[m−1]` (mod `M`)

Це **поліноміальний хеш**. Він вкладається в арифметику за модулем простого `M`, щоб числа не росли.

### Рухоме оновлення

Нехай `H_i` — хеш вікна `T[i..i+m)`. Тоді:

`H_{i+1} = (H_i − T[i]·b^{m−1})·b + T[i+m]  (mod M)`

Віднімаємо внесок старшого символа, зсуваємо множенням на `b`, додаємо новий символ. Усі `n − m + 1` хешів — за `O(n)`.

Для `T = "abcde"`, `m = 3`: вікна `abc`, `bcd`, `cde` дають хеші `[1677554, 1694847, 1712140]` (за `b = 131`, `M = 1 000 000 007`).

## 2. Алгоритм

1. Обчислити `H(P)` і хеш першого вікна тексту; `pow = b^{m−1} mod M`.
2. Для кожного вікна: якщо `H_i = H(P)` — **перевірити** підрядок прямим порівнянням (щоб відсіяти колізії) і, якщо збіг, записати позицію.
3. Оновити хеш для наступного вікна.

`rabinKarp('abracadabra', 'abra').matches` = `[0, 7]`.

## 3. Колізії

Два різні рядки можуть мати однаковий хеш (**колізія**). Ймовірність колізії для випадкової пари при `M ≈ 10⁹` — `~10⁻⁹`; для `n` вікон очікувана кількість хибних спрацьовувань `≈ n/M`. Тому на практиці перевірка рідко потрібна, але **обов'язкова** для коректності.

Щоб побачити колізії, зменшимо модуль. Для псевдовипадкового тексту з 2000 символів (`pseudoText(2000)`) і шаблону `'aaaaa'`, якого в тексті немає, при `M = 101` отримуємо 49 хибних спрацьовувань із 1996 вікон (очікувано `n/M ≈ 20` — тут ще більше через структуру тексту), а при `M = 10⁹ + 7` — 0.

**Борони від колізій:**
- великий простий модуль (`10⁹ + 7`, `998 244 353`) і випадкова основа;
- **подвійний хеш** (два модулі, або два різні `b`): ймовірність `~10⁻¹⁸`;
- модуль `2⁶⁴` (переповнення) **небезпечний** — відомі рядки Туе—Морса дають масові колізії за будь-якої основи; використовуйте прості модулі.

## 4. Реалізація

```js
const BASE = 131;
const MOD = 1000000007;

function polyHash(s, base = BASE, mod = MOD) {
  let h = 0;
  for (const ch of s) h = (h * base + ch.charCodeAt(0)) % mod;
  return h;
}

function windowHashes(text, m, base = BASE, mod = MOD) {
  const res = [];
  if (m > text.length) return res;
  let pow = 1;
  for (let i = 1; i < m; i++) pow = (pow * base) % mod;
  let h = polyHash(text.slice(0, m), base, mod);
  res.push(h);
  for (let i = m; i < text.length; i++) {
    h = ((h - text.charCodeAt(i - m) * pow % mod + mod) * base + text.charCodeAt(i)) % mod;
    res.push(h);
  }
  return res;
}

function rabinKarp(text, pattern, base = BASE, mod = MOD) {
  const n = text.length;
  const m = pattern.length;
  const matches = [];
  let falsePositives = 0;
  let hashChecks = 0;
  if (m === 0 || m > n) return { matches, falsePositives, hashChecks };
  const target = polyHash(pattern, base, mod);
  const hashes = windowHashes(text, m, base, mod);
  for (let i = 0; i < hashes.length; i++) {
    hashChecks++;
    if (hashes[i] === target) {
      if (text.startsWith(pattern, i)) matches.push(i);
      else falsePositives++;
    }
  }
  return { matches, falsePositives, hashChecks };
}

function multiPatternSearch(text, patterns) {
  const m = patterns[0].length;
  const table = new Map();
  for (const p of patterns) {
    const h = polyHash(p);
    if (!table.has(h)) table.set(h, []);
    table.get(h).push(p);
  }
  const res = {};
  windowHashes(text, m).forEach((h, i) => {
    if (!table.has(h)) return;
    for (const p of table.get(h)) if (text.startsWith(p, i)) (res[p] ||= []).push(i);
  });
  return res;
}

function doubleHashSearch(text, pattern) {
  const m1 = 1000000007;
  const m2 = 998244353;
  const t1 = polyHash(pattern, 131, m1);
  const t2 = polyHash(pattern, 137, m2);
  const h1 = windowHashes(text, pattern.length, 131, m1);
  const h2 = windowHashes(text, pattern.length, 137, m2);
  const res = [];
  for (let i = 0; i < h1.length; i++) if (h1[i] === t1 && h2[i] === t2) res.push(i);
  return res;
}

function longestDuplicateSubstring(s) {
  const n = s.length;
  const findDup = (len) => {
    const seen = new Map();
    const hashes = windowHashes(s, len);
    for (let i = 0; i < hashes.length; i++) {
      const h = hashes[i];
      if (seen.has(h)) {
        for (const j of seen.get(h)) if (s.startsWith(s.slice(i, i + len), j)) return s.slice(i, i + len);
        seen.get(h).push(i);
      } else seen.set(h, [i]);
    }
    return null;
  };
  let lo = 1;
  let hi = n - 1;
  let best = '';
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const d = findDup(mid);
    if (d !== null) { best = d; lo = mid + 1; }
    else hi = mid - 1;
  }
  return best;
}

function countDistinctSubstringsOfLength(s, k) {
  const set = new Set();
  const hashes = windowHashes(s, k);
  for (let i = 0; i < hashes.length; i++) set.add(s.slice(i, i + k));
  return set.size;
}

function repeatedDnaSequences(s) {
  const seen = new Set();
  const rep = new Set();
  for (let i = 0; i + 10 <= s.length; i++) {
    const sub = s.slice(i, i + 10);
    if (seen.has(sub)) rep.add(sub);
    seen.add(sub);
  }
  return [...rep];
}

function search2D(grid, pattern) {
  const R = grid.length;
  const C = grid[0].length;
  const r = pattern.length;
  const c = pattern[0].length;
  const found = [];
  for (let i = 0; i + r <= R; i++) {
    for (let j = 0; j + c <= C; j++) {
      let ok = true;
      for (let a = 0; a < r && ok; a++) if (grid[i + a].slice(j, j + c) !== pattern[a]) ok = false;
      if (ok) found.push([i, j]);
    }
  }
  return found;
}

function areAnagramWindows(text, pattern) {
  const k = pattern.length;
  const sig = (s) => s.split('').sort().join('');
  const target = sig(pattern);
  const res = [];
  for (let i = 0; i + k <= text.length; i++) if (sig(text.slice(i, i + k)) === target) res.push(i);
  return res;
}

function plagiarismScore(a, b, k) {
  const ha = new Set(windowHashes(a, k));
  const hb = windowHashes(b, k);
  if (!hb.length) return 0;
  return +(hb.filter((h) => ha.has(h)).length / hb.length).toFixed(3);
}

function pseudoText(n) {
  return Array.from({ length: n }, (_, i) => 'abcdefghij'[(i * i * 7 + i * 13 + (i >> 3)) % 10]).join('');
}

function expectedFalsePositives(n, mod) {
  return +(n / mod).toFixed(6);
}
```

## 5. Складність

- **Передобробка:** `O(m)`.
- **Пошук:** `O(n)` обчислень хешів + (рідкісні) перевірки. У середньому `O(n + m)`.
- **Гірший випадок `O(n·m)`:** якщо хеш збігається майже на кожному вікні (поганий хеш або навмисно підібрані колізії), кожне спрацьовування вимагає прямого порівняння за `O(m)`. Те саме трапляється, коли шаблон справді входить у текст на кожній позиції (`aaaa…a` у `aaaa…a`) і потрібно повернути всі входження.
- **Пам'ять `O(1)`** для одного шаблону; `O(k)` для `k` шаблонів однакової довжини (хеш-таблиця).

| | KMP | Рабін—Карп |
|---|---|---|
| Гірший випадок | `O(n + m)` | `O(n·m)` |
| Середній | `O(n + m)` | `O(n + m)` |
| Багато шаблонів однакової довжини | `k` проходів | один прохід |
| 2D-пошук, підрядки довільної довжини | складно | природно |
| Детермінізм | так | залежить від хешу |

## 6. Застосування

- **Кілька шаблонів одночасно:** `multiPatternSearch('abracadabra', ['abra', 'cada', 'brac'])` = `{ abra: [0, 7], brac: [1], cada: [4] }`.
- **Подвійний хеш:** `doubleHashSearch('abracadabra', 'abra')` = `[0, 7]` — практично без колізій.
- **Найдовший повторюваний підрядок:** бінарний пошук за довжиною + множина хешів: `longestDuplicateSubstring('banana')` = `'ana'` (`ana`). Монотонність: якщо є дублікат довжини `L`, є й довжини `L − 1`.
- **Виявлення плагіату / дедуплікація** (k-грами, схожі файли): `plagiarismScore('the quick brown fox', 'a quick brown dog', 5)` = `0.692`.
- **Повторювані послідовності ДНК:** `repeatedDnaSequences('AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT')` = `['AAAAACCCCC', 'CCCCCAAAAA']`.
- **Підрахунок різних підрядків довжини `k`:** `countDistinctSubstringsOfLength('abcabc', 3)` = `3`.
- **2D-пошук (зображення):** хеші рядків прямокутника, потім хеш по стовпцях; `search2D(['abcd', 'xxcd', 'yyyy'], ['cd', 'cd'])` = `[[0, 2]]`.
- **Rsync, git-подібні системи:** rolling-хеш для знаходження збігів блоків.
- **Хеш-порівняння підрядків за `O(1)`** з префіксними хешами: `H(l, r) = pre[r] − pre[l]·b^{r−l}`.

## 7. Типові помилки

1. **Не перевіряти збіг при співпадінні хешів** — хибні відповіді.
2. **Від'ємний залишок** при `h − c·pow`: додавайте `mod` перед `%`.
3. **Переповнення числа:** у JS добуток двох чисел ~`10⁹` перевищує `2⁵³`; тримайте `base` малим або використовуйте `BigInt`/розбиття множення.
4. **Модуль `2⁶⁴`** (природне переповнення) — вразливий до атак Туе—Морса.
5. **Нульове значення символа** (`'\0'`) — хеш не відрізняє `"a"` та `"\0a"`; використовуйте коди ≥ 1.
6. **Однакові основа й модуль для всіх запусків** — на олімпіадах/в продакшені їх підбирають випадково.
7. **Шаблони різної довжини в мультипошуку** — потрібна окрема таблиця для кожної довжини.
8. **Порівняння хешів `float`** — використовуйте цілі.

## 8. Алгоритм (стисло)

1. `h(P)`, `h(T[0..m))`, `pow = b^{m−1}`.
2. Для кожного вікна: якщо `h` збігся — прямо порівняти.
3. `h = (h − T[i]·pow)·b + T[i+m]` (mod `M`).
4. Час `O(n + m)` у середньому, `O(n·m)` у гіршому.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Який хеш має `polyHash('abc')` при основі 131 і модулі `1e9 + 7`?

```js
polyHash('abc')
```

**2.** Чи збігається `polyHash('abc')` з `(97·131² + 98·131 + 99) mod (1e9 + 7)`?

```js
[polyHash('abc'), (97 * 131 * 131 + 98 * 131 + 99) % 1000000007]
```

**3.** Які хеші вікон довжини 3 для `'abcde'`?

```js
windowHashes('abcde', 3)
```

**4.** Чи збігається останній хеш вікна з прямим `polyHash` відповідного підрядка?

```js
(() => { const t = 'abracadabra'; const h = windowHashes(t, 4); return h.every((x, i) => x === polyHash(t.slice(i, i + 4))); })()
```

**5.** Що поверне `windowHashes('ab', 3)` (шаблон довший за текст)?

```js
windowHashes('ab', 3)
```

**6.** Які входження знайде `rabinKarp('abracadabra', 'abra')`?

```js
rabinKarp('abracadabra', 'abra')
```

**7.** Що поверне `rabinKarp('abc', '')` та `rabinKarp('', 'a')`?

```js
[rabinKarp('abc', '').matches, rabinKarp('', 'a').matches]
```

**8.** Що поверне `rabinKarp('aaaaa', 'aa').matches`?

```js
rabinKarp('aaaaa', 'aa').matches
```

**9.** Скільки хибних спрацьовувань при модулі 101: `rabinKarp(pseudoText(2000), 'aaaaa', 131, 101)`?

```js
(() => { const r = rabinKarp(pseudoText(2000), 'aaaaa', 131, 101); return { входжень: r.matches.length, хибних: r.falsePositives }; })()
```

**10.** А при модулі `1e9 + 7` для тих самих даних?

```js
(() => { const r = rabinKarp(pseudoText(2000), 'aaaaa'); return { входжень: r.matches.length, хибних: r.falsePositives }; })()
```

**11.** Скільки перевірок хешів робить алгоритм для тексту довжини 1000 і шаблону 10?

```js
rabinKarp('a'.repeat(1000), 'b'.repeat(10)).hashChecks
```

**12.** Чи збігаються `rabinKarp` і `naiveSearch` (через `startsWith`) на 50 псевдовипадкових парах?

```js
(() => { let ok = true; for (let t = 1; t <= 50; t++) { const T = Array.from({ length: 30 }, (_, i) => 'abc'[(t * 3 + i * i + i * t) % 3]).join(''); const P = Array.from({ length: 3 }, (_, i) => 'abc'[(t + i * 5) % 3]).join(''); const naive = []; for (let i = 0; i + 3 <= T.length; i++) if (T.startsWith(P, i)) naive.push(i); if (JSON.stringify(rabinKarp(T, P).matches) !== JSON.stringify(naive)) ok = false; } return ok; })()
```

**13.** Що поверне `multiPatternSearch('abracadabra', ['abra', 'cada', 'brac'])`?

```js
multiPatternSearch('abracadabra', ['abra', 'cada', 'brac'])
```

### Рівень 2. Робота алгоритму

**14.** Що поверне `doubleHashSearch('abracadabra', 'abra')`?

```js
doubleHashSearch('abracadabra', 'abra')
```

**15.** Що поверне `longestDuplicateSubstring('banana')` та `('abcd')`?

```js
[longestDuplicateSubstring('banana'), longestDuplicateSubstring('abcd')]
```

**16.** А `longestDuplicateSubstring('aaaaa')`?

```js
longestDuplicateSubstring('aaaaa')
```

**17.** Скільки різних підрядків довжини 3 у `'abcabc'`?

```js
countDistinctSubstringsOfLength('abcabc', 3)
```

**18.** Які повторювані 10-мери в `'AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT'`?

```js
repeatedDnaSequences('AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT')
```

**19.** Де `search2D` знайде `['cd', 'cd']` у сітці `['abcd', 'xxcd', 'yyyy']`?

```js
search2D(['abcd', 'xxcd', 'yyyy'], ['cd', 'cd'])
```

**20.** Які позиції анаграм `'abc'` у `'cbaebabacd'` (через сортування вікон)?

```js
areAnagramWindows('cbaebabacd', 'abc')
```

**21.** Який `plagiarismScore('the quick brown fox', 'a quick brown dog', 5)`?

```js
plagiarismScore('the quick brown fox', 'a quick brown dog', 5)
```

**22.** Який `plagiarismScore` для однакових текстів?

```js
plagiarismScore('hello world', 'hello world', 4)
```

**23.** Скільки хибних спрацьовувань очікується для `n = 10⁶` вікон при `M = 10⁹ + 7` і при `M = 101`?

```js
[expectedFalsePositives(1e6, 1000000007), expectedFalsePositives(1e6, 101)]
```

**24.** Скільки різних значень хешу можливі при `M = 101`?

```js
101
```

**25.** Яка ймовірність хибного спрацьовування двох незалежних хешів із модулями `1e9 + 7` і `998244353`? (добуток; округліть експоненціально)

```js
((1 / 1000000007) * (1 / 998244353)).toExponential(2)
```

**26.** Чи відрізняє `polyHash` рядки `'ab'` та `'ba'`?

```js
[polyHash('ab'), polyHash('ba')]
```

### Рівень 3. Складність і нюанси

**27.** Яке значення `pow = b^{m−1} mod M` для `b = 131`, `m = 4`, `M = 1e9 + 7`?

```js
(() => { let p = 1; for (let i = 1; i < 4; i++) p = (p * 131) % 1000000007; return p; })()
```

**28.** Що станеться, якщо забути `+ mod` при від'ємному залишку? Змоделюйте: `(5 - 10) % 7` проти `(5 - 10 + 7) % 7`.

```js
[(5 - 10) % 7, (5 - 10 + 7) % 7]
```

**29.** Напишіть `prefixHashes(s)` та `substringHash(pre, pows, l, r)` — хеш підрядка `s[l..r)` за `O(1)`; поверніть хеш `'bcd'` із `'abcde'` і порівняйте з `polyHash('bcd')`.

**30.** Напишіть `isSubstringHash(text, pattern)` — чи є шаблон підрядком (через `rabinKarp`).

**31.** Напишіть `commonSubstringOfLength(a, b, k)` — чи мають рядки спільний підрядок довжини `k` (множина хешів + перевірка).

**32.** Напишіть `longestCommonSubstringHash(a, b)` — довжину найдовшого спільного підрядка бінарним пошуком + `commonSubstringOfLength`.

**33.** Напишіть `countPatternOccurrencesMany(text, patterns)` — загальну кількість входжень усіх шаблонів однакової довжини.

**34.** Напишіть `isPalindromeByHash(s)` — паліндромність через порівняння прямого та зворотного хешів (з подальшою перевіркою).

**35.** Напишіть `rollingSumWindows(a, k)` — приклад рухомого вікна числових сум (за аналогією з хешем): `sum_{i+1} = sum_i − a[i] + a[i + k]`.

**36.** Напишіть `findRepeatedBlocks(s, k)` — повторювані блоки довжини `k` (як множина) через множину хешів і перевірку.

**37.** Напишіть `rollingHashWithBigInt(s, base, mod)` — той самий хеш на `BigInt` для великих модулів (повертає `BigInt` як рядок).

**38.** Яка ідея Рабіна—Карпа?

**39.** Навіщо потрібен модуль у поліноміальному хеші і чому він має бути простим?

### Рівень 4. Задачі з інтерв'ю

**40.** Чому після збігу хешів потрібна перевірка символів?

**41.** У яких випадках Рабін—Карп деградує до `O(n·m)`?

**42.** Чому Рабін—Карп зручний для багатьох шаблонів?

**43.** Як знайти найдовший повторюваний підрядок за допомогою хешів?

**44.** Що таке подвійний хеш і навіщо він?

**45.** Чому модуль `2^64` небезпечний?

**46.** Як обчислити хеш будь-якого підрядка за `O(1)`?

**47.** Чим Рабін—Карп відрізняється від KMP за гарантіями?

**48.** Скільки вікон довжини 5 у тексті довжини 12?

```js
windowHashes('abcdefghijkl', 5).length
```

**49.** Чи однакові хеші вікон `'abc'` та `'abc'` з різних позицій у `'abcxabc'`?

```js
(() => { const h = windowHashes('abcxabc', 3); return h[0] === h[4]; })()
```

**50.** Що поверне `rabinKarp('abcabc', 'cab').matches`?

```js
rabinKarp('abcabc', 'cab').matches
```

### Відповіді

1. `1677554`
2. `[1677554, 1677554]`
3. `[1677554, 1694847, 1712140]`
4. `true`
5. `[]`
6. `{ matches: [0, 7], falsePositives: 0, hashChecks: 8 }`
7. `[[], []]`
8. `[0, 1, 2, 3]`
9. `{ 'входжень': 0, 'хибних': 49 }`
10. `{ 'входжень': 0, 'хибних': 0 }`
11. `991`
12. `true`
13. `{ abra: [0, 7], brac: [1], cada: [4] }`
14. `[0, 7]`
15. `['ana', '']`
16. `'aaaa'`
17. `3`
18. `['AAAAACCCCC', 'CCCCCAAAAA']`
19. `[[0, 2]]`
20. `[0, 6]`
21. `0.692`
22. `1`
23. `[0.001, 9900.990099]`
24. `101`
25. `'1.00e-18'`
26. `[12805, 12935]`
27. `2248091`
28. `[-5, 2]`
29. Приклад розв'язку:

   ```js
   function prefixHashes(s) {
     const pre = [0], pows = [1];
     for (let i = 0; i < s.length; i++) {
       pre.push((pre[i] * BASE + s.charCodeAt(i)) % MOD);
       pows.push((pows[i] * BASE) % MOD);
     }
     return { pre, pows };
   }
   function substringHash(p, l, r) {
     return ((p.pre[r] - p.pre[l] * p.pows[r - l]) % MOD + MOD) % MOD;
   }
   ```

   Виклик `(() => { const p = prefixHashes('abcde'); return [substringHash(p, 1, 4), polyHash('bcd')]; })()` → `[1694847, 1694847]`

30. Приклад розв'язку:

   ```js
   const isSubstringHash = (t, p) => rabinKarp(t, p).matches.length > 0
   ```

   Виклик `[isSubstringHash('hello world', 'o w'), isSubstringHash('hello', 'xyz')]` → `[true, false]`

31. Приклад розв'язку:

   ```js
   function commonSubstringOfLength(a, b, k) {
     const set = new Map();
     windowHashes(a, k).forEach((h, i) => { if (!set.has(h)) set.set(h, []); set.get(h).push(i); });
     return windowHashes(b, k).some((h, j) => set.has(h) && set.get(h).some(i => a.slice(i, i + k) === b.slice(j, j + k)));
   }
   ```

   Виклик `[commonSubstringOfLength('abcdef', 'xcdez', 3), commonSubstringOfLength('abcdef', 'xcdez', 2), commonSubstringOfLength('abc', 'xyz', 1)]` → `[true, true, false]`

32. Приклад розв'язку:

   ```js
   function longestCommonSubstringHash(a, b) {
     let lo = 0, hi = Math.min(a.length, b.length);
     while (lo < hi) {
       const mid = (lo + hi + 1) >> 1;
       if (commonSubstringOfLength(a, b, mid)) lo = mid;
       else hi = mid - 1;
     }
     return lo;
   }
   function commonSubstringOfLength(a, b, k) {
     const set = new Map();
     windowHashes(a, k).forEach((h, i) => { if (!set.has(h)) set.set(h, []); set.get(h).push(i); });
     return windowHashes(b, k).some((h, j) => set.has(h) && set.get(h).some(i => a.slice(i, i + k) === b.slice(j, j + k)));
   }
   ```

   Виклик `[longestCommonSubstringHash('ABABC', 'BABCA'), longestCommonSubstringHash('abc', 'xyz')]` → `[4, 0]`

33. Приклад розв'язку:

   ```js
   function countPatternOccurrencesMany(t, ps) {
     const r = multiPatternSearch(t, ps);
     return Object.values(r).reduce((s, a) => s + a.length, 0);
   }
   ```

   Виклик `[countPatternOccurrencesMany('abracadabra', ['abra', 'cada']), countPatternOccurrencesMany('aaaa', ['aa', 'aa'])]` → `[3, 6]`

34. Приклад розв'язку:

   ```js
   function isPalindromeByHash(s) {
     const rev = s.split('').reverse().join('');
     return polyHash(s) === polyHash(rev) && s === rev;
   }
   ```

   Виклик `[isPalindromeByHash('racecar'), isPalindromeByHash('abca'), isPalindromeByHash('')]` → `[true, false, true]`

35. Приклад розв'язку:

   ```js
   function rollingSumWindows(a, k) {
     let s = a.slice(0, k).reduce((x, y) => x + y, 0);
     const out = [s];
     for (let i = k; i < a.length; i++) {
       s += a[i] - a[i - k];
       out.push(s);
     }
     return out;
   }
   ```

   Виклик `rollingSumWindows([1, 2, 3, 4, 5], 3)` → `[6, 9, 12]`

36. Приклад розв'язку:

   ```js
   function findRepeatedBlocks(s, k) {
     const seen = new Map(), rep = new Set();
     windowHashes(s, k).forEach((h, i) => { const sub = s.slice(i, i + k); if (seen.has(h) && seen.get(h).includes(sub)) rep.add(sub); if (!seen.has(h)) seen.set(h, []); seen.get(h).push(sub); });
     return [...rep];
   }
   ```

   Виклик `findRepeatedBlocks('abababab', 2)` → `['ab', 'ba']`

37. Приклад розв'язку:

   ```js
   function rollingHashWithBigInt(s, base, mod) {
     let h = 0n;
     const b = BigInt(base), m = BigInt(mod);
     for (const ch of s) h = (h * b + BigInt(ch.charCodeAt(0))) % m;
     return h.toString();
   }
   ```

   Виклик `rollingHashWithBigInt('abc', 131, '1000000000000000003')` → `'1677554'`

38. Порівнювати хеші замість підрядків. Хеш вікна тексту оновлюється за `O(1)` (прибрати старший символ, зсунути, додати новий), тож усі `n − m + 1` вікон обробляються за `O(n)`. Збіг хешів перевіряється прямим порівнянням.
39. Модуль утримує значення в межах машинного слова. Простий (і великий) модуль рівномірно розподіляє значення й зменшує ймовірність колізій; структурований модуль на кшталт `2^64` вразливий до спеціально підібраних рядків.
40. Різні рядки можуть мати однаковий хеш (колізія). Без перевірки алгоритм поверне хибні входження; перевірка гарантує коректність, а завдяки рідкості колізій практично не змінює середній час.
41. Коли хеш спрацьовує на більшості вікон: поганий вибір модуля/основи, навмисно підібрані колізії або коли шаблон справді входить на кожній позиції; кожна перевірка коштує `O(m)`.
42. Хеші всіх шаблонів однакової довжини складають у хеш-таблицю, і для кожного вікна тексту одним пошуком перевіряють, чи є такий хеш; це `O(n + Σm)` замість окремого проходу для кожного шаблону.
43. Бінарний пошук за довжиною `L`: для кожної довжини обчислюють хеші всіх підрядків довжини `L` і перевіряють на дублікати (з верифікацією). Монотонність (якщо є повтор довжини `L`, є і `L − 1`) дає `O(n log n)`.
44. Два незалежні хеші (різні модулі та/або основи): збігатись мають обидва. Ймовірність хибного збігу стає добутком ймовірностей (~10⁻¹⁸), тому верифікацію часто пропускають.
45. Переповнення беззнакового числа еквівалентне модулю `2^64`; для нього існують рядки Туе—Морса, що дають колізії незалежно від основи, і атакувальник може це використати.
46. Побудувати префіксні хеші `pre[i]` і степені основи `pows[i]`; тоді `H(l, r) = pre[r] − pre[l]·pows[r − l]` (mod `M`), що дозволяє порівнювати підрядки за `O(1)` після `O(n)` передобробки.
47. KMP детермінований і дає `O(n + m)` у найгіршому випадку. Рабін—Карп ймовірнісний: у середньому лінійний, але гірший випадок `O(n·m)`; зате простіше узагальнюється на багато шаблонів, 2D і задачі про повторення.
48. `8`
49. `true`
50. `[2]`
