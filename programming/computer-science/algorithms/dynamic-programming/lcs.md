# LCS — найдовша спільна підпослідовність

**Підпослідовність** рядка — це рядок, отриманий видаленням деяких (можливо, нуля) символів **без зміни порядку** решти. Для `"ABCBDAB"` підпослідовностями є `"ACD"`, `"BCB"`, `"BDAB"` (але не `"DCA"`). **Найдовша спільна підпослідовність (LCS)** двох рядків — найдовший рядок, що є підпослідовністю обох. Це серце `diff` (git, unified diff), порівняння версій файлів, порівняння геномів, виявлення плагіату. Задача розв'язується ДП за `O(n·m)`.

Не плутайте з **найдовшим спільним підрядком** (substring) — підрядок має бути неперервним.

## 1. Постановка і приклад

`X = "ABCBDAB"`, `Y = "BDCABA"`. LCS має довжину 4; одна з LCS — `'BCBA'`. Найдовших спільних підпослідовностей може бути кілька: `['BCAB', 'BCBA', 'BDAB']`.

## 2. ДП: стан і перехід

**Стан:** `dp[i][j]` — довжина LCS для префіксів `X[0..i)` і `Y[0..j)`.

**Перехід:** розглянемо останні символи префіксів `X[i − 1]` та `Y[j − 1]`:

- Якщо **збігаються** — вони обидва можуть бути останніми в LCS: `dp[i][j] = dp[i − 1][j − 1] + 1`.
- Інакше хоча б один із них **не** входить у LCS: `dp[i][j] = max(dp[i − 1][j], dp[i][j − 1])`.

**База:** `dp[0][j] = dp[i][0] = 0` (порожній рядок).

**Відповідь:** `dp[n][m]`. Час і пам'ять `O(n·m)`.

**Чому збіг — жадібно безпечний?** Якщо `X[i − 1] = Y[j − 1] = c`, то існує LCS, що закінчується на цей `c` (будь-яку LCS, яка його не використовує, можна подовжити або замінити, не зменшивши довжини). Тому вибір «взяти збіг» не втрачає оптимуму.

Таблиця для `X = "ABCBDAB"`, `Y = "BDCABA"`:

```text
    · B D C A B A
·   0 0 0 0 0 0 0
A   0 0 0 0 1 1 1
B   0 1 1 1 1 2 2
C   0 1 1 2 2 2 2
B   0 1 1 2 2 3 3
D   0 1 2 2 2 3 3
A   0 1 2 2 3 3 4
B   0 1 2 2 3 4 4
```

Рядки — префікси `X` (від порожнього), стовпці — префікси `Y`.

## 3. Відновлення самої LCS

Йдемо з `(n, m)` назад: якщо `X[i − 1] = Y[j − 1]` — символ входить у LCS, переходимо діагоналлю; інакше рухаємось у бік більшого з `dp[i − 1][j]`, `dp[i][j − 1]`. Символи збираються у зворотному порядку.

## 4. Оптимізація пам'яті

Рядок `i` залежить від рядка `i − 1`, тож достатньо двох рядків (довжини) — `O(min(n, m))` пам'яті, якщо потрібна лише довжина. Для відновлення рядка при стисненій пам'яті застосовують **алгоритм Гіршберга** (Hirschberg): ділить задачу навпіл, `O(n·m)` часу й `O(n + m)` пам'яті.

## 5. Реалізація

```js
function lcsTableData(x, y) {
  const n = x.length;
  const m = y.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function lcsLength(x, y) {
  return lcsTableData(x, y)[x.length][y.length];
}

function lcsTable(x, y) {
  const dp = lcsTableData(x, y);
  const header = '    ' + ['·', ...y].join(' ');
  return [header, ...dp.map((row, i) => (i === 0 ? '·' : x[i - 1]) + '   ' + row.join(' '))].join('\n');
}

function lcsString(x, y) {
  const dp = lcsTableData(x, y);
  let i = x.length;
  let j = y.length;
  const out = [];
  while (i > 0 && j > 0) {
    if (x[i - 1] === y[j - 1]) { out.push(x[i - 1]); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return out.reverse().join('');
}

function allLcs(x, y) {
  const dp = lcsTableData(x, y);
  const memo = new Map();
  const go = (i, j) => {
    const key = i + ',' + j;
    if (memo.has(key)) return memo.get(key);
    let res;
    if (i === 0 || j === 0) res = new Set(['']);
    else if (x[i - 1] === y[j - 1]) res = new Set([...go(i - 1, j - 1)].map((s) => s + x[i - 1]));
    else {
      res = new Set();
      if (dp[i - 1][j] >= dp[i][j - 1]) for (const s of go(i - 1, j)) res.add(s);
      if (dp[i][j - 1] >= dp[i - 1][j]) for (const s of go(i, j - 1)) res.add(s);
    }
    memo.set(key, res);
    return res;
  };
  return [...go(x.length, y.length)].sort();
}

function lcsTwoRows(x, y) {
  let prev = new Array(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    const cur = new Array(y.length + 1).fill(0);
    for (let j = 1; j <= y.length; j++) cur[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[y.length];
}

function lcsRecursive(x, y, i = x.length, j = y.length) {
  if (i === 0 || j === 0) return 0;
  if (x[i - 1] === y[j - 1]) return 1 + lcsRecursive(x, y, i - 1, j - 1);
  return Math.max(lcsRecursive(x, y, i - 1, j), lcsRecursive(x, y, i, j - 1));
}

function longestCommonSubstring(x, y) {
  let best = 0;
  let end = 0;
  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      if (x[i - 1] === y[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > best) { best = dp[i][j]; end = i; }
      }
    }
  }
  return x.slice(end - best, end);
}

function longestPalindromicSubsequence(s) {
  return lcsLength(s, s.split('').reverse().join(''));
}

function shortestCommonSupersequence(x, y) {
  const dp = lcsTableData(x, y);
  let i = x.length;
  let j = y.length;
  const out = [];
  while (i > 0 && j > 0) {
    if (x[i - 1] === y[j - 1]) { out.push(x[i - 1]); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) { out.push(x[i - 1]); i--; }
    else { out.push(y[j - 1]); j--; }
  }
  while (i > 0) out.push(x[--i]);
  while (j > 0) out.push(y[--j]);
  return out.reverse().join('');
}

function minDeletionsToEqual(x, y) {
  return x.length + y.length - 2 * lcsLength(x, y);
}

function diffLines(a, b) {
  const dp = lcsTableData(a, b);
  let i = a.length;
  let j = b.length;
  const out = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) { out.push('  ' + a[i - 1]); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) { out.push('+ ' + b[j - 1]); j--; }
    else { out.push('- ' + a[i - 1]); i--; }
  }
  return out.reverse();
}

function lcsOfThree(a, b, c) {
  const dp = Array.from({ length: a.length + 1 }, () => Array.from({ length: b.length + 1 }, () => new Array(c.length + 1).fill(0)));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) for (let k = 1; k <= c.length; k++) {
    dp[i][j][k] = a[i - 1] === b[j - 1] && b[j - 1] === c[k - 1]
      ? dp[i - 1][j - 1][k - 1] + 1
      : Math.max(dp[i - 1][j][k], dp[i][j - 1][k], dp[i][j][k - 1]);
  }
  return dp[a.length][b.length][c.length];
}

function isSubsequenceOf(s, t) {
  let i = 0;
  for (const ch of t) if (i < s.length && ch === s[i]) i++;
  return i === s.length;
}

function countCalls(x, y) {
  let calls = 0;
  const go = (i, j) => {
    calls++;
    if (i === 0 || j === 0) return 0;
    if (x[i - 1] === y[j - 1]) return 1 + go(i - 1, j - 1);
    return Math.max(go(i - 1, j), go(i, j - 1));
  };
  go(x.length, y.length);
  return calls;
}
```

## 6. Складність

- **Час `O(n·m)`**, пам'ять `O(n·m)` (відновлення) або `O(min(n, m))` (лише довжина).
- Наївна рекурсія без мемоізації — експоненційна: для `"ABCDEFGH"` і `"HGFEDCBA"` вона робить 6991 викликів проти `9·9 = 81` станів у ДП.
- Існують швидші алгоритми для особливих випадків: `O(n·L)` (Hunt–Szymanski, `L` — довжина LCS), бітове ДП `O(n·m / w)` (машинне слово `w`), Myers diff `O((n + m)·D)` (`D` — розмір різниці), саме його використовує git.
- Загальний випадок не прискорюється суттєво: нижня межа `O(n²)` за гіпотезою сильної експоненційної часової складності.

## 7. Споріднені задачі

- **Найдовший спільний підрядок:** `longestCommonSubstring('ABABC', 'BABCA')` = `'BABC'` — `dp[i][j]` скидається в 0 при незбігу, відповідь — максимум по таблиці.
- **Найдовша паліндромна підпослідовність:** LCS рядка зі своїм розворотом: `longestPalindromicSubsequence('BBABCBCAB')` = `7`.
- **Найкоротша спільна надпослідовність** (SCS): `|X| + |Y| − |LCS|`: `shortestCommonSupersequence('abac', 'cab')` = `'cabac'` (довжина 5).
- **Видалення для рівності рядків:** `minDeletionsToEqual('sea', 'eat')` = `2` (лишити `ea`).
- **Diff двох файлів:** LCS на рядках: `diffLines(['a', 'b', 'c'], ['a', 'c', 'd'])` = `['  a', '- b', '  c', '+ d']`.
- **LCS трьох рядків:** `lcsOfThree('abcd', 'acbd', 'abd')` = `3`.
- **Редагувальна відстань** — близька задача ([edit-distance.md](edit-distance.md)); **найдовша зростаюча підпослідовність** зводиться до LCS ([lis.md](lis.md)).

## 8. Типові помилки

1. **Плутанина підрядка й підпослідовності:** у підрядка при незбігу таблиця скидається в 0.
2. **Зсув індексів:** `dp[i][j]` — для префіксів довжини `i`, `j`, символи `x[i − 1]`, `y[j − 1]`.
3. **Невірна база:** перший рядок і стовпець — нулі.
4. **Відновлення в неправильному напрямку** і без розвороту результату.
5. **Рекурсія без мемоізації** — експоненційний час.
6. **Одна LCS vs усі:** LCS може бути кілька; різні відновлення дають різні рядки однакової довжини.
7. **Стиснення до одного рядка без збереження `prev[j − 1]`** — втрата діагонального значення.
8. **Порівняння регістрів/Unicode:** `charAt` розриває суррогатні пари — використовуйте масиви кодових точок (`[...s]`).

## 9. Алгоритм (стисло)

1. `dp[0][*] = dp[*][0] = 0`.
2. Для `i = 1..n`, `j = 1..m`: якщо `x[i−1] = y[j−1]` — `dp[i−1][j−1] + 1`, інакше `max(dp[i−1][j], dp[i][j−1])`.
3. Відповідь `dp[n][m]`; відновлення — назад по таблиці.
4. Час `O(n·m)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яка довжина LCS для `'ABCBDAB'` і `'BDCABA'`?

```js
lcsLength('ABCBDAB', 'BDCABA')
```

**2.** Яку LCS відновлює `lcsString('ABCBDAB', 'BDCABA')`?

```js
lcsString('ABCBDAB', 'BDCABA')
```

**3.** Які всі LCS знаходить `allLcs('ABCBDAB', 'BDCABA')`?

```js
allLcs('ABCBDAB', 'BDCABA')
```

**4.** Яка таблиця `lcsTable('ABC', 'AC')`?

```js
lcsTable('ABC', 'AC')
```

**5.** Яка довжина LCS для порожнього рядка й `'abc'`?

```js
lcsLength('', 'abc')
```

**6.** Яка LCS для однакових рядків `'abc'` і `'abc'`?

```js
lcsString('abc', 'abc')
```

**7.** Яка довжина LCS для `'abc'` та `'def'` (немає спільних символів)?

```js
lcsLength('abc', 'def')
```

**8.** Яка LCS для `'abcde'` і `'ace'`?

```js
lcsString('abcde', 'ace')
```

**9.** Яка довжина LCS для `'AGGTAB'` і `'GXTXAYB'`?

```js
lcsLength('AGGTAB', 'GXTXAYB')
```

**10.** Що поверне `lcsLength('abc', 'cba')`?

```js
lcsLength('abc', 'cba')
```

**11.** Чи збігаються результати `lcsLength` та `lcsTwoRows` та `lcsRecursive` на 50 «псевдовипадкових» парах рядків довжини 7 з алфавіту `abc`?

```js
(() => { let ok = true; for (let t = 1; t <= 50; t++) { const mkS = (seed) => Array.from({ length: 7 }, (_, i) => 'abc'[(seed * 7 + i * i * 5 + i * seed) % 3]).join(''); const a = mkS(t), b = mkS(t * 3 + 1); if (lcsLength(a, b) !== lcsTwoRows(a, b) || lcsLength(a, b) !== lcsRecursive(a, b)) ok = false; } return ok; })()
```

**12.** Скільки викликів робить наївна рекурсія `countCalls('ABCDEFGH', 'HGFEDCBA')`, і скільки станів у ДП?

```js
[countCalls('ABCDEFGH', 'HGFEDCBA'), 9 * 9]
```

**13.** Скільки викликів для `'ABCD'` та `'ABCD'` (повний збіг)?

```js
countCalls('ABCD', 'ABCD')
```

### Рівень 2. Робота алгоритму

**14.** Скільки викликів для `'AAAA'` та `'BBBB'`?

```js
countCalls('AAAA', 'BBBB')
```

**15.** Що поверне `longestCommonSubstring('ABABC', 'BABCA')`?

```js
longestCommonSubstring('ABABC', 'BABCA')
```

**16.** Що поверне `longestCommonSubstring('abc', 'xyz')` (порожній рядок)?

```js
longestCommonSubstring('abc', 'xyz')
```

**17.** Чим відрізняється LCS і найдовший спільний підрядок для `'abcxyz'` та `'axbycz'`?

```js
[lcsString('abcxyz', 'axbycz'), longestCommonSubstring('abcxyz', 'axbycz')]
```

**18.** Яка довжина найдовшої паліндромної підпослідовності `'BBABCBCAB'` та `'cbbd'`?

```js
[longestPalindromicSubsequence('BBABCBCAB'), longestPalindromicSubsequence('cbbd')]
```

**19.** Яка найкоротша спільна надпослідовність `'abac'` і `'cab'`?

```js
shortestCommonSupersequence('abac', 'cab')
```

**20.** Яка її довжина порівняно з формулою `n + m − LCS`?

```js
[shortestCommonSupersequence('abac', 'cab').length, 'abac'.length + 'cab'.length - lcsLength('abac', 'cab')]
```

**21.** Скільки видалень потрібно, щоб зробити `'sea'` і `'eat'` однаковими?

```js
minDeletionsToEqual('sea', 'eat')
```

**22.** Що поверне `diffLines(['a', 'b', 'c'], ['a', 'c', 'd'])`?

```js
diffLines(['a', 'b', 'c'], ['a', 'c', 'd'])
```

**23.** Що поверне `diffLines([], ['x'])` та `diffLines(['x'], [])`?

```js
[diffLines([], ['x']), diffLines(['x'], [])]
```

**24.** Яка довжина LCS трьох рядків `'abcd'`, `'acbd'`, `'abd'`?

```js
lcsOfThree('abcd', 'acbd', 'abd')
```

**25.** Чи `'ace'` є підпослідовністю `'abcde'`?

```js
isSubsequenceOf('ace', 'abcde')
```

**26.** Як змінюється LCS при додаванні однакового символа в кінець обох рядків: `lcsLength('abc' + 'z', 'bca' + 'z')` проти `lcsLength('abc', 'bca')`?

```js
[lcsLength('abc', 'bca'), lcsLength('abcz', 'bcaz')]
```

### Рівень 3. Складність і нюанси

**27.** Яка довжина LCS для рядка з 20 літер `'a'` та 20 літер `'b'` чергуючись `'abab…'` проти `'baba…'`?

```js
lcsLength('ab'.repeat(10), 'ba'.repeat(10))
```

**28.** Скільки клітинок таблиці для рядків довжин 1000 і 1500 і скільки пам'яті при двох рядках (`min`)?

```js
[1001 * 1501, 1001]
```

**29.** Скільки різних LCS у `'ABCBDAB'` та `'BDCABA'`?

```js
allLcs('ABCBDAB', 'BDCABA').length
```

**30.** Напишіть `lcsLengthByIndexMap(x, y)` — LCS через ДП, що рахує лише за двома рядками, повертаючи довжину (без таблиці `n × m`).

**31.** Напишіть `minInsertionsToPalindrome(s)` — мінімум вставок, щоб зробити рядок паліндромом (`n − LPS`).

**32.** Напишіть `deleteOperationsTwoStrings(a, b)` — мінімальна кількість видалень (за один крок видаляється один символ з будь-якого рядка), щоб рядки стали однаковими.

**33.** Напишіть `longestCommonSubsequenceOfWords(a, b)` — LCS для речень як масивів слів (повертає довжину).

**34.** Напишіть `uncrossedLines(a, b)` — максимум «непересічних ліній» між однаковими числами двох масивів (це LCS).

**35.** Напишіть `isInterleave(s1, s2, s3)` — чи є `s3` перемежуванням `s1` і `s2` (ДП `dp[i][j]`).

**36.** Напишіть `numDistinct(s, t)` — кількість різних підпослідовностей `s`, що дорівнюють `t`.

**37.** Напишіть `longestCommonPrefixLength(a, b)` — довжина найдовшого спільного префікса (для порівняння з LCS).

**38.** Напишіть `lcsWithTrace(x, y)` — масив пар індексів `[i, j]` символів, що входять у LCS (від початку до кінця).

**39.** Напишіть `similarityRatio(a, b)` — відношення `2·LCS / (|a| + |b|)`, округлене до 3 знаків.

### Рівень 4. Задачі з інтерв'ю

**40.** Чим підпослідовність відрізняється від підрядка і як це відображається в ДП?

**41.** Запишіть і поясніть рекурентність LCS.

**42.** Яка складність класичного ДП для LCS і як зменшити пам'ять?

**43.** Як відновити саму LCS із таблиці?

**44.** Чому LCS єдиною бути не обов'язково?

**45.** Як LCS застосовується в `diff`?

**46.** Як звести задачу про найдовшу паліндромну підпослідовність до LCS?

**47.** Як пов'язані LCS і найкоротша спільна надпослідовність?

**48.** Чому наївна рекурсія для LCS експоненційна?

**49.** Чим LCS відрізняється від редагувальної відстані?

**50.** Яка LCS для `'abcabc'` та `'acbacb'` (довжина і приклад)?

```js
[lcsLength('abcabc', 'acbacb'), lcsString('abcabc', 'acbacb')]
```

### Відповіді

1. `4`
2. `'BCBA'`
3. `['BCAB', 'BCBA', 'BDAB']`
4. `'    · A C\n·   0 0 0\nA   0 1 1\nB   0 1 1\nC   0 1 2'`
5. `0`
6. `'abc'`
7. `0`
8. `'ace'`
9. `4`
10. `1`
11. `true`
12. `[6991, 81]`
13. `5`
14. `139`
15. `'BABC'`
16. `''`
17. `['abcz', 'a']`
18. `[7, 2]`
19. `'cabac'`
20. `[5, 5]`
21. `2`
22. `['  a', '- b', '  c', '+ d']`
23. `[['+ x'], ['- x']]`
24. `3`
25. `true`
26. `[2, 3]`
27. `19`
28. `[1502501, 1001]`
29. `3`
30. Приклад розв'язку:

   ```js
   function lcsLengthByIndexMap(x, y) {
     let prev = new Array(y.length + 1).fill(0);
     for (let i = 1; i <= x.length; i++) {
       const cur = [0];
       for (let j = 1; j <= y.length; j++) cur[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
       prev = cur;
     }
     return prev[y.length];
   }
   ```

   Виклик `[lcsLengthByIndexMap('ABCBDAB', 'BDCABA'), lcsLengthByIndexMap('', 'a')]` → `[4, 0]`

31. Приклад розв'язку:

   ```js
   const minInsertionsToPalindrome = (s) => s.length - longestPalindromicSubsequence(s)
   ```

   Виклик `[minInsertionsToPalindrome('zzazz'), minInsertionsToPalindrome('mbadm'), minInsertionsToPalindrome('leetcode')]` → `[0, 2, 5]`

32. Приклад розв'язку:

   ```js
   const deleteOperationsTwoStrings = (a, b) => a.length + b.length - 2 * lcsLength(a, b)
   ```

   Виклик `[deleteOperationsTwoStrings('sea', 'eat'), deleteOperationsTwoStrings('leetcode', 'etco')]` → `[2, 4]`

33. Приклад розв'язку:

   ```js
   function longestCommonSubsequenceOfWords(a, b) {
     const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
     for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
     return dp[a.length][b.length];
   }
   ```

   Виклик `longestCommonSubsequenceOfWords('the quick brown fox'.split(' '), 'the lazy brown dog'.split(' '))` → `2`

34. Приклад розв'язку:

   ```js
   const uncrossedLines = (a, b) => lcsLengthWords(a, b);
   function lcsLengthWords(a, b) {
     const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
     for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
     return dp[a.length][b.length];
   }
   ```

   Виклик `[uncrossedLines([1, 4, 2], [1, 2, 4]), uncrossedLines([2, 5, 1, 2, 5], [10, 5, 2, 1, 5, 2])]` → `[2, 3]`

35. Приклад розв'язку:

   ```js
   function isInterleave(a, b, c) {
     if (a.length + b.length !== c.length) return false;
     const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(false));
     dp[0][0] = true;
     for (let i = 0; i <= a.length; i++) for (let j = 0; j <= b.length; j++) {
       if (i > 0 && dp[i - 1][j] && a[i - 1] === c[i + j - 1]) dp[i][j] = true;
       if (j > 0 && dp[i][j - 1] && b[j - 1] === c[i + j - 1]) dp[i][j] = true;
     }
     return dp[a.length][b.length];
   }
   ```

   Виклик `[isInterleave('aabcc', 'dbbca', 'aadbbcbcac'), isInterleave('aabcc', 'dbbca', 'aadbbbaccc'), isInterleave('', '', '')]` → `[true, false, true]`

36. Приклад розв'язку:

   ```js
   function numDistinct(s, t) {
     const dp = new Array(t.length + 1).fill(0);
     dp[0] = 1;
     for (let i = 1; i <= s.length; i++) for (let j = t.length; j >= 1; j--) if (s[i - 1] === t[j - 1]) dp[j] += dp[j - 1];
     return dp[t.length];
   }
   ```

   Виклик `[numDistinct('rabbbit', 'rabbit'), numDistinct('babgbag', 'bag'), numDistinct('abc', 'abcd')]` → `[3, 5, 0]`

37. Приклад розв'язку:

   ```js
   function longestCommonPrefixLength(a, b) {
     let i = 0;
     while (i < a.length && i < b.length && a[i] === b[i]) i++;
     return i;
   }
   ```

   Виклик `[longestCommonPrefixLength('flower', 'flow'), lcsLength('flower', 'flow'), longestCommonPrefixLength('abc', 'xbc')]` → `[4, 4, 0]`

38. Приклад розв'язку:

   ```js
   function lcsWithTrace(x, y) {
     const dp = lcsTableData(x, y);
     let i = x.length, j = y.length;
     const out = [];
     while (i > 0 && j > 0) {
       if (x[i - 1] === y[j - 1]) {
         out.push([i - 1, j - 1]);
         i--;
         j--;
       } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
       else j--;
     }
     return out.reverse();
   }
   ```

   Виклик `lcsWithTrace('ABCBDAB', 'BDCABA')` → `[[1, 0], [2, 2], [3, 4], [5, 5]]`

39. Приклад розв'язку:

   ```js
   function similarityRatio(a, b) {
     const t = a.length + b.length;
     return t === 0 ? 1 : +(2 * lcsLength(a, b) / t).toFixed(3);
   }
   ```

   Виклик `[similarityRatio('kitten', 'sitting'), similarityRatio('', ''), similarityRatio('abc', 'abc')]` → `[0.615, 1, 1]`

40. Підрядок має бути неперервним, підпослідовність — лише зберігати порядок. У ДП для підрядка при незбігу `dp[i][j] = 0`, а відповідь — максимум по таблиці; для підпослідовності при незбігу береться `max(dp[i − 1][j], dp[i][j − 1])`, а відповідь — `dp[n][m]`.
41. `dp[i][j] = dp[i − 1][j − 1] + 1`, якщо `x[i − 1] = y[j − 1]` (збіг використовується в LCS), інакше `max(dp[i − 1][j], dp[i][j − 1])` (один із символів не входить). База — нулі для порожніх префіксів.
42. Час і пам'ять `O(n·m)`. Для довжини достатньо двох рядків таблиці (`O(min(n, m))`); для відновлення рядка при малій пам'яті застосовують алгоритм Гіршберга (`O(n + m)` пам'яті).
43. Почати з `(n, m)`: якщо символи збігаються — додати його й піти діагоналлю; інакше піти у бік більшого з `dp[i − 1][j]`, `dp[i][j − 1]`. Зібрані символи розвернути.
44. Коли `dp[i − 1][j] = dp[i][j − 1]`, обидва напрямки дають оптимальну довжину, і відновлення може вибрати будь-який; тому різних LCS однакової довжини може бути кілька (для `ABCBDAB` і `BDCABA` — три).
45. Спільна підпослідовність рядків двох версій файлу — незмінені рядки; решта — видалення (`-`) та вставки (`+`). Практичні реалізації (Myers) мінімізують розмір різниці швидше, ніж загальний `O(n·m)`.
46. Паліндромна підпослідовність рядка `s` — це спільна підпослідовність `s` та її розвороту. Тому `LPS(s) = LCS(s, reverse(s))`.
47. Довжина SCS дорівнює `|X| + |Y| − LCS(X, Y)`: символи LCS записуємо один раз, решту — з обох рядків.
48. Підзадачі `(i, j)` обчислюються багато разів у різних гілках; дерево викликів має експоненційну кількість вузлів, хоч різних станів лише `(n + 1)(m + 1)`. Мемоізація зводить це до `O(n·m)`.
49. LCS допускає лише видалення (і вставки як зворотну операцію) без заміни; редагувальна відстань додатково враховує заміну символів. Їхні таблиці схожі, але переходи й вартості різні.
50. `[4, 'abcb']`
