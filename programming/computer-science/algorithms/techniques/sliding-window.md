# Sliding Window — ковзне вікно

Ковзне вікно — це різновид двох вказівників, де `l` і `r` обмежують **неперервний відрізок** (вікно) масиву чи рядка. Замість того щоб щоразу перераховувати характеристику відрізка з нуля (`O(k)` або `O(n)`), ми **оновлюємо** її за `O(1)` при зсуві вікна: додаємо новий правий елемент, віднімаємо лівий, що вийшов. Так задачі «найкращий підмасив / підрядок» зі складності `O(n²)` або `O(n·k)` переходять у `O(n)`.

## 1. Вікно фіксованої довжини

Задача: максимальна сума `k` підряд елементів. Наївно: для кожного початку `i` додати `k` елементів — `O((n − k + 1)·k)`.

Спостереження: сума вікна `[i, i + k)` відрізняється від суми попереднього `[i − 1, i + k − 1)` лише двома елементами: **додали** `a[i + k − 1]`, **прибрали** `a[i − 1]`. Тому

`sum_new = sum_old + a[i + k − 1] − a[i − 1]` — за `O(1)`.

Приклад: `maxSumWindow([2, 1, 5, 1, 3, 2], 3)` = `9`. Суми вікон: `[8, 7, 9, 6]` → найбільша `9` (вікно `5, 1, 3`).

Типові задачі фіксованого вікна: середнє `k` елементів, максимум у кожному вікні (потрібна ще [монотонна черга](monotonic-stack.md)), кількість голосних у підрядку довжини `k`, анаграми в рядку (вікно довжини `|p|` порівнюється за лічильниками літер).

## 2. Вікно змінної довжини

Тепер довжина вікна не задана: треба знайти **найкоротше/найдовше** вікно, що задовольняє умову. Схема:

1. `r` рухається вправо і **розширює** вікно (додаємо `a[r]` до стану).
2. Поки вікно **порушує** умову (або, навпаки, поки задовольняє — для мінімуму), `l` рухається вправо і **стискає** вікно (віднімаємо `a[l]` зі стану).
3. На кожному кроці оновлюємо відповідь.

Чому це `O(n)`? Кожен індекс **заходить** у вікно (через `r`) один раз і **виходить** (через `l`) один раз. Усього не більше `2n` рухів, хоч у коді є вкладений цикл `while`. Це класична ілюзія вкладеності: амортизований аналіз.

### 2.1. Найдовший підрядок без повторів

`lengthOfLongestSubstring('abcabcbb')` = `3` (`abc`), `'bbbbb'` → `1`, `'pwwkew'` → `3` (`wke`). Стан — множина (чи карта «символ → останній індекс») символів у вікні. Коли `s[r]` уже є у вікні — зсуваємо `l` за його попередню позицію.

### 2.2. Найкоротший підмасив із сумою ≥ `target`

Для додатних чисел: розширюємо `r`, поки сума `< target`; коли `≥` — стискаємо `l`, оновлюючи мінімум. `minSubArrayLen(7, [2, 3, 1, 2, 4, 3])` = `2` (підмасив `[4, 3]`). **Додатність** — умова: рух `l` вправо гарантовано зменшує суму, тому умова «монотонна». З від'ємними числами вікно не працює (використовуйте префіксні суми — [prefix-sums.md](prefix-sums.md)).

### 2.3. Не більше `k` різних символів

`longestKDistinct('eceba', 2)` = `3` (`ece`). Стан — карта «символ → кількість у вікні»; коли різних символів стає більше за `k`, стискаємо, поки не повернемось до `k`.

### 2.4. Мінімальне вікно, що містить усі символи `t`

`minWindow('ADOBECODEBANC', 'ABC')` = `'BANC'`. Лічильник `need` для літер `t` і змінна `missing` — скільки ще літер бракує. Розширюємо, доки `missing > 0`; коли `missing === 0` — вікно валідне, стискаємо зліва, фіксуючи мінімум.

### 2.5. «Заміна символів»: найдовше повторюване вікно

`characterReplacement('AABABBA', 1)` = `4`: вікно допустиме, якщо `довжина − максимальна частота літери ≤ k`.

### 2.6. Максимум одиниць із `k` інверсіями

`longestOnes([1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2)` = `6`: вікно допустиме, якщо нулів у ньому `≤ k`.

## 3. Реалізація

```js
function windowSums(a, k) {
  if (k > a.length) return [];
  let s = 0;
  for (let i = 0; i < k; i++) s += a[i];
  const out = [s];
  for (let i = k; i < a.length; i++) {
    s += a[i] - a[i - k];
    out.push(s);
  }
  return out;
}

function maxSumWindow(a, k) {
  const sums = windowSums(a, k);
  return sums.length ? Math.max(...sums) : null;
}

function lengthOfLongestSubstring(s) {
  const last = new Map();
  let l = 0;
  let best = 0;
  for (let r = 0; r < s.length; r++) {
    if (last.has(s[r]) && last.get(s[r]) >= l) l = last.get(s[r]) + 1;
    last.set(s[r], r);
    best = Math.max(best, r - l + 1);
  }
  return best;
}

function minSubArrayLen(target, a) {
  let l = 0;
  let sum = 0;
  let best = Infinity;
  for (let r = 0; r < a.length; r++) {
    sum += a[r];
    while (sum >= target) {
      best = Math.min(best, r - l + 1);
      sum -= a[l++];
    }
  }
  return best === Infinity ? 0 : best;
}

function longestKDistinct(s, k) {
  const cnt = new Map();
  let l = 0;
  let best = 0;
  for (let r = 0; r < s.length; r++) {
    cnt.set(s[r], (cnt.get(s[r]) || 0) + 1);
    while (cnt.size > k) {
      cnt.set(s[l], cnt.get(s[l]) - 1);
      if (cnt.get(s[l]) === 0) cnt.delete(s[l]);
      l++;
    }
    best = Math.max(best, r - l + 1);
  }
  return best;
}

function minWindow(s, t) {
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  let missing = t.length;
  let l = 0;
  let bestL = 0;
  let bestLen = Infinity;
  for (let r = 0; r < s.length; r++) {
    if (need.has(s[r])) {
      if (need.get(s[r]) > 0) missing--;
      need.set(s[r], need.get(s[r]) - 1);
    }
    while (missing === 0) {
      if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestL = l; }
      if (need.has(s[l])) {
        need.set(s[l], need.get(s[l]) + 1);
        if (need.get(s[l]) > 0) missing++;
      }
      l++;
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestL, bestL + bestLen);
}

function characterReplacement(s, k) {
  const cnt = {};
  let l = 0;
  let maxF = 0;
  let best = 0;
  for (let r = 0; r < s.length; r++) {
    cnt[s[r]] = (cnt[s[r]] || 0) + 1;
    maxF = Math.max(maxF, cnt[s[r]]);
    while (r - l + 1 - maxF > k) {
      cnt[s[l]]--;
      l++;
    }
    best = Math.max(best, r - l + 1);
  }
  return best;
}

function longestOnes(a, k) {
  let l = 0;
  let zeros = 0;
  let best = 0;
  for (let r = 0; r < a.length; r++) {
    if (a[r] === 0) zeros++;
    while (zeros > k) {
      if (a[l] === 0) zeros--;
      l++;
    }
    best = Math.max(best, r - l + 1);
  }
  return best;
}

function findAnagrams(s, p) {
  const out = [];
  const need = new Array(26).fill(0);
  const have = new Array(26).fill(0);
  for (const c of p) need[c.charCodeAt(0) - 97]++;
  for (let r = 0; r < s.length; r++) {
    have[s.charCodeAt(r) - 97]++;
    if (r >= p.length) have[s.charCodeAt(r - p.length) - 97]--;
    if (r >= p.length - 1 && have.every((x, i) => x === need[i])) out.push(r - p.length + 1);
  }
  return out;
}

function maxSlidingWindow(a, k) {
  const dq = [];
  const out = [];
  for (let i = 0; i < a.length; i++) {
    while (dq.length && dq[0] <= i - k) dq.shift();
    while (dq.length && a[dq[dq.length - 1]] <= a[i]) dq.pop();
    dq.push(i);
    if (i >= k - 1) out.push(a[dq[0]]);
  }
  return out;
}

function maxVowels(s, k) {
  const v = new Set('aeiou');
  let cur = 0;
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    if (v.has(s[i])) cur++;
    if (i >= k && v.has(s[i - k])) cur--;
    if (i >= k - 1) best = Math.max(best, cur);
  }
  return best;
}
```

## 4. Як розпізнати, що потрібне вікно

Ознаки задачі:

- шукаємо **неперервний** підмасив/підрядок (не підпослідовність);
- є **оптимум** (найдовший, найкоротший, максимальна сума) або підрахунок за умовою;
- умова **монотонна**: якщо вікно `[l, r]` валідне, то й менше вікно всередині (або навпаки) теж валідне — так можна рухати вказівники без повернення.

Шаблон для **найдовшого** валідного вікна: розширюємо `r`; поки вікно **невалідне** — зсуваємо `l`; оновлюємо `best` після відновлення валідності. Шаблон для **найкоротшого**: розширюємо до валідності; поки **валідне** — оновлюємо `best` і стискаємо.

## 5. Фіксоване vs змінне вікно: порівняння

| | Фіксоване | Змінне |
|---|---|---|
| Довжина | `k` дана | залежить від умови |
| `l` | `r − k + 1` | рухається за умовою |
| Стан | сума, лічильники | карта, лічильники, множина |
| Складність | `O(n)` | `O(n)` амортизовано |

## 6. Складність

- **Час `O(n)`:** `r` робить `n` кроків, `l` — не більше `n` (ніколи не повертається назад).
- **Пам'ять:** `O(1)` для сум, `O(σ)` для лічильників алфавіту розміру `σ` (26, 128, 256), `O(n)` у найгіршому випадку для карти унікальних елементів.
- **Операції зі станом мають бути `O(1)`:** сума, лічильник, карта. Якщо для підтримки стану потрібне сортування чи пошук максимуму у вікні, використовують [монотонну чергу](monotonic-stack.md) (`maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3)` = `[3, 3, 5, 5, 6, 7]`) або дерево.

## 7. Типові помилки

1. **Забути відняти елемент, що виходить** — сума/лічильник накопичує зайве.
2. **Порушена умова на першому вікні:** при `k > n` результату немає; перевіряйте.
3. **`l` обганяє `r`** при стисканні для від'ємних чисел чи `target = 0`: потрібна перевірка `l <= r`.
4. **Використовувати для підпослідовностей** — вікно лише для неперервних.
5. **Використовувати з від'ємними числами для сум** — немонотонність; префіксні суми й хеш-таблиця.
6. **Забути видалити ключ із карти** при нульовому лічильнику, і `size` показує хибну кількість різних символів.
7. **Хибна міра валідності в `characterReplacement`:** `maxF` не зменшують при стисканні — це коректно (нам цікаві лише більші вікна), але легко «виправити» за звичкою й зламати.
8. **Оновлювати відповідь до відновлення валідності** — враховується невалідне вікно.
9. **Індекси:** довжина вікна `r − l + 1`, а не `r − l`.

## 8. Алгоритм-шаблон

1. `l = 0`, стан порожній, `best` початкове значення.
2. Для `r` від `0` до `n − 1`: додати `a[r]` до стану.
3. Поки стан порушує (або задовольняє, для мінімуму) умову: оновити/перевірити відповідь, видалити `a[l]` зі стану, `l++`.
4. Оновити відповідь (для найдовшого — після відновлення валідності).
5. Час `O(n)`, пам'ять — розмір стану.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Які суми вікон довжини 3 дасть `windowSums([2, 1, 5, 1, 3, 2], 3)`?

```js
windowSums([2, 1, 5, 1, 3, 2], 3)
```

**2.** Що поверне `maxSumWindow([2, 1, 5, 1, 3, 2], 3)`?

```js
maxSumWindow([2, 1, 5, 1, 3, 2], 3)
```

**3.** Що поверне `maxSumWindow`, коли `k` більше за довжину масиву?

```js
maxSumWindow([1, 2], 5)
```

**4.** Що поверне `windowSums([4], 1)` та `windowSums([], 1)`?

```js
[windowSums([4], 1), windowSums([], 1)]
```

**5.** Що поверне `maxSumWindow([-3, -1, -2], 2)`?

```js
maxSumWindow([-3, -1, -2], 2)
```

**6.** Скільки операцій додавання виконає `windowSums` для `n = 1000`, `k = 100` (початкова сума + зсуви) порівняно з наївним `(n − k + 1)·k`?

```js
[100 + (1000 - 100), (1000 - 100 + 1) * 100]
```

**7.** Що поверне `lengthOfLongestSubstring('abcabcbb')`?

```js
lengthOfLongestSubstring('abcabcbb')
```

**8.** А для `'bbbbb'`, `'pwwkew'` і порожнього рядка?

```js
['bbbbb', 'pwwkew', ''].map(lengthOfLongestSubstring)
```

**9.** А для `'abba'`? (перевірка умови `last.get(c) >= l`)

```js
lengthOfLongestSubstring('abba')
```

**10.** Що поверне `minSubArrayLen(7, [2, 3, 1, 2, 4, 3])`?

```js
minSubArrayLen(7, [2, 3, 1, 2, 4, 3])
```

**11.** Що поверне `minSubArrayLen(100, [1, 2, 3])` та `minSubArrayLen(4, [1, 4, 4])`?

```js
[minSubArrayLen(100, [1, 2, 3]), minSubArrayLen(4, [1, 4, 4])]
```

**12.** Що поверне `longestKDistinct('eceba', 2)` та `'aa'` при `k = 1`?

```js
[longestKDistinct('eceba', 2), longestKDistinct('aa', 1)]
```

**13.** Що поверне `longestKDistinct('abc', 0)`?

```js
longestKDistinct('abc', 0)
```

### Рівень 2. Робота алгоритму

**14.** Що поверне `minWindow('ADOBECODEBANC', 'ABC')`?

```js
minWindow('ADOBECODEBANC', 'ABC')
```

**15.** Що поверне `minWindow('a', 'aa')` та `minWindow('a', 'a')`?

```js
[minWindow('a', 'aa'), minWindow('a', 'a')]
```

**16.** Що поверне `characterReplacement('AABABBA', 1)` та `('ABAB', 2)`?

```js
[characterReplacement('AABABBA', 1), characterReplacement('ABAB', 2)]
```

**17.** Що поверне `longestOnes([1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2)`?

```js
longestOnes([1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2)
```

**18.** Що поверне `longestOnes([0, 0, 0], 0)` і `longestOnes([1, 1], 0)`?

```js
[longestOnes([0, 0, 0], 0), longestOnes([1, 1], 0)]
```

**19.** Які позиції анаграм `'abc'` у `'cbaebabacd'` знайде `findAnagrams`?

```js
findAnagrams('cbaebabacd', 'abc')
```

**20.** А для `findAnagrams('abab', 'ab')`?

```js
findAnagrams('abab', 'ab')
```

**21.** Що поверне `maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3)`?

```js
maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3)
```

**22.** Що поверне `maxSlidingWindow([9, 8, 7, 6], 2)` (спадний) і `[1, 2, 3, 4]` (зростаючий)?

```js
[maxSlidingWindow([9, 8, 7, 6], 2), maxSlidingWindow([1, 2, 3, 4], 2)]
```

**23.** Що поверне `maxVowels('abciiidef', 3)` та `maxVowels('leetcode', 3)`?

```js
[maxVowels('abciiidef', 3), maxVowels('leetcode', 3)]
```

**24.** Чому `minSubArrayLen` не підходить для від'ємних чисел? Порівняйте його результат для `(3, [-2, -2, 3])` із правильним (підмасив `[3]` має довжину 1).

```js
[minSubArrayLen(3, [-2, -2, 3]), 1]
```

**25.** Скільки разів загалом виконується тіло внутрішнього `while` у `minSubArrayLen` для масиву з 1000 одиниць і `target = 3`? (амортизація: не більше `n`)

```js
(() => { const a = Array(1000).fill(1); let l = 0, s = 0, n = 0; for (let r = 0; r < a.length; r++) { s += a[r]; while (s >= 3) { n++; s -= a[l++]; } } return n; })()
```

**26.** Скільки разів `lengthOfLongestSubstring` пересуне `l` у `'abcdabcdabcd'`?

```js
(() => { const s = 'abcdabcdabcd'; const last = new Map(); let l = 0, moves = 0; for (let r = 0; r < s.length; r++) { if (last.has(s[r]) && last.get(s[r]) >= l) { moves += last.get(s[r]) + 1 - l; l = last.get(s[r]) + 1; } last.set(s[r], r); } return moves; })()
```

### Рівень 3. Складність і нюанси

**27.** Що поверне `longestKDistinct('aabbcc', 2)`?

```js
longestKDistinct('aabbcc', 2)
```

**28.** Скільки різних вікон довжини 3 є в масиві з 10 елементів?

```js
10 - 3 + 1
```

**29.** Що поверне `characterReplacement('', 2)` і `('A', 0)`?

```js
[characterReplacement('', 2), characterReplacement('A', 0)]
```

**30.** Максимальна кількість голосних у вікні довжини 2 для `'aeiou'`?

```js
maxVowels('aeiou', 2)
```

**31.** Напишіть `averageOfWindows(a, k)` — масив середніх значень вікон довжини `k`.

**32.** Напишіть `containsNearbyDuplicate(a, k)` — чи є два однакові елементи з відстанню індексів `≤ k` (вікно + множина).

**33.** Напишіть `maxConsecutiveAfterFlip(a, k)` — найдовший відрізок із однакових значень `true` після інверсії не більше `k` значень `false` (для булів).

**34.** Напишіть `numSubarraysProductLessThanK(a, k)` — кількість неперервних підмасивів із добутком `< k` (додатні числа).

**35.** Напишіть `fruitIntoBaskets(fruits)` — найдовший відрізок не більш ніж із двома різними значеннями.

**36.** Напишіть `permutationInString(p, s)` — чи містить `s` перестановку `p` як підрядок.

**37.** Напишіть `subarraysWithAtMostK(a, k)` — кількість підмасивів із не більше ніж `k` різними значеннями.

**38.** Напишіть `subarraysExactlyK(a, k)` — кількість підмасивів із рівно `k` різними значеннями (як `atMost(k) − atMost(k − 1)`).

**39.** Напишіть `maxScoreFromEnds(cards, k)` — максимальна сума `k` карт, взятих з країв (мінімізуйте суму вікна довжини `n − k`).

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `longestSubarrayAfterDelete(a)` — найдовший підмасив з одиниць після видалення рівно одного елемента (бінарний масив).

**41.** Чому змінне вікно працює за `O(n)`, хоч у коді є вкладений цикл `while`?

**42.** Як розпізнати, що задачу можна розв'язати ковзним вікном?

**43.** Чому ковзне вікно не годиться для суми підмасиву з від'ємними числами?

**44.** Як перейти від «рівно `k`» до «не більше `k`»?

**45.** Чому у вікні `[l, r]` кількість підмасивів, що закінчуються в `r`, дорівнює `r − l + 1`?

**46.** Яку структуру використовують, щоб підтримувати максимум у ковзному вікні за `O(1)` амортизовано?

**47.** Чим відрізняється вікно фіксованого розміру від змінного за способом руху `l`?

**48.** Чому в `characterReplacement` можна не зменшувати `maxF` під час стискання вікна?

**49.** Чому в `lengthOfLongestSubstring` порівнюють `last.get(c) >= l`?

**50.** У чому відмінність між вікном і двома вказівниками «назустріч»?

### Відповіді

1. `[8, 7, 9, 6]`
2. `9`
3. `null`
4. `[[4], []]`
5. `-3`
6. `[1000, 90100]`
7. `3`
8. `[1, 3, 0]`
9. `2`
10. `2`
11. `[0, 1]`
12. `[3, 2]`
13. `0`
14. `'BANC'`
15. `['', 'a']`
16. `[4, 4]`
17. `6`
18. `[0, 2]`
19. `[0, 6]`
20. `[0, 1, 2]`
21. `[3, 3, 5, 5, 6, 7]`
22. `[[9, 8, 7], [2, 3, 4]]`
23. `[3, 2]`
24. `[0, 1]`
25. `998`
26. `8`
27. `4`
28. `8`
29. `[0, 1]`
30. `2`
31. Приклад розв'язку:

   ```js
   function averageOfWindows(a, k) {
     return windowSums(a, k).map(s => s / k);
   }
   ```

   Виклик `averageOfWindows([1, 3, 2, 6, -1, 4, 1, 8, 2], 5)` → `[2.2, 2.8, 2.4, 3.6, 2.8]`

32. Приклад розв'язку:

   ```js
   function containsNearbyDuplicate(a, k) {
     const w = new Set();
     for (let i = 0; i < a.length; i++) {
       if (w.has(a[i])) return true;
       w.add(a[i]);
       if (w.size > k) w.delete(a[i - k]);
     }
     return false;
   }
   ```

   Виклик `[containsNearbyDuplicate([1, 2, 3, 1], 3), containsNearbyDuplicate([1, 0, 1, 1], 1), containsNearbyDuplicate([1, 2, 3, 1, 2, 3], 2)]` → `[true, true, false]`

33. Приклад розв'язку:

   ```js
   function maxConsecutiveAfterFlip(a, k) {
     let l = 0, f = 0, best = 0;
     for (let r = 0; r < a.length; r++) {
       if (!a[r]) f++;
       while (f > k) {
         if (!a[l]) f--;
         l++;
       }
       best = Math.max(best, r - l + 1);
     }
     return best;
   }
   ```

   Виклик `[maxConsecutiveAfterFlip([true, false, true, true, false], 1), maxConsecutiveAfterFlip([false, false], 0)]` → `[4, 0]`

34. Приклад розв'язку:

   ```js
   function numSubarraysProductLessThanK(a, k) {
     if (k <= 1) return 0;
     let l = 0, p = 1, c = 0;
     for (let r = 0; r < a.length; r++) {
       p *= a[r];
       while (p >= k) p /= a[l++];
       c += r - l + 1;
     }
     return c;
   }
   ```

   Виклик `[numSubarraysProductLessThanK([10, 5, 2, 6], 100), numSubarraysProductLessThanK([1, 2, 3], 0)]` → `[8, 0]`

35. Приклад розв'язку:

   ```js
   const fruitIntoBaskets = (f) => longestKDistinct(f.join(','), 2) && (() => { const cnt = new Map(); let l = 0, best = 0; for (let r = 0; r < f.length; r++) { cnt.set(f[r], (cnt.get(f[r]) || 0) + 1); while (cnt.size > 2) { cnt.set(f[l], cnt.get(f[l]) - 1); if (!cnt.get(f[l])) cnt.delete(f[l]); l++; } best = Math.max(best, r - l + 1); } return best; })()
   ```

   Виклик `[fruitIntoBaskets([1, 2, 1]), fruitIntoBaskets([0, 1, 2, 2]), fruitIntoBaskets([1, 2, 3, 2, 2])]` → `[3, 3, 4]`

36. Приклад розв'язку:

   ```js
   const permutationInString = (p, s) => findAnagrams(s, p).length > 0
   ```

   Виклик `[permutationInString('ab', 'eidbaooo'), permutationInString('ab', 'eidboaoo')]` → `[true, false]`

37. Приклад розв'язку:

   ```js
   function subarraysWithAtMostK(a, k) {
     const cnt = new Map();
     let l = 0, total = 0;
     for (let r = 0; r < a.length; r++) {
       cnt.set(a[r], (cnt.get(a[r]) || 0) + 1);
       while (cnt.size > k) {
         cnt.set(a[l], cnt.get(a[l]) - 1);
         if (!cnt.get(a[l])) cnt.delete(a[l]);
         l++;
       }
       total += r - l + 1;
     }
     return total;
   }
   ```

   Виклик `[subarraysWithAtMostK([1, 2, 1, 2, 3], 2), subarraysWithAtMostK([1, 1, 1], 1)]` → `[12, 6]`

38. Приклад розв'язку:

   ```js
   function subarraysExactlyK(a, k) {
     const atMost = (kk) => {
       const cnt = new Map();
       let l = 0, t = 0;
       for (let r = 0; r < a.length; r++) {
         cnt.set(a[r], (cnt.get(a[r]) || 0) + 1);
         while (cnt.size > kk) {
           cnt.set(a[l], cnt.get(a[l]) - 1);
           if (!cnt.get(a[l])) cnt.delete(a[l]);
           l++;
         }
         t += r - l + 1;
       }
       return t;
     };
     return atMost(k) - atMost(k - 1);
   }
   ```

   Виклик `[subarraysExactlyK([1, 2, 1, 2, 3], 2), subarraysExactlyK([1, 2, 1, 3, 4], 3)]` → `[7, 3]`

39. Приклад розв'язку:

   ```js
   function maxScoreFromEnds(c, k) {
     const n = c.length, w = n - k;
     const total = c.reduce((s, x) => s + x, 0);
     if (w === 0) return total;
     let cur = 0;
     for (let i = 0; i < w; i++) cur += c[i];
     let min = cur;
     for (let i = w; i < n; i++) {
       cur += c[i] - c[i - w];
       min = Math.min(min, cur);
     }
     return total - min;
   }
   ```

   Виклик `[maxScoreFromEnds([1, 2, 3, 4, 5, 6, 1], 3), maxScoreFromEnds([2, 2, 2], 2), maxScoreFromEnds([9, 7, 7, 9, 7, 7, 9], 7)]` → `[12, 4, 55]`

40. Приклад розв'язку:

   ```js
   function longestSubarrayAfterDelete(a) {
     let l = 0, zeros = 0, best = 0;
     for (let r = 0; r < a.length; r++) {
       if (a[r] === 0) zeros++;
       while (zeros > 1) {
         if (a[l] === 0) zeros--;
         l++;
       }
       best = Math.max(best, r - l);
     }
     return best;
   }
   ```

   Виклик `[longestSubarrayAfterDelete([1, 1, 0, 1]), longestSubarrayAfterDelete([0, 1, 1, 1, 0, 1, 1, 0, 1]), longestSubarrayAfterDelete([1, 1, 1])]` → `[3, 5, 2]`

41. Кожен індекс потрапляє у вікно через `r` рівно один раз і покидає через `l` не більше одного разу. Внутрішній цикл сумарно виконує не більше `n` ітерацій за весь прохід, тому разом `≤ 2n` кроків — амортизований аналіз.
42. Потрібно знайти неперервний підмасив чи підрядок із екстремальною властивістю, а умова валідності монотонна: розширення вікна лише погіршує/покращує її в один бік, а стиснення — в протилежний. Тоді вказівники не повертаються назад.
43. Додавання елемента може зменшити суму, а видалення — збільшити, тож умова «сума ≥ target» не монотонна відносно розміру вікна. Потрібні префіксні суми й хеш-таблиця або інші підходи.
44. Кількість підмасивів із рівно `k` різними значеннями дорівнює `atMost(k) − atMost(k − 1)`, а `atMost` вікном рахується просто: для кожного `r` додаємо довжину найбільшого валідного вікна `r − l + 1`.
45. Якщо вікно `[l, r]` валідне й валідність зберігається при звуженні, то валідні всі підмасиви `[l, r]`, `[l + 1, r]`, …, `[r, r]` — їх рівно `r − l + 1`. На цьому ґрунтується підрахунок підмасивів із обмеженням.
46. Монотонну чергу (deque) з індексами: зберігаємо індекси спадних значень, видаляємо з кінця менші за новий елемент і з початку — індекси, що вийшли з вікна. Максимум завжди на початку.
47. У фіксованому `l` визначається арифметично (`r − k + 1`), тому достатньо одного циклу; у змінному `l` рухається умовою (`while`) і може зсуватись нерівномірно.
48. Відповідь може лише зростати, коли `maxF` збільшується; завищене старе `maxF` лише дозволяє вікну не зменшуватись (воно просто «ковзає» без росту), а нова більша відповідь можлива тільки при справжньому збільшенні `maxF`.
49. Карта зберігає останню позицію символа навіть коли він уже вийшов із вікна. Якщо ця позиція ліворуч від `l`, повторення відсутнє у поточному вікні, і зсувати `l` назад не можна: у `'abba'` без перевірки `l` повернувся б на старе значення.
50. Вікно описує відрізок `[l, r]` і підтримує його характеристику; обидва вказівники рухаються в один бік. «Назустріч» стартує з кінців і зближується, використовуючи упорядкованість, а не поточний стан відрізка.
