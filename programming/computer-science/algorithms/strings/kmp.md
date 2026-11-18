# KMP — алгоритм Кнута—Морріса—Пратта

KMP шукає **шаблон** `P` (довжина `m`) у **тексті** `T` (довжина `n`) за **лінійний** час `O(n + m)`, без повернення назад по тексту. Наївний пошук у гіршому випадку витрачає `O(n·m)`. Секрет KMP — **префікс-функція** шаблону: вона підказує, на скільки символів можна «посунути» шаблон після невдалого порівняння, не втрачаючи вже встановленого збігу.

## 1. Проблема наївного пошуку

Наївно: для кожного зсуву `i` порівнюємо `T[i..i+m)` з `P`; при незбігу — зсув на 1 і порівняння з початку. Для `T = "aaaaaaaaab"`, `P = "aaab"` на кожному зсуві робимо 3 успішні порівняння й 1 невдале — загалом близько `n·m` кроків. Ми **забуваємо**, що вже прочитали символи тексту.

**Ідея KMP.** Якщо ми зіставили префікс шаблону довжини `j` і наступний символ не збігся, то частина цього префікса **сама є префіксом шаблону** (його «рамка», border). Тому нам не треба повертати текстовий вказівник назад: достатньо зменшити `j` до довжини найдовшого власного префікса шаблону, що є також суфіксом щойно зіставленого фрагмента.

## 2. Префікс-функція

Для рядка `S` **префікс-функція** `π[i]` — довжина найдовшого **власного** префікса `S[0..i]`, який також є **суфіксом** `S[0..i]` (власний — не весь рядок). Наприклад, для `"abacaba"`: π = `[0, 0, 1, 0, 1, 2, 3]`.

Пояснення: `π[2] = 1` (`aba` має префікс-суфікс `a`), `π[6] = 3` (`abacaba` — `aba`).

### Обчислення за `O(m)`

Тримаємо `k = π[i − 1]` і намагаємось продовжити: якщо `S[i] === S[k]` — `k++`; інакше `k = π[k − 1]` (скорочуємо рамку), і так, поки `k === 0` або збіг. Чому лінійно? `k` зростає не більше ніж на 1 за ітерацію, а в циклі лише зменшується: сумарно зменшень ≤ зростань ≤ `m` — амортизований аналіз.

## 3. Пошук у тексті

Об'єднуємо `P + '#' + T` (роздільник, якого немає в алфавіті) і рахуємо `π`: усі позиції, де `π = m`, — входження. Або ж проходимо `T` з тим самим `k`: якщо `k === m` — знайшли, далі `k = π[k − 1]`.

`kmpSearch('abababcabababab', 'ababab')` = `[0, 7, 9]` (початкові індекси, включно з перекриттям); `kmpSearch('aaaaa', 'aa')` = `[0, 1, 2, 3]`.

Трасування префікс-функції для `"abacaba"`: - π[0] = 0 ("a")
- π[1] = 0 ("ab")
- π[2] = 1 ("aba" → "a")
- π[3] = 0 ("abac")
- π[4] = 1 ("abaca" → "a")
- π[5] = 2 ("abacab" → "ab")
- π[6] = 3 ("abacaba" → "aba")

## 4. Реалізація

```js
function prefixFunction(s) {
  const pi = new Array(s.length).fill(0);
  for (let i = 1; i < s.length; i++) {
    let k = pi[i - 1];
    while (k > 0 && s[i] !== s[k]) k = pi[k - 1];
    if (s[i] === s[k]) k++;
    pi[i] = k;
  }
  return pi;
}

function prefixTrace(s) {
  const pi = prefixFunction(s);
  return s.split('').map((c, i) => 'π[' + i + '] = ' + pi[i] + ' (' + JSON.stringify(s.slice(0, i + 1)) + (pi[i] ? ' → ' + JSON.stringify(s.slice(0, pi[i])) : '') + ')');
}

function kmpSearch(text, pattern) {
  if (pattern.length === 0) return [];
  const pi = prefixFunction(pattern);
  const res = [];
  let k = 0;
  for (let i = 0; i < text.length; i++) {
    while (k > 0 && text[i] !== pattern[k]) k = pi[k - 1];
    if (text[i] === pattern[k]) k++;
    if (k === pattern.length) {
      res.push(i - k + 1);
      k = pi[k - 1];
    }
  }
  return res;
}

function naiveSearch(text, pattern) {
  const res = [];
  for (let i = 0; i + pattern.length <= text.length; i++) {
    let j = 0;
    while (j < pattern.length && text[i + j] === pattern[j]) j++;
    if (j === pattern.length) res.push(i);
  }
  return res;
}

function naiveComparisons(text, pattern) {
  let c = 0;
  for (let i = 0; i + pattern.length <= text.length; i++) {
    let j = 0;
    while (j < pattern.length) {
      c++;
      if (text[i + j] !== pattern[j]) break;
      j++;
    }
  }
  return c;
}

function kmpComparisons(text, pattern) {
  const pi = prefixFunction(pattern);
  let c = 0;
  let k = 0;
  for (let i = 0; i < text.length; i++) {
    while (k > 0) {
      c++;
      if (text[i] === pattern[k]) break;
      k = pi[k - 1];
    }
    if (k === 0) c++;
    if (text[i] === pattern[k]) k++;
    if (k === pattern.length) k = pi[k - 1];
  }
  return c;
}

function borders(s) {
  const pi = prefixFunction(s);
  const res = [];
  let k = pi[s.length - 1];
  while (k > 0) {
    res.push(s.slice(0, k));
    k = pi[k - 1];
  }
  return res;
}

function smallestPeriod(s) {
  const pi = prefixFunction(s);
  const p = s.length - pi[s.length - 1];
  return s.length % p === 0 ? p : s.length;
}

function isRotation(a, b) {
  return a.length === b.length && kmpSearch(a + a, b).length > 0;
}

function shortestPalindromeByPrepending(s) {
  const rev = s.split('').reverse().join('');
  const pi = prefixFunction(s + '#' + rev);
  return rev.slice(0, s.length - pi[pi.length - 1]) + s;
}

function repeatedSubstringPattern(s) {
  return smallestPeriod(s) < s.length;
}

function countOccurrences(text, pattern) {
  return kmpSearch(text, pattern).length;
}

function longestHappyPrefix(s) {
  const pi = prefixFunction(s);
  return s.slice(0, pi[s.length - 1]);
}

function automaton(pattern, alphabet) {
  const pi = prefixFunction(pattern);
  const m = pattern.length;
  const go = Array.from({ length: m + 1 }, () => ({}));
  for (let state = 0; state <= m; state++) {
    for (const c of alphabet) {
      if (state < m && pattern[state] === c) go[state][c] = state + 1;
      else go[state][c] = state === 0 ? 0 : go[pi[state - 1]][c];
    }
  }
  return go;
}
```

## 5. Автомат KMP

Префікс-функцію можна «розгорнути» в **детермінований скінченний автомат**: стан `j` — довжина зіставленого префікса; для кожного символа алфавіту заздалегідь обчислюємо перехід. Тоді пошук — рівно `n` кроків без `while`. `automaton('aab', ['a', 'b'])` — переходи: `[{ a: 1, b: 0 }, { a: 2, b: 0 }, { a: 2, b: 3 }, { a: 1, b: 0 }]`. Це основа пошуку багатьох шаблонів одночасно (Aho–Corasick).

## 6. Складність

- **Префікс-функція:** `O(m)` часу, `O(m)` пам'яті.
- **Пошук:** `O(n)` порівнянь тексту (кожен символ тексту розглядається один раз; `k` зменшується амортизовано).
- **Разом `O(n + m)`**, незалежно від вмісту (на відміну від наївного й Рабіна—Карпа в гіршому випадку).
- Порівняння: для `T = 'a' × 1000 + 'b'`, `P = 'a' × 50 + 'b'` наївний пошук робить 48501 порівнянь, KMP — 1951.
- Потрібний додатковий масив `O(m)`.

## 7. Застосування префікс-функції

Префікс-функція — потужний інструмент для задач про **рамки (borders)** і **періоди**:

- **Усі рамки рядка:** `borders('abacaba')` = `['aba', 'a']`.
- **Найменший період:** `smallestPeriod('abcabcabc')` = `3`; `smallestPeriod('abcab')` = `5` (немає періоду, що ділить довжину).
- **Рядок складається з повторів:** `repeatedSubstringPattern('abab')` = `true`, `('aba')` = `false`.
- **Циклічний зсув:** `isRotation('waterbottle', 'erbottlewat')` = `true` — шукаємо `b` у `a + a`.
- **Найкоротший паліндром додаванням символів спереду:** `shortestPalindromeByPrepending('aacecaaa')` = `'aaacecaaa'`.
- **Найдовший «щасливий» префікс** (префікс = суфікс): `longestHappyPrefix('level')` = `'l'`, `('ababab')` = `'abab'`.
- **Кількість різних підрядків, підрахунок входжень** (`countOccurrences('aaaa', 'aa')` = `3`).

## 8. Порівняння алгоритмів пошуку підрядка

| Алгоритм | Передобробка | Пошук (гірший) | Примітка |
|---|---|---|---|
| Наївний | — | `O(n·m)` | простий; ок для малих рядків |
| **KMP** | `O(m)` | `O(n)` | гарантована лінійність |
| [Рабін—Карп](rabin-karp.md) | `O(m)` | `O(n·m)` (середній `O(n + m)`) | хеші; зручний для багатьох шаблонів |
| [Z-алгоритм](z-algorithm.md) | `O(m)` | `O(n)` | еквівалентний за можливостями |
| Бойєр—Мур | `O(m + σ)` | `O(n·m)` (типово сублінійний) | найшвидший на практиці для довгих шаблонів |
| Aho–Corasick | `O(Σ m)` | `O(n + z)` | багато шаблонів |
| Суфіксний масив/автомат | `O(n)` | `O(m log n)`/`O(m)` | багато запитів до одного тексту |

## 9. Типові помилки

1. **`π[i]` через ітерацію `k++` без `while`** — ламається на `"aabaaab"`.
2. **Ініціалізація `π[0] ≠ 0`:** `π[0]` завжди `0` (власний префікс).
3. **Після знаходження збігу не скинути `k = π[k − 1]`** — доступ за межі шаблону.
4. **Порожній шаблон:** безкінечні збіги/ділення; обробляйте окремо.
5. **Рядок-роздільник у конкатенації** — має бути символ, якого немає в рядках, інакше хибні збіги.
6. **Перекриваючі входження:** KMP знаходить їх усі (на відміну від `str.indexOf` у циклі з кроком `m`).
7. **Плутанина «довжина рамки» та «індекс»:** `π[k − 1]`, а не `π[k]`.
8. **Unicode:** індекси — кодові одиниці; суррогатні пари можуть дати розрив.

## 10. Алгоритм (стисло)

1. `π` шаблону: для `i = 1..m − 1`: `k = π[i − 1]`; поки `k > 0` і `s[i] ≠ s[k]` — `k = π[k − 1]`; якщо `s[i] = s[k]` — `k++`; `π[i] = k`.
2. Пошук: `k = 0`; для кожного `T[i]`: скорочувати `k`, поки не збіг; `k++` при збігу; `k = m` → входження, `k = π[m − 1]`.
3. Час `O(n + m)`, пам'ять `O(m)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яка префікс-функція `prefixFunction('abacaba')`?

```js
prefixFunction('abacaba')
```

**2.** А для `'aabaaab'`?

```js
prefixFunction('aabaaab')
```

**3.** А для `'abcabcd'` та `'aaaa'`?

```js
[prefixFunction('abcabcd'), prefixFunction('aaaa')]
```

**4.** Що поверне `prefixFunction('')` та `prefixFunction('a')`?

```js
[prefixFunction(''), prefixFunction('a')]
```

**5.** Який трасувальний вивід `prefixTrace('abab')`?

```js
prefixTrace('abab')
```

**6.** Де `kmpSearch('abababcabababab', 'ababab')` знаходить шаблон?

```js
kmpSearch('abababcabababab', 'ababab')
```

**7.** Що поверне `kmpSearch('aaaaa', 'aa')` (перекриття)?

```js
kmpSearch('aaaaa', 'aa')
```

**8.** Що поверне `kmpSearch('abc', 'd')`, `kmpSearch('', 'a')`, `kmpSearch('abc', '')`?

```js
[kmpSearch('abc', 'd'), kmpSearch('', 'a'), kmpSearch('abc', '')]
```

**9.** Що поверне `kmpSearch('abc', 'abc')` та `kmpSearch('abc', 'abcd')`?

```js
[kmpSearch('abc', 'abc'), kmpSearch('abc', 'abcd')]
```

**10.** Чи збігаються `kmpSearch` і `naiveSearch` на 50 «псевдовипадкових» текстах (алфавіт `ab`, довжина 20) і шаблонах довжини 3?

```js
(() => { let ok = true; for (let t = 1; t <= 50; t++) { const T = Array.from({ length: 20 }, (_, i) => 'ab'[(t * 3 + i * i + i * t) % 2]).join(''); const P = Array.from({ length: 3 }, (_, i) => 'ab'[(t + i * 5) % 2]).join(''); if (JSON.stringify(kmpSearch(T, P)) !== JSON.stringify(naiveSearch(T, P))) ok = false; } return ok; })()
```

**11.** Скільки порівнянь у наївному пошуку для тексту `'a'×1000 + 'b'` та шаблону `'a'×50 + 'b'`?

```js
naiveComparisons('a'.repeat(1000) + 'b', 'a'.repeat(50) + 'b')
```

**12.** Скільки порівнянь у KMP для тих самих даних?

```js
kmpComparisons('a'.repeat(1000) + 'b', 'a'.repeat(50) + 'b')
```

**13.** Які рамки (borders) має `'abacaba'`?

```js
borders('abacaba')
```

### Рівень 2. Робота алгоритму

**14.** Які рамки має `'aaaa'` та `'abc'`?

```js
[borders('aaaa'), borders('abc')]
```

**15.** Який найменший період `'abcabcabc'`, `'abcab'` та `'aaaa'`?

```js
[smallestPeriod('abcabcabc'), smallestPeriod('abcab'), smallestPeriod('aaaa')]
```

**16.** Чи складається `'abab'`, `'aba'`, `'abcabcabc'` з повторів підрядка?

```js
['abab', 'aba', 'abcabcabc'].map(repeatedSubstringPattern)
```

**17.** Чи є `'erbottlewat'` циклічним зсувом `'waterbottle'`? А `'bottlewatx'`?

```js
[isRotation('waterbottle', 'erbottlewat'), isRotation('waterbottle', 'bottlewatx')]
```

**18.** Яка найкоротша паліндромна форма `'aacecaaa'` та `'abcd'` при додаванні символів спереду?

```js
[shortestPalindromeByPrepending('aacecaaa'), shortestPalindromeByPrepending('abcd')]
```

**19.** Який найдовший «щасливий» префікс для `'level'`, `'ababab'`, `'abc'`?

```js
['level', 'ababab', 'abc'].map(longestHappyPrefix)
```

**20.** Скільки входжень `'aa'` у `'aaaa'` (з перекриттям)?

```js
countOccurrences('aaaa', 'aa')
```

**21.** Які переходи автомата `automaton('aab', ['a', 'b'])`?

```js
automaton('aab', ['a', 'b'])
```

**22.** Скільки станів у автоматі для шаблону довжини 5?

```js
automaton('abcab', ['a', 'b', 'c']).length
```

**23.** Що поверне `kmpSearch('aabaabaaa', 'aabaaa')`?

```js
kmpSearch('aabaabaaa', 'aabaaa')
```

**24.** Що поверне `kmpSearch('abcabcabcabc', 'abcabc')` (перекриття через 3)?

```js
kmpSearch('abcabcabcabc', 'abcabc')
```

**25.** Скільки різних значень містить `π` для `'abcabcabcabc'`?

```js
new Set(prefixFunction('abcabcabcabc')).size
```

**26.** Яка найбільша довжина рамки для `'aabaabaab'`?

```js
prefixFunction('aabaabaab').at(-1)
```

### Рівень 3. Складність і нюанси

**27.** Скільки рамок у рядка з однакових символів довжини 10?

```js
borders('a'.repeat(10)).length
```

**28.** Що поверне `kmpSearch('mississippi', 'issi')`?

```js
kmpSearch('mississippi', 'issi')
```

**29.** Що поверне `kmpSearch('mississippi', 'ss')` та `('mississippi', 'i')`?

```js
[kmpSearch('mississippi', 'ss'), kmpSearch('mississippi', 'i')]
```

**30.** Напишіть `countDistinctBorders(s)` — кількість рамок рядка.

**31.** Напишіть `strStr(haystack, needle)` — перший індекс входження (як `indexOf`), `0` для порожнього шаблону, `-1` якщо немає (через KMP).

**32.** Напишіть `prefixFunctionAllPeriods(s)` — усі періоди `p`, для яких `s[i] = s[i + p]` для всіх можливих `i` (через рамки: `n − len(border)`).

**33.** Напишіть `countPrefixOccurrences(s)` — для кожного `k` скільки разів префікс довжини `k` зустрічається в `s` (через `π`: рахуємо `cnt[π[i]]` і додаємо вниз).

**34.** Напишіть `maxRepeats(s)` — кількість повторів найменшого періоду (`n / period`, якщо ділиться, інакше `1`).

**35.** Напишіть `searchMany(text, patterns)` — об'єкт шаблон → масив позицій (кожен шаблон окремо через KMP).

**36.** Напишіть `longestPrefixAlsoSuffix(s)` — довжина найдовшого власного префікса-суфікса за `π`.

**37.** Напишіть `stringMatchingInArray(words)` — слова, що є підрядком іншого слова масиву.

**38.** Напишіть `buildFailureTable(p)` — таблицю «failure function» (зсув `π` на одиницю, з `-1` на початку), як у класичному описі KMP.

**39.** Напишіть `minCharsToAppendForPalindrome(s)` — мінімум символів, які треба дописати **в кінець**, щоб утворився паліндром (через KMP на розвороті).

### Рівень 4. Задачі з інтерв'ю

**40.** Яка основна ідея KMP?

**41.** Що таке префікс-функція і що означає `π[i]`?

**42.** Чому обчислення префікс-функції лінійне, хоч у ньому є вкладений `while`?

**43.** Як за допомогою префікс-функції знайти найменший період рядка?

**44.** Чим KMP відрізняється від алгоритму Рабіна—Карпа?

**45.** Як перевірити, що рядок `b` — циклічний зсув `a`?

**46.** Для чого в об'єднанні `P + '#' + T` потрібен роздільник?

**47.** Що таке автомат KMP?

**48.** Коли варто віддати перевагу іншим алгоритмам, ніж KMP?

**49.** Чому KMP знаходить усі перекриваючі входження?

**50.** Що поверне `kmpSearch('ababcabcabababd', 'ababd')`?

```js
kmpSearch('ababcabcabababd', 'ababd')
```

### Відповіді

1. `[0, 0, 1, 0, 1, 2, 3]`
2. `[0, 1, 0, 1, 2, 2, 3]`
3. `[[0, 0, 0, 1, 2, 3, 0], [0, 1, 2, 3]]`
4. `[[], [0]]`
5. `['π[0] = 0 ("a")', 'π[1] = 0 ("ab")', 'π[2] = 1 ("aba" → "a")', 'π[3] = 2 ("abab" → "ab")']`
6. `[0, 7, 9]`
7. `[0, 1, 2, 3]`
8. `[[], [], []]`
9. `[[0], []]`
10. `true`
11. `48501`
12. `1951`
13. `['aba', 'a']`
14. `[['aaa', 'aa', 'a'], []]`
15. `[3, 5, 1]`
16. `[true, false, true]`
17. `[true, false]`
18. `['aaacecaaa', 'dcbabcd']`
19. `['l', 'abab', '']`
20. `3`
21. `[{ a: 1, b: 0 }, { a: 2, b: 0 }, { a: 2, b: 3 }, { a: 1, b: 0 }]`
22. `6`
23. `[3]`
24. `[0, 3, 6]`
25. `10`
26. `6`
27. `9`
28. `[1, 4]`
29. `[[2, 5], [1, 4, 7, 10]]`
30. Приклад розв'язку:

   ```js
   const countDistinctBorders = (s) => borders(s).length
   ```

   Виклик `[countDistinctBorders('abacaba'), countDistinctBorders('abc'), countDistinctBorders('aaa')]` → `[2, 0, 2]`

31. Приклад розв'язку:

   ```js
   function strStr(h, n) {
     if (n === '') return 0;
     const r = kmpSearch(h, n);
     return r.length ? r[0] : -1;
   }
   ```

   Виклик `[strStr('sadbutsad', 'sad'), strStr('leetcode', 'leeto'), strStr('abc', '')]` → `[0, -1, 0]`

32. Приклад розв'язку:

   ```js
   function prefixFunctionAllPeriods(s) {
     const n = s.length;
     return [n, ...borders(s).map(b => n - b.length)].sort((a, b) => a - b);
   }
   ```

   Виклик `[prefixFunctionAllPeriods('abcabcab'), prefixFunctionAllPeriods('aaaa')]` → `[[3, 6, 8], [1, 2, 3, 4]]`

33. Приклад розв'язку:

   ```js
   function countPrefixOccurrences(s) {
     const pi = prefixFunction(s), n = s.length;
     const cnt = new Array(n + 1).fill(0);
     for (let i = 0; i < n; i++) cnt[pi[i]]++;
     for (let i = n - 1; i > 0; i--) cnt[pi[i - 1]] += cnt[i];
     for (let i = 0; i <= n; i++) cnt[i]++;
     return cnt.slice(1);
   }
   ```

   Виклик `[countPrefixOccurrences('abab'), countPrefixOccurrences('aaa')]` → `[[2, 2, 1, 1], [3, 2, 1]]`

34. Приклад розв'язку:

   ```js
   function maxRepeats(s) {
     const p = smallestPeriod(s);
     return s.length / p;
   }
   ```

   Виклик `[maxRepeats('abcabcabc'), maxRepeats('abcab'), maxRepeats('aaaaaa')]` → `[3, 1, 6]`

35. Приклад розв'язку:

   ```js
   const searchMany = (t, ps) => Object.fromEntries(ps.map(p => [p, kmpSearch(t, p)]))
   ```

   Виклик `searchMany('abracadabra', ['abra', 'a', 'cad', 'xyz'])` → `{ abra: [0, 7], a: [0, 3, 5, 7, 10], cad: [4], xyz: [] }`

36. Приклад розв'язку:

   ```js
   const longestPrefixAlsoSuffix = (s) => s.length ? prefixFunction(s)[s.length - 1] : 0
   ```

   Виклик `[longestPrefixAlsoSuffix('abcdabc'), longestPrefixAlsoSuffix('abcd'), longestPrefixAlsoSuffix('')]` → `[3, 0, 0]`

37. Приклад розв'язку:

   ```js
   function stringMatchingInArray(w) {
     return w.filter((x, i) => w.some((y, j) => i !== j && kmpSearch(y, x).length > 0));
   }
   ```

   Виклик `stringMatchingInArray(['mass', 'as', 'hero', 'superhero'])` → `['as', 'hero']`

38. Приклад розв'язку:

   ```js
   function buildFailureTable(p) {
     return [-1, ...prefixFunction(p).slice(0, -1)];
   }
   ```

   Виклик `buildFailureTable('abacaba')` → `[-1, 0, 0, 1, 0, 1, 2]`

39. Приклад розв'язку:

   ```js
   function minCharsToAppendForPalindrome(s) {
     const rev = s.split('').reverse().join('');
     const pi = prefixFunction(rev + '#' + s);
     return s.length - pi[pi.length - 1];
   }
   ```

   Виклик `[minCharsToAppendForPalindrome('abcd'), minCharsToAppendForPalindrome('aba'), minCharsToAppendForPalindrome('aacecaaa')]` → `[3, 0, 5]`

40. Не повертати вказівник по тексту після незбігу: частково зіставлений префікс шаблону містить власний префікс, що збігається з його суфіксом, тому шаблон можна зсунути на відомий крок, використовуючи вже встановлені збіги. Це дає лінійний час.
41. `π[i]` — довжина найдовшого власного префікса підрядка `s[0..i]`, який також є його суфіксом. Це довжина найбільшої «рамки» префікса довжини `i + 1`.
42. Змінна `k` зростає не більше ніж на 1 за ітерацію зовнішнього циклу, а `while` лише зменшує її; сумарна кількість зменшень не перевищує сумарної кількості збільшень, тобто `O(m)` — амортизований аналіз.
43. Період `p = n − π[n − 1]`; якщо `n` ділиться на `p`, рядок складається з `n / p` повторів, інакше найменший період, що ділить довжину, дорівнює `n` (немає нетривіальної повторюваної структури).
44. KMP детермінований і гарантує `O(n + m)` у всіх випадках, використовуючи префікс-функцію. Рабін—Карп порівнює хеші підрядків, у середньому `O(n + m)`, але має гірший випадок `O(n·m)` при колізіях; зате легко узагальнюється на багато шаблонів і 2D.
45. Довжини мають збігатись і `b` має бути підрядком `a + a`; пошук виконується KMP за `O(n)`.
46. Без роздільника префікс-функція могла б «перескочити» через межу й повернути рамку, що частково лежить у шаблоні, а частково в тексті. Символ, якого немає в рядках, гарантує, що `π ≤ m`.
47. Детермінований скінченний автомат, станами якого є довжини зіставленого префікса; переходи для кожного символа алфавіту обчислюють заздалегідь через префікс-функцію. Пошук виконується рівно за `n` кроків без внутрішнього `while`.
48. Для довгих шаблонів у практичних текстах швидшим буває Бойєр—Мур (сублінійний у типових випадках); для багатьох шаблонів — Aho–Corasick; для багатьох запитів до одного тексту — суфіксний масив чи автомат.
49. Після збігу ми не скидаємо `k` у нуль, а переходимо до `π[m − 1]` — найдовшої рамки шаблону: це відповідає можливому перекриттю наступного входження з поточним.
50. `[10]`
