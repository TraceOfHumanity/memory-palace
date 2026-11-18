# Manacher's Algorithm — алгоритм Манакера

**Алгоритм Манакера** знаходить **усі паліндромні підрядки** рядка за `O(n)` часу — зокрема найдовший паліндромний підрядок. Прості підходи: перебір усіх підрядків із перевіркою — `O(n³)`; розширення навколо кожного центру — `O(n²)`; ДП — `O(n²)` пам'яті. Манакер використовує **симетрію паліндромів**, щоб не перевіряти повторно вже відомі символи — і виходить лінійним.

## 1. Паліндроми й центри

Підрядок — **паліндром**, якщо читається однаково в обидва боки. Кожен паліндром має **центр**: для непарної довжини — символ (`aba`, центр `b`), для парної — проміжок між двома символами (`abba`, центр між `b` і `b`). У рядку з `n` символів `n` непарних центрів і `n − 1` парних — усього `2n − 1`.

Перевага розширення навколо центру: паліндроми з одним центром **вкладені** — якщо `[l, r]` паліндром, то й `[l + 1, r − 1]`. Тому достатньо знайти **радіус** (максимальне розширення) для кожного центру: `d1[i]` — радіус непарного паліндрома з центром `i` (кількість паліндромів із цим центром), `d2[i]` — для парного з центром між `i − 1` та `i`.

## 2. Розширення навколо центру `O(n²)`

Для кожного з `2n − 1` центрів розширюємо, поки символи збігаються. Для `"aaaa…a"` кожне розширення — `O(n)`, разом `O(n²)`. Ми повторно порівнюємо те саме.

## 3. Ідея Манакера: дзеркало

Тримаємо найправіший знайдений паліндром `[l, r]` із центром `c`. Для нового центру `i` усередині `[l, r]` його **дзеркальна** точка `j = 2c − i`. Паліндром навколо `j` у межах `[l, r]` **відображається** в паліндром навколо `i` із тим самим радіусом: `d[i] ≥ min(d[j], r − i)`. Далі розширюємо лише **за межі `r`**. Оскільки `r` рухається лише вправо, сумарна кількість розширень `O(n)`.

Схема аналогічна [Z-алгоритму](z-algorithm.md) (вікно `[l, r)`).

### Трюк із роздільниками

Щоб обробляти парні й непарні паліндроми однією процедурою, вставляємо між символами (і по краях) спеціальний символ `#`: `"abba"` → `"#a#b#b#a#"`. Тоді **кожен** паліндром стає непарним із центром у символі або `#`. Радіус `P[i]` у перетвореному рядку дорівнює довжині паліндрома в початковому.

Для `"babad"`: перетворений рядок `'^#b#a#b#a#d#$'`, масив радіусів `P` = `[0, 0, 1, 0, 3, 0, 3, 0, 1, 0, 1, 0, 0]`; найдовший паліндром — `'bab'` (`aba` має ту саму довжину).

## 4. Реалізація

```js
function transform(s) {
  return '^#' + s.split('').join('#') + '#$';
}

function manacherP(s) {
  const t = transform(s);
  const n = t.length;
  const P = new Array(n).fill(0);
  let c = 0;
  let r = 0;
  for (let i = 1; i < n - 1; i++) {
    if (i < r) P[i] = Math.min(r - i, P[2 * c - i]);
    while (t[i + P[i] + 1] === t[i - P[i] - 1]) P[i]++;
    if (i + P[i] > r) { c = i; r = i + P[i]; }
  }
  return P;
}

function longestPalindrome(s) {
  if (s.length === 0) return '';
  const P = manacherP(s);
  let best = 0;
  let center = 0;
  for (let i = 1; i < P.length - 1; i++) if (P[i] > best) { best = P[i]; center = i; }
  const start = (center - best) >> 1;
  return s.slice(start, start + best);
}

function countPalindromicSubstrings(s) {
  const P = manacherP(s);
  let total = 0;
  for (let i = 1; i < P.length - 1; i++) total += (P[i] + 1) >> 1;
  return total;
}

function expandAroundCenter(s) {
  let best = '';
  for (let c = 0; c < s.length; c++) {
    for (const [l0, r0] of [[c, c], [c, c + 1]]) {
      let l = l0;
      let r = r0;
      while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
      if (r - l - 1 > best.length) best = s.slice(l + 1, r);
    }
  }
  return best;
}

function expandComparisons(s) {
  let comps = 0;
  for (let c = 0; c < s.length; c++) {
    for (const [l0, r0] of [[c, c], [c, c + 1]]) {
      let l = l0;
      let r = r0;
      while (l >= 0 && r < s.length) {
        comps++;
        if (s[l] !== s[r]) break;
        l--;
        r++;
      }
    }
  }
  return comps;
}

function manacherComparisons(s) {
  const t = transform(s);
  const n = t.length;
  const P = new Array(n).fill(0);
  let comps = 0;
  let c = 0;
  let r = 0;
  for (let i = 1; i < n - 1; i++) {
    if (i < r) P[i] = Math.min(r - i, P[2 * c - i]);
    while (true) {
      comps++;
      if (t[i + P[i] + 1] !== t[i - P[i] - 1]) break;
      P[i]++;
    }
    if (i + P[i] > r) { c = i; r = i + P[i]; }
  }
  return comps;
}

function dpLongestPalindrome(s) {
  const n = s.length;
  if (n === 0) return '';
  const dp = Array.from({ length: n }, () => new Array(n).fill(false));
  let best = [0, 0];
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i; j < n; j++) {
      if (s[i] === s[j] && (j - i < 2 || dp[i + 1][j - 1])) {
        dp[i][j] = true;
        if (j - i > best[1] - best[0]) best = [i, j];
      }
    }
  }
  return s.slice(best[0], best[1] + 1);
}

function isPalindrome(s) {
  return s === s.split('').reverse().join('');
}

function minCutsPalindromePartition(s) {
  const n = s.length;
  const pal = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let i = n - 1; i >= 0; i--) for (let j = i; j < n; j++) if (s[i] === s[j] && (j - i < 2 || pal[i + 1][j - 1])) pal[i][j] = true;
  const cut = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    if (pal[0][j]) { cut[j] = 0; continue; }
    cut[j] = j;
    for (let i = 1; i <= j; i++) if (pal[i][j]) cut[j] = Math.min(cut[j], cut[i - 1] + 1);
  }
  return n ? cut[n - 1] : 0;
}

function shortestPalindromeAppend(s) {
  for (let k = s.length; k >= 0; k--) if (isPalindrome(s.slice(s.length - k))) return s + s.slice(0, s.length - k).split('').reverse().join('');
  return s;
}

function longestPalindromicPrefix(s) {
  for (let k = s.length; k >= 0; k--) if (isPalindrome(s.slice(0, k))) return s.slice(0, k);
  return '';
}

function palindromeRadiusAt(s, center, even) {
  let l = even ? center - 1 : center;
  let r = center;
  let k = 0;
  while (l >= 0 && r < s.length && s[l] === s[r]) { k++; l--; r++; }
  return k;
}
```

## 5. Підрахунок усіх паліндромних підрядків

Кожне `P[i]` у перетвореному рядку дає кількість паліндромів із цим центром: `⌈P[i]/2⌉`. `countPalindromicSubstrings('aaa')` = `6` (`a`, `a`, `a`, `aa`, `aa`, `aaa`), `countPalindromicSubstrings('abc')` = `3`, `countPalindromicSubstrings('abba')` = `6`.

## 6. Складність

- **Час `O(n)`:** `r` монотонно росте, кожне успішне розширення збільшує `r`.
- **Пам'ять `O(n)`** (масив радіусів і перетворений рядок).
- Для рядка `'a' × 500`: розширення навколо центрів робить 125250 порівнянь, Манакер — 2000.

| Метод | Час | Пам'ять |
|---|---|---|
| Перебір | `O(n³)` | `O(1)` |
| ДП | `O(n²)` | `O(n²)` |
| Розширення навколо центру | `O(n²)` | `O(1)` |
| **Манакер** | **`O(n)`** | `O(n)` |
| Хеші + бінарний пошук | `O(n log n)` | `O(n)` |
| Суфіксне дерево + LCA | `O(n)` | `O(n)` |

## 7. Застосування

- **Найдовший паліндромний підрядок:** `longestPalindrome('forgeeksskeegfor')` = `'geeksskeeg'`; `longestPalindrome('cbbd')` = `'bb'`.
- **Підрахунок паліндромних підрядків**, **найкоротший паліндром додаванням символів** (`shortestPalindromeAppend('abcd')` = `'abcdcba'`).
- **Мінімальні розрізи на паліндроми:** `minCutsPalindromePartition('aab')` = `1` (`aa | b`): ДП за `O(n²)` з таблицею паліндромності (її можна отримати і через Манакера, але таблиця все одно квадратична). Загальна техніка ДП — [dp-basics.md](../dynamic-programming/dp-basics.md).
- **Найдовший паліндромний префікс:** `longestPalindromicPrefix('abacdfgdcaba')` = `'aba'`.
- **Біоінформатика:** пошук паліндромних послідовностей ДНК (сайти рестрикції).
- **Перевірка, чи підрядок `[l, r]` паліндром, за `O(1)`:** після Манакера порівнюємо `P` центра з довжиною.

## 8. Типові помилки

1. **Забути роздільники** — парні паліндроми не обробляються однаково.
2. **Сторожові символи** `^` і `$` потрібні, щоб цикл розширення зупинявся на краях без перевірок індексів.
3. **Невірна дзеркальна точка:** `2c − i`, не `c − i`.
4. **Не обмежити радіус краєм вікна** `r − i`.
5. **Забути оновити `c`, `r`.**
6. **Індекс початку:** `(center − P[center]) / 2` у вихідному рядку.
7. **Рядок містить `#`, `^`, `$`** — використайте символи, яких немає.
8. **Регістр/пробіли/пунктуація** — задача про паліндроми «за літерами» вимагає попередньої нормалізації.
9. **Порожній рядок:** окремий випадок.

## 9. Алгоритм (стисло)

1. `t = ^#a#b#…#$`, `P` нулі, `c = r = 0`.
2. Для кожного `i`: `P[i] = min(r − i, P[2c − i])` (якщо `i < r`); розширювати, поки `t[i + P[i] + 1] = t[i − P[i] − 1]`.
3. Якщо `i + P[i] > r` — `c = i`, `r = i + P[i]`.
4. Найбільше `P[i]` — довжина найдовшого паліндрома; початок `(i − P[i]) / 2`.
5. Час `O(n)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `transform('babad')`?

```js
transform('babad')
```

**2.** Який масив радіусів `manacherP('babad')`?

```js
manacherP('babad')
```

**3.** Який найдовший паліндромний підрядок `longestPalindrome('babad')`?

```js
longestPalindrome('babad')
```

**4.** А для `'cbbd'`, `'a'`, `''`?

```js
['cbbd', 'a', ''].map(longestPalindrome)
```

**5.** Що поверне `longestPalindrome('forgeeksskeegfor')`?

```js
longestPalindrome('forgeeksskeegfor')
```

**6.** Що поверне `longestPalindrome('abcd')` (немає паліндромів довших за 1)?

```js
longestPalindrome('abcd')
```

**7.** Що поверне `longestPalindrome('aaaa')` та `('abacdfgdcaba')`?

```js
[longestPalindrome('aaaa'), longestPalindrome('abacdfgdcaba')]
```

**8.** Скільки паліндромних підрядків у `'aaa'`, `'abc'`, `'abba'`?

```js
['aaa', 'abc', 'abba'].map(countPalindromicSubstrings)
```

**9.** Скільки паліндромних підрядків у `'racecar'`?

```js
countPalindromicSubstrings('racecar')
```

**10.** Що поверне `manacherP('abba')`?

```js
manacherP('abba')
```

**11.** Що поверне `manacherP('aaa')`?

```js
manacherP('aaa')
```

**12.** Чи збігається `longestPalindrome` з `expandAroundCenter` за довжиною на 60 псевдовипадкових рядках довжини 12?

```js
(() => { let ok = true; for (let t = 1; t <= 60; t++) { const s = Array.from({ length: 12 }, (_, i) => 'ab'[(t * 3 + i * i + i * t) % 2]).join(''); if (longestPalindrome(s).length !== expandAroundCenter(s).length || longestPalindrome(s).length !== dpLongestPalindrome(s).length) ok = false; } return ok; })()
```

**13.** Чи збігається кількість паліндромних підрядків із перебором для тих самих рядків?

```js
(() => { let ok = true; for (let t = 1; t <= 40; t++) { const s = Array.from({ length: 10 }, (_, i) => 'abc'[(t * 3 + i * i + i * t) % 3]).join(''); let c = 0; for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (isPalindrome(s.slice(i, j + 1))) c++; if (c !== countPalindromicSubstrings(s)) ok = false; } return ok; })()
```

### Рівень 2. Робота алгоритму

**14.** Скільки порівнянь робить розширення навколо центру для `'a'.repeat(500)` і скільки Манакер?

```js
[expandComparisons('a'.repeat(500)), manacherComparisons('a'.repeat(500))]
```

**15.** Скільки порівнянь для випадкового рядка з 500 символів?

```js
(() => { const s = Array.from({ length: 500 }, (_, i) => String.fromCharCode(97 + (i * i * 7 + i * 13) % 26)).join(''); return [expandComparisons(s), manacherComparisons(s)]; })()
```

**16.** Скільки центрів у рядку довжини 7 (непарних і парних разом) і довжина перетвореного рядка?

```js
[2 * 7 - 1, transform('abcdefg').length]
```

**17.** Що поверне `dpLongestPalindrome('babad')`?

```js
dpLongestPalindrome('babad')
```

**18.** Скільки мінімальних розрізів для `'aab'`, `'a'`, `'ab'`?

```js
['aab', 'a', 'ab'].map(minCutsPalindromePartition)
```

**19.** А для `'aabbaa'` та `'abcde'`?

```js
[minCutsPalindromePartition('aabbaa'), minCutsPalindromePartition('abcde')]
```

**20.** Яка найкоротша паліндромна форма `'abcd'` при додаванні в кінець?

```js
shortestPalindromeAppend('abcd')
```

**21.** А для `'aacecaaa'` та `'race'`?

```js
[shortestPalindromeAppend('aacecaaa'), shortestPalindromeAppend('race')]
```

**22.** Який найдовший паліндромний префікс `'abacdfgdcaba'` та `'abcd'`?

```js
[longestPalindromicPrefix('abacdfgdcaba'), longestPalindromicPrefix('abcd')]
```

**23.** Який радіус непарного паліндрома в `'racecar'` із центром `3` та парного в `'abba'` з центром `2`?

```js
[palindromeRadiusAt('racecar', 3, false), palindromeRadiusAt('abba', 2, true)]
```

**24.** Чи є `'A man'` паліндромом? А `'amanaplanacanalpanama'`?

```js
[isPalindrome('A man'), isPalindrome('amanaplanacanalpanama')]
```

**25.** Що поверне `longestPalindrome('abacaba')` та `('abacabad')`?

```js
[longestPalindrome('abacaba'), longestPalindrome('abacabad')]
```

**26.** Яка кількість паліндромів у рядку з `'a'` повторених 10 разів (за формулою `n(n+1)/2`)?

```js
[countPalindromicSubstrings('a'.repeat(10)), 10 * 11 / 2]
```

### Рівень 3. Складність і нюанси

**27.** Скільки різних паліндромних підрядків у `'aabaa'` (множина)?

```js
(() => { const s = 'aabaa'; const set = new Set(); for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (isPalindrome(s.slice(i, j + 1))) set.add(s.slice(i, j + 1)); return [...set].sort(); })()
```

**28.** Напишіть `palindromeLengthsAtEveryCenter(s)` — для кожного з `2n − 1` центрів довжину найдовшого паліндрома (за `manacherP`, ігноруючи сторожові).

**29.** Напишіть `isSubstringPalindromeO1(s, l, r)` — чи є `s[l..r]` паліндромом за `O(1)` після передобробки (повертає функцію-перевірку).

**30.** Напишіть `longestPalindromicSubsequenceLen(s)` — довжина найдовшої паліндромної **підпослідовності** (ДП; відрізняється від підрядка).

**31.** Напишіть `countPalindromesLongerThan(s, k)` — кількість паліндромних підрядків довжини більше `k` (через `P`).

**32.** Напишіть `validPalindromeAlnum(s)` — чи є рядок паліндромом, ігноруючи не-літери/цифри й регістр.

**33.** Напишіть `partitionIntoPalindromes(s)` — усі розбиття на паліндроми (backtracking), кількість розбиттів.

**34.** Напишіть `middleOfLongestPalindrome(s)` — індекс центру (ціле для непарного, `x.5` для парного) найдовшого паліндрома.

**35.** Напишіть `makePalindromeInsertions(s)` — мінімум вставок, щоб зробити рядок паліндромом (`n − LPS`).

**36.** Напишіть `longestPalindromeBuiltFromLetters(s)` — довжина найдовшого паліндрома, який можна скласти з літер рядка (пари + одна непарна).

**37.** Яка основна ідея алгоритму Манакера?

**38.** Навіщо вставляти роздільники `#` між символами?

**39.** Чому розширення навколо центру `O(n²)`, а Манакер `O(n)`?

### Рівень 4. Задачі з інтерв'ю

**40.** Скільки центрів паліндромів у рядку довжини `n`?

**41.** Як за масивом радіусів порахувати кількість паліндромних підрядків?

**42.** Чому паліндроми з одним центром вкладені?

**43.** Яка різниця між паліндромним підрядком і підпослідовністю?

**44.** Які сторожові символи використовують і чому?

**45.** Коли варто віддати перевагу іншому підходу, ніж Манакер?

**46.** Як Манакер пов'язаний із Z-алгоритмом?

**47.** Який масив радіусів `manacherP('a')` та `manacherP('ab')`?

```js
[manacherP('a'), manacherP('ab')]
```

**48.** Який найдовший паліндромний підрядок `'abcba'` і де його центр?

```js
[longestPalindrome('abcba'), manacherP('abcba').indexOf(Math.max(...manacherP('abcba')))]
```

**49.** Яка найбільша довжина паліндрома в `'banana'`?

```js
longestPalindrome('banana')
```

**50.** Яка найбільша довжина паліндрома в `'racecarannakayak'`?

```js
longestPalindrome('racecarannakayak')
```

### Відповіді

1. `'^#b#a#b#a#d#$'`
2. `[0, 0, 1, 0, 3, 0, 3, 0, 1, 0, 1, 0, 0]`
3. `'bab'`
4. `['bb', 'a', '']`
5. `'geeksskeeg'`
6. `'a'`
7. `['aaaa', 'aba']`
8. `[6, 3, 6]`
9. `10`
10. `[0, 0, 1, 0, 1, 4, 1, 0, 1, 0, 0]`
11. `[0, 0, 1, 2, 3, 2, 1, 0, 0]`
12. `true`
13. `true`
14. `[125250, 2000]`
15. `[11016, 1994]`
16. `[13, 17]`
17. `'aba'`
18. `[1, 0, 1]`
19. `[0, 4]`
20. `'abcdcba'`
21. `['aacecaaacecaa', 'racecar']`
22. `['aba', 'a']`
23. `[4, 2]`
24. `[false, true]`
25. `['abacaba', 'abacaba']`
26. `[55, 55]`
27. `['a', 'aa', 'aabaa', 'aba', 'b']`
28. Приклад розв'язку:

   ```js
   function palindromeLengthsAtEveryCenter(s) {
     const P = manacherP(s);
     return P.slice(2, P.length - 2);
   }
   ```

   Виклик `palindromeLengthsAtEveryCenter('abba')` → `[1, 0, 1, 4, 1, 0, 1]`

29. Приклад розв'язку:

   ```js
   function isSubstringPalindromeO1(s) {
     const P = manacherP(s);
     return (l, r) => {
       const len = r - l + 1;
       const center = l + r + 2;
       return P[center] >= len;
     };
   }
   ```

   Виклик `(() => { const q = isSubstringPalindromeO1('abacaba'); return [q(0, 6), q(0, 2), q(1, 3), q(2, 5)]; })()` → `[true, true, false, false]`

30. Приклад розв'язку:

   ```js
   function longestPalindromicSubsequenceLen(s) {
     const n = s.length;
     const dp = Array.from({ length: n }, () => new Array(n).fill(0));
     for (let i = n - 1; i >= 0; i--) {
       dp[i][i] = 1;
       for (let j = i + 1; j < n; j++) dp[i][j] = s[i] === s[j] ? dp[i + 1][j - 1] + 2 : Math.max(dp[i + 1][j], dp[i][j - 1]);
     }
     return n ? dp[0][n - 1] : 0;
   }
   ```

   Виклик `[longestPalindromicSubsequenceLen('bbbab'), longestPalindromicSubsequenceLen('cbbd'), longestPalindrome('bbbab').length]` → `[4, 2, 3]`

31. Приклад розв'язку:

   ```js
   function countPalindromesLongerThan(s, k) {
     let c = 0;
     for (let i = 0; i < s.length; i++) for (let j = i + k; j < s.length; j++) if (isPalindrome(s.slice(i, j + 1))) c++;
     return c;
   }
   ```

   Виклик `[countPalindromesLongerThan('abacaba', 2), countPalindromesLongerThan('abc', 0)]` → `[5, 3]`

32. Приклад розв'язку:

   ```js
   function validPalindromeAlnum(s) {
     const t = s.toLowerCase().replace(/[^a-z0-9]/g, '');
     return isPalindrome(t);
   }
   ```

   Виклик `[validPalindromeAlnum('A man, a plan, a canal: Panama'), validPalindromeAlnum('race a car'), validPalindromeAlnum('')]` → `[true, false, true]`

33. Приклад розв'язку:

   ```js
   function partitionIntoPalindromes(s) {
     const res = [];
     const go = (i, path) => {
       if (i === s.length) {
         res.push(path.slice());
         return;
       }
       for (let j = i; j < s.length; j++) {
         const sub = s.slice(i, j + 1);
         if (isPalindrome(sub)) {
           path.push(sub);
           go(j + 1, path);
           path.pop();
         }
       }
     };
     go(0, []);
     return res.length;
   }
   ```

   Виклик `[partitionIntoPalindromes('aab'), partitionIntoPalindromes('aaa'), partitionIntoPalindromes('abc')]` → `[2, 4, 1]`

34. Приклад розв'язку:

   ```js
   function middleOfLongestPalindrome(s) {
     const P = manacherP(s);
     let best = 0, c = 0;
     for (let i = 1; i < P.length - 1; i++) if (P[i] > best) {
       best = P[i];
       c = i;
     }
     return (c - 2) / 2;
   }
   ```

   Виклик `[middleOfLongestPalindrome('abacaba'), middleOfLongestPalindrome('cbbd'), middleOfLongestPalindrome('a')]` → `[3, 1.5, 0]`

35. Приклад розв'язку:

   ```js
   const makePalindromeInsertions = (s) => s.length - longestPalindromicSubsequenceLen(s);
   function longestPalindromicSubsequenceLen(s) {
     const n = s.length;
     const dp = Array.from({ length: n }, () => new Array(n).fill(0));
     for (let i = n - 1; i >= 0; i--) {
       dp[i][i] = 1;
       for (let j = i + 1; j < n; j++) dp[i][j] = s[i] === s[j] ? dp[i + 1][j - 1] + 2 : Math.max(dp[i + 1][j], dp[i][j - 1]);
     }
     return n ? dp[0][n - 1] : 0;
   }
   ```

   Виклик `[makePalindromeInsertions('zzazz'), makePalindromeInsertions('mbadm'), makePalindromeInsertions('leetcode')]` → `[0, 2, 5]`

36. Приклад розв'язку:

   ```js
   function longestPalindromeBuiltFromLetters(s) {
     const f = {};
     for (const c of s) f[c] = (f[c] || 0) + 1;
     let len = 0, odd = false;
     for (const v of Object.values(f)) {
       len += v - (v % 2);
       if (v % 2) odd = true;
     }
     return len + (odd ? 1 : 0);
   }
   ```

   Виклик `[longestPalindromeBuiltFromLetters('abccccdd'), longestPalindromeBuiltFromLetters('a'), longestPalindromeBuiltFromLetters('')]` → `[7, 1, 0]`

37. Використати симетрію паліндромів: для центру `i` усередині вже знайденого паліндрома `[l, r]` радіус не менший за радіус дзеркальної точки `2c − i`, обмежений краєм `r`. Розширення порівнянням відбувається лише за межі `r`, тож загальний час лінійний.
38. Щоб парні й непарні паліндроми оброблялися однаково: у перетвореному рядку кожен паліндром має центр у символі (літері або `#`), тому достатньо розглядати лише непарні паліндроми.
39. Розширення навколо кожного центру перевіряє символи з нуля, повторно порівнюючи ті самі позиції (наприклад, у `aaaa…a`). Манакер повторно використовує радіуси дзеркальних центрів, і `r` монотонно зростає, тож кожне успішне порівняння збільшує межу `r` і відбувається не більше `n` разів.
40. `2n − 1`: `n` непарних (символи) і `n − 1` парних (проміжки між сусідніми символами). У перетвореному рядку з роздільниками — це всі позиції між сторожовими символами.
41. Кожен центр у перетвореному рядку з радіусом `P[i]` дає `⌈P[i] / 2⌉` паліндромів у вихідному рядку (різної довжини зі спільним центром); сума по всіх центрах — відповідь.
42. Якщо `s[l..r]` — паліндром, то зняття обох крайніх символів зберігає симетрію, тобто `s[l+1..r−1]` теж паліндром. Тому достатньо знати максимальний радіус для кожного центру.
43. Підрядок неперервний, його знаходить Манакер за `O(n)`; підпослідовність допускає пропуски, її довжину знаходить ДП `O(n²)` (або LCS рядка з його розворотом).
44. На початку й у кінці перетвореного рядка ставлять різні символи (`^`, `$`), яких немає в алфавіті, щоб цикл розширення зупинявся на межі без додаткових перевірок індексів: порівняння `^` із `$` завжди невдале.
45. Для малих рядків розширення навколо центру простіше. Для запитів «чи є підрядок паліндромом» багато разів — Манакер із передобробкою `O(n)` і `O(1)` на запит; для паліндромних підрядків із підстановками чи фільтрами — хеші чи суфіксні структури.
46. Обидва підтримують вікно `[l, r)` найправішого знайденого збігу й використовують дзеркальне значення для початкової оцінки, а потім розширюють лише за межу вікна; тому обидва лінійні за амортизованим аналізом.
47. `[[0, 0, 1, 0, 0], [0, 0, 1, 0, 1, 0, 0]]`
48. `['abcba', 6]`
49. `'anana'`
50. `'racecar'`
