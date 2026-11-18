# Backtracking — перебір із поверненням

Backtracking (пошук із поверненням) — систематичний перебір усіх розв'язків задачі, що будується **крок за кроком**: на кожному кроці ми **обираємо** варіант, **заглиблюємось** далі, а якщо шлях не веде до розв'язку (або ми його вже записали) — **скасовуємо** вибір і пробуємо наступний. Це «DFS по дереві рішень» із **відсіканням** безперспективних гілок. Підсумок: підмножини, перестановки, комбінації, N ферзів, судоку, пошук слів на сітці, генерація дужок — усе це один шаблон.

## 1. Дерево рішень

Розв'язок будується з послідовності виборів. Дерево: корінь — порожній частковий розв'язок; кожне ребро — один вибір; листки — повні розв'язки (або глухі кути). Backtracking обходить це дерево в глибину.

Приклад: підмножини `[1, 2, 3]`. На кожному елементі вибір: **взяти** чи **не взяти**:

```text
                 []
          /              \
      [1]                 []
     /    \              /   \
 [1,2]    [1]         [2]     []
 ...
```

Усього `2^3 = 8` листків — рівно кількість підмножин.

## 2. Універсальний шаблон

```text
function solve(стан):
    якщо стан — повний розв'язок: зберегти копію; повернутись
    для кожного варіанта вибору, допустимого зараз:
        застосувати вибір (змінити стан)
        solve(стан)
        скасувати вибір (повернути стан)        ← «back»track
```

Три ключові деталі:

1. **Зберігати копію**, а не посилання на змінний масив (`res.push(path.slice())`).
2. **Скасовувати вибір** рівно тим, що застосували (`path.pop()`, `used[i] = false`, `board[r][c] = '.'`).
3. **Відсікати** гілки, що точно не ведуть до розв'язку — це різниця між «працює» та «не вкладається в ліміт часу».

## 3. Підмножини (subsets)

`subsets([1, 2, 3])` = `[[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]`.

Реалізація «за початковим індексом»: на кожному кроці додаємо поточний шлях до результату і для `i` від `start` до `n − 1` беремо `a[i]` та йдемо далі з `i + 1`. Так кожна підмножина генерується **один раз** (елементи в зростаючому порядку індексів). Кількість — `2^n`, робота `O(n · 2^n)` (копіювання шляху).

**З дублікатами:** `subsetsWithDup([1, 2, 2])` = `[[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]`. Сортуємо й пропускаємо `a[i] === a[i − 1]` на **тому самому рівні** (`i > start`) — інакше одна підмножина з'являється кілька разів.

## 4. Перестановки (permutations)

`permutations([1, 2, 3])` = `[[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]`. Масив `used[]` — які елементи вже в шляху; на кожному кроці пробуємо будь-який невикористаний. Кількість — `n!`, і це **зростає дуже швидко**: 5! = 120, 8! = 40320, 10! = 3628800, 12! = 479001600. Тому перебір перестановок можливий лише для `n ≲ 10–11`.

**З дублікатами:** `permutationsUnique([1, 1, 2])` = `[[1, 1, 2], [1, 2, 1], [2, 1, 1]]`: сортуємо і пропускаємо `a[i] === a[i − 1] && !used[i − 1]`.

**Наступна перестановка** без рекурсії (алгоритм Нарайани): знайти найправіший `i`, що `a[i] < a[i + 1]`, найправіший `j > i` з `a[j] > a[i]`, обміняти й розвернути хвіст. `nextPermutation([1, 2, 3])` = `[1, 3, 2]`, `nextPermutation([3, 2, 1])` = `[1, 2, 3]`, `nextPermutation([1, 1, 5])` = `[1, 5, 1]`.

## 5. Комбінації та сума

- **Комбінації `C(n, k)`:** `combine(4, 2)` = `[[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]`. Відсікання: якщо залишилось менше елементів, ніж треба взяти (`n − i + 1 < k − path.length`), далі йти не має сенсу.
- **Combination sum** (елементи можна брати повторно): `combinationSum([2, 3, 6, 7], 7)` = `[[2, 2, 3], [7]]`. Відсортувати кандидатів, і коли `a[i] > залишок` — **break**: усі наступні ще більші (відсікання).
- **Combination sum II** (кожен елемент один раз, з дублікатами): `combinationSum2([10, 1, 2, 7, 6, 1, 5], 8)` = `[[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]`.

## 6. Генерація дужок

`generateParentheses(3)` = `['((()))', '(()())', '(())()', '()(())', '()()()']`. Додаємо `(`, якщо відкритих менше `n`; додаємо `)`, якщо закритих менше за відкриті. Ніколи не будуємо невалідний префікс — **відсікання на льоту**. Кількість — число Каталана `C_n = 5` для `n = 3`; 1, 2, 5, 14, 42, 132, 429, 1430 для `n = 1…8`.

## 7. N ферзів

Розставити `n` ферзів на дошці `n × n` так, щоб жоден не бив іншого. Ставимо по ферзю в **кожен рядок**; для рядка `r` пробуємо стовпці `c`. Конфлікти: той самий стовпець, **діагоналі** `r − c` та `r + c` (однакові на кожній діагоналі). Три множини (або булеві масиви) дозволяють перевірку за `O(1)`.

Кількість розв'язків: 1, 0, 0, 2, 10, 4, 40, 92, 352 для `n = 1…9` (послідовність 1, 0, 0, 2, 10, 4, 40, 92, 352). Один розв'язок для `n = 6`: `[1, 3, 5, 0, 2, 4]` (позиції стовпців у рядках).

Без відсікання перебір `n^n` позицій; з перевіркою «безпечності» — приблизно `n!` у гіршому разі, а практично значно менше: 8 ферзів — 2057 вузлів дерева пошуку проти `8^8 = 16777216`.

## 8. Пошук слова на сітці

`wordSearch(board, 'ABCCED')`: DFS від кожної клітинки; позначаємо клітинку відвіданою (замінюємо символ на `#`), після повернення **відновлюємо**. Відсікання: символ не збігається — повертаємось одразу.

`wordSearch([['A','B','C','E'],['S','F','C','S'],['A','D','E','E']], 'ABCCED')` = `true`; `'SEE'` — `true`; `'ABCB'` — `false` (клітинку не можна використати двічі).

## 9. Розбиття паліндромів і судоку

- `partitionPalindromes('aab')` = `[['a', 'a', 'b'], ['aa', 'b']]`: на кожному кроці пробуємо всі префікси, що є паліндромами. Попередня таблиця `isPal[i][j]` прискорює перевірку.
- **Судоку:** шукаємо порожню клітинку, пробуємо цифри `1–9`, перевіряючи рядок/стовпець/блок; при глухому куті повертаємо `.`. Відсікання «найбільш обмежена клітинка першою» (MRV) і множини допустимих цифр зменшують дерево в тисячі разів.

## 10. Реалізація

```js
function subsets(a) {
  const res = [];
  const path = [];
  const go = (start) => {
    res.push(path.slice());
    for (let i = start; i < a.length; i++) {
      path.push(a[i]);
      go(i + 1);
      path.pop();
    }
  };
  go(0);
  return res;
}

function subsetsWithDup(input) {
  const a = input.slice().sort((x, y) => x - y);
  const res = [];
  const path = [];
  const go = (start) => {
    res.push(path.slice());
    for (let i = start; i < a.length; i++) {
      if (i > start && a[i] === a[i - 1]) continue;
      path.push(a[i]);
      go(i + 1);
      path.pop();
    }
  };
  go(0);
  return res;
}

function permutations(a) {
  const res = [];
  const path = [];
  const used = new Array(a.length).fill(false);
  const go = () => {
    if (path.length === a.length) { res.push(path.slice()); return; }
    for (let i = 0; i < a.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(a[i]);
      go();
      path.pop();
      used[i] = false;
    }
  };
  go();
  return res;
}

function permutationsUnique(input) {
  const a = input.slice().sort((x, y) => x - y);
  const res = [];
  const path = [];
  const used = new Array(a.length).fill(false);
  const go = () => {
    if (path.length === a.length) { res.push(path.slice()); return; }
    for (let i = 0; i < a.length; i++) {
      if (used[i]) continue;
      if (i > 0 && a[i] === a[i - 1] && !used[i - 1]) continue;
      used[i] = true;
      path.push(a[i]);
      go();
      path.pop();
      used[i] = false;
    }
  };
  go();
  return res;
}

function nextPermutation(input) {
  const a = input.slice();
  let i = a.length - 2;
  while (i >= 0 && a[i] >= a[i + 1]) i--;
  if (i >= 0) {
    let j = a.length - 1;
    while (a[j] <= a[i]) j--;
    [a[i], a[j]] = [a[j], a[i]];
  }
  let l = i + 1;
  let r = a.length - 1;
  while (l < r) { [a[l], a[r]] = [a[r], a[l]]; l++; r--; }
  return a;
}

function combine(n, k) {
  const res = [];
  const path = [];
  const go = (start) => {
    if (path.length === k) { res.push(path.slice()); return; }
    for (let i = start; i <= n - (k - path.length) + 1; i++) {
      path.push(i);
      go(i + 1);
      path.pop();
    }
  };
  go(1);
  return res;
}

function combinationSum(input, target) {
  const a = input.slice().sort((x, y) => x - y);
  const res = [];
  const path = [];
  const go = (start, rest) => {
    if (rest === 0) { res.push(path.slice()); return; }
    for (let i = start; i < a.length; i++) {
      if (a[i] > rest) break;
      path.push(a[i]);
      go(i, rest - a[i]);
      path.pop();
    }
  };
  go(0, target);
  return res;
}

function combinationSum2(input, target) {
  const a = input.slice().sort((x, y) => x - y);
  const res = [];
  const path = [];
  const go = (start, rest) => {
    if (rest === 0) { res.push(path.slice()); return; }
    for (let i = start; i < a.length; i++) {
      if (a[i] > rest) break;
      if (i > start && a[i] === a[i - 1]) continue;
      path.push(a[i]);
      go(i + 1, rest - a[i]);
      path.pop();
    }
  };
  go(0, target);
  return res;
}

function generateParentheses(n) {
  const res = [];
  const go = (s, open, close) => {
    if (s.length === 2 * n) { res.push(s); return; }
    if (open < n) go(s + '(', open + 1, close);
    if (close < open) go(s + ')', open, close + 1);
  };
  go('', 0, 0);
  return res;
}

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function catalan(n) {
  return factorial(2 * n) / (factorial(n) * factorial(n + 1));
}

function solveQueens(n) {
  const res = [];
  const cols = new Set();
  const d1 = new Set();
  const d2 = new Set();
  const pos = [];
  const go = (r) => {
    if (r === n) { res.push(pos.slice()); return; }
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue;
      cols.add(c); d1.add(r - c); d2.add(r + c); pos.push(c);
      go(r + 1);
      cols.delete(c); d1.delete(r - c); d2.delete(r + c); pos.pop();
    }
  };
  go(0);
  return res;
}

function countQueens(n) {
  return solveQueens(n).length;
}

function countNodesQueens(n) {
  let nodes = 0;
  const cols = new Set();
  const d1 = new Set();
  const d2 = new Set();
  const go = (r) => {
    nodes++;
    if (r === n) return;
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue;
      cols.add(c); d1.add(r - c); d2.add(r + c);
      go(r + 1);
      cols.delete(c); d1.delete(r - c); d2.delete(r + c);
    }
  };
  go(0);
  return nodes;
}

function wordSearch(input, word) {
  const b = input.map((r) => r.slice());
  const R = b.length;
  const C = b[0].length;
  const go = (r, c, k) => {
    if (k === word.length) return true;
    if (r < 0 || c < 0 || r >= R || c >= C || b[r][c] !== word[k]) return false;
    const ch = b[r][c];
    b[r][c] = '#';
    const ok = go(r + 1, c, k + 1) || go(r - 1, c, k + 1) || go(r, c + 1, k + 1) || go(r, c - 1, k + 1);
    b[r][c] = ch;
    return ok;
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (go(r, c, 0)) return true;
  return false;
}

function partitionPalindromes(s) {
  const res = [];
  const path = [];
  const isPal = (l, r) => {
    while (l < r) if (s[l++] !== s[r--]) return false;
    return true;
  };
  const go = (start) => {
    if (start === s.length) { res.push(path.slice()); return; }
    for (let end = start; end < s.length; end++) {
      if (!isPal(start, end)) continue;
      path.push(s.slice(start, end + 1));
      go(end + 1);
      path.pop();
    }
  };
  go(0);
  return res;
}

function subsetSumTarget(a, target) {
  const res = [];
  const path = [];
  const go = (i, rest) => {
    if (rest === 0) { res.push(path.slice()); return; }
    if (i === a.length || rest < 0) return;
    path.push(a[i]);
    go(i + 1, rest - a[i]);
    path.pop();
    go(i + 1, rest);
  };
  go(0, target);
  return res;
}

function letterCombinations(digits) {
  if (!digits) return [];
  const map = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' };
  const res = [];
  const go = (i, s) => {
    if (i === digits.length) { res.push(s); return; }
    for (const ch of map[digits[i]]) go(i + 1, s + ch);
  };
  go(0, '');
  return res;
}
```

## 11. Складність

Backtracking — це **експоненційний** алгоритм за природою: ми перебираємо простір розв'язків.

| Задача | Кількість листків | Час |
|---|---|---|
| Підмножини | `2^n` | `O(n · 2^n)` |
| Перестановки | `n!` | `O(n · n!)` |
| Комбінації `C(n, k)` | `C(n, k)` | `O(k · C(n, k))` |
| Дужки | число Каталана `~4^n / n^{1.5}` | `O(4^n / √n)` |
| N ферзів | залежить від відсікання | `~ n!` у гіршому |

Пам'ять — глибина рекурсії `O(n)` + результат. Відсікання не змінює асимптотику в гіршому випадку, але на практиці скорочує перебір у **тисячі разів** (8 ферзів: 2057 вузлів замість мільйонів).

## 12. Відсікання (pruning) і оптимізації

1. **Сортування + `break`:** у combination sum, коли `a[i] > rest`.
2. **Межа решти:** недостатньо елементів, щоб набрати `k`.
3. **Структури для `O(1)` перевірки конфліктів** (множини, бітові маски): `cols |= 1 << c`.
4. **Пропуск дублікатів на одному рівні** (сортування).
5. **Мемоізація**, якщо стани повторюються (тоді це вже динамічне програмування: [dp-basics.md](../dynamic-programming/dp-basics.md)).
6. **Евристики порядку:** пробувати найобмеженіший вибір першим (MRV у судоку).
7. **Двобічний пошук / meet in the middle** для великих підмножин (`2^{n/2}`).

## 13. Типові помилки

1. **`res.push(path)` замість `res.push(path.slice())`** — усі результати вказують на один масив і наприкінці порожні.
2. **Не скасувати вибір** (`pop`, `used[i] = false`) — стан «тече» в інші гілки.
3. **Дублікати без сортування й пропуску** — повторні розв'язки.
4. **Неправильна умова пропуску дублікатів:** для підмножин `i > start`, для перестановок `!used[i − 1]`.
5. **`start` не просувається** (`go(start)` замість `go(i + 1)`) — безкінечна рекурсія чи повтори.
6. **Перебір там, де потрібне ДП:** підрахунок способів (а не їх перелік) за `O(n · target)` замість експоненти.
7. **Мутація вхідних даних** (сітка в wordSearch) без відновлення.
8. **Глибока рекурсія** на великих `n` — `RangeError`; використовуйте ітерацію або стек вручну.
9. **Забути базовий випадок** (`rest === 0`, `k === n`).

## 14. Алгоритм-шаблон

1. Визначити **стан** (шлях, використані елементи, залишок) і **умову завершення**.
2. Перебрати допустимі **вибори** на поточному кроці; відсікти недопустимі.
3. Застосувати вибір → рекурсивний виклик → **скасувати** вибір.
4. При завершенні зберегти **копію** стану.
5. Час експоненційний; ефективність забезпечує відсікання.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `subsets([1, 2, 3])`?

```js
subsets([1, 2, 3])
```

**2.** Скільки підмножин у множини з 10 елементів і скільки перестановок?

```js
[2 ** 10, factorial(10)]
```

**3.** Що поверне `subsetsWithDup([1, 2, 2])`?

```js
subsetsWithDup([1, 2, 2])
```

**4.** Скільки підмножин поверне `subsets([1, 1, 1])` без пропуску дублікатів?

```js
subsets([1, 1, 1]).length
```

**5.** Що поверне `permutations([1, 2, 3])`?

```js
permutations([1, 2, 3])
```

**6.** Скільки перестановок у `permutations([1, 2, 3, 4])`?

```js
permutations([1, 2, 3, 4]).length
```

**7.** Що поверне `permutationsUnique([1, 1, 2])`?

```js
permutationsUnique([1, 1, 2])
```

**8.** Скільки результатів дасть `permutations([1, 1, 2])` без пропуску дублікатів?

```js
permutations([1, 1, 2]).length
```

**9.** Що поверне `nextPermutation([1, 2, 3])`, `([3, 2, 1])` та `([1, 1, 5])`?

```js
[nextPermutation([1, 2, 3]), nextPermutation([3, 2, 1]), nextPermutation([1, 1, 5])]
```

**10.** Що поверне `nextPermutation([1, 3, 2])`?

```js
nextPermutation([1, 3, 2])
```

**11.** Що поверне `combine(4, 2)`?

```js
combine(4, 2)
```

**12.** Скільки комбінацій у `combine(6, 3)` і скільки `C(6, 3)`?

```js
[combine(6, 3).length, factorial(6) / (factorial(3) * factorial(3))]
```

**13.** Що поверне `combinationSum([2, 3, 6, 7], 7)`?

```js
combinationSum([2, 3, 6, 7], 7)
```

### Рівень 2. Робота алгоритму

**14.** Що поверне `combinationSum([2, 3, 5], 8)`?

```js
combinationSum([2, 3, 5], 8)
```

**15.** Що поверне `combinationSum([2], 1)`?

```js
combinationSum([2], 1)
```

**16.** Що поверне `combinationSum2([10, 1, 2, 7, 6, 1, 5], 8)`?

```js
combinationSum2([10, 1, 2, 7, 6, 1, 5], 8)
```

**17.** Що поверне `generateParentheses(3)`?

```js
generateParentheses(3)
```

**18.** Скільки рядків дають `generateParentheses(n)` для `n = 1…8`?

```js
[1, 2, 3, 4, 5, 6, 7, 8].map(n => generateParentheses(n).length)
```

**19.** Що поверне `generateParentheses(0)`?

```js
generateParentheses(0)
```

**20.** Скільки розв'язків у задачі N ферзів для `n = 1…9`?

```js
[1, 2, 3, 4, 5, 6, 7, 8, 9].map(countQueens)
```

**21.** Які розв'язки для `n = 4`?

```js
solveQueens(4)
```

**22.** Який перший розв'язок для `n = 6`?

```js
solveQueens(6)[0]
```

**23.** Скільки вузлів дерева пошуку для `n = 8` і скільки було б без відсікання (`8^8`)?

```js
[countNodesQueens(8), 8 ** 8]
```

**24.** Чи існує слово `'ABCCED'` на сітці `[['A','B','C','E'],['S','F','C','S'],['A','D','E','E']]`? А `'SEE'` та `'ABCB'`?

```js
(() => { const b = [['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']]; return ['ABCCED', 'SEE', 'ABCB'].map(w => wordSearch(b, w)); })()
```

**25.** Чи змінює `wordSearch` вхідну сітку?

```js
(() => { const b = [['A', 'B'], ['C', 'D']]; wordSearch(b, 'ABDC'); return b; })()
```

**26.** Що поверне `partitionPalindromes('aab')`?

```js
partitionPalindromes('aab')
```

### Рівень 3. Складність і нюанси

**27.** Що поверне `partitionPalindromes('a')` та `partitionPalindromes('aaa')`?

```js
[partitionPalindromes('a'), partitionPalindromes('aaa')]
```

**28.** Що поверне `subsetSumTarget([3, 34, 4, 12, 5, 2], 9)`?

```js
subsetSumTarget([3, 34, 4, 12, 5, 2], 9)
```

**29.** Що поверне `letterCombinations('23')`?

```js
letterCombinations('23')
```

**30.** Що буде, якщо додати в результат `path` без копії? Змоделюйте: `const res = []; const p = []; for (let i = 0; i < 3; i++) { p.push(i); res.push(p); }` — що в `res`?

```js
(() => { const res = []; const p = []; for (let i = 0; i < 3; i++) { p.push(i); res.push(p); } return res; })()
```

**31.** Яка кількість каталанівських чисел `C_n` для `n = 0…6` через `catalan`?

```js
[0, 1, 2, 3, 4, 5, 6].map(catalan)
```

**32.** Скільки вузлів рекурсії (викликів) створює `subsets` для масиву з 4 елементів?

```js
(() => { let calls = 0; const a = [1, 2, 3, 4]; const go = (start) => { calls++; for (let i = start; i < a.length; i++) go(i + 1); }; go(0); return calls; })()
```

**33.** Напишіть `subsetsOfSize(a, k)` — усі підмножини розміру `k`.

**34.** Напишіть `grayCode(n)` — послідовність кодів Грея довжини `2^n` (сусідні відрізняються одним бітом).

**35.** Напишіть `restoreIpAddresses(s)` — усі коректні IPv4 адреси з цифр рядка.

**36.** Напишіть `wordBreakAll(s, dict)` — усі речення, які можна скласти зі слів словника (backtracking).

**37.** Напишіть `solveSudokuCount(board)` для маленької версії: суддоку 4×4 (цифри 1–4, блоки 2×2) — кількість розв'язків; порожні клітинки — `0`.

**38.** Напишіть `pathsInGrid(grid)` — кількість шляхів зліва-угорі до справа-внизу по клітинках `0` (1 — стіна), рухи вправо/вниз (backtracking без мемоізації).

**39.** Напишіть `knightsTourExists(n)` — чи існує відкритий обхід коня на дошці `n × n` (перебір із поверненням; для `n ≤ 5`).

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `targetSumWays(nums, target)` — кількість способів розставити `+`/`−`, щоб отримати `target`.

**41.** Чому в `res.push(path.slice())` потрібна копія?

**42.** Які три кроки складають шаблон backtracking?

**43.** Як пропускають дублікати в підмножинах і перестановках, і чому умови різні?

**44.** Чому кількість підмножин `2^n`, а перестановок `n!` і що це означає для практики?

**45.** Що таке відсікання (pruning) і чому воно важливе?

**46.** Чим backtracking відрізняється від динамічного програмування?

**47.** Як N ферзів перевіряють діагоналі за `O(1)`?

**48.** Чому генерація дужок «ніколи не будує» невалідних рядків?

**49.** Чому wordSearch позначає клітинку й потім відновлює її?

**50.** Коли перебір із поверненням не підходить і що застосувати замість нього?

### Відповіді

1. `[[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]`
2. `[1024, 3628800]`
3. `[[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]`
4. `8`
5. `[[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]`
6. `24`
7. `[[1, 1, 2], [1, 2, 1], [2, 1, 1]]`
8. `6`
9. `[[1, 3, 2], [1, 2, 3], [1, 5, 1]]`
10. `[2, 1, 3]`
11. `[[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]`
12. `[20, 20]`
13. `[[2, 2, 3], [7]]`
14. `[[2, 2, 2, 2], [2, 3, 3], [3, 5]]`
15. `[]`
16. `[[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]`
17. `['((()))', '(()())', '(())()', '()(())', '()()()']`
18. `[1, 2, 5, 14, 42, 132, 429, 1430]`
19. `['']`
20. `[1, 0, 0, 2, 10, 4, 40, 92, 352]`
21. `[[1, 3, 0, 2], [2, 0, 3, 1]]`
22. `[1, 3, 5, 0, 2, 4]`
23. `[2057, 16777216]`
24. `[true, true, false]`
25. `[['A', 'B'], ['C', 'D']]`
26. `[['a', 'a', 'b'], ['aa', 'b']]`
27. `[[['a']], [['a', 'a', 'a'], ['a', 'aa'], ['aa', 'a'], ['aaa']]]`
28. `[[3, 4, 2], [4, 5]]`
29. `['ad', 'ae', 'af', 'bd', 'be', 'bf', 'cd', 'ce', 'cf']`
30. `[[0, 1, 2], [0, 1, 2], [0, 1, 2]]`
31. `[1, 1, 2, 5, 14, 42, 132]`
32. `16`
33. Приклад розв'язку:

   ```js
   function subsetsOfSize(a, k) {
     const res = [], path = [];
     const go = (s) => {
       if (path.length === k) {
         res.push(path.slice());
         return;
       }
       for (let i = s; i < a.length; i++) {
         path.push(a[i]);
         go(i + 1);
         path.pop();
       }
     };
     go(0);
     return res;
   }
   ```

   Виклик `[subsetsOfSize([1, 2, 3, 4], 2).length, subsetsOfSize([1, 2, 3], 3), subsetsOfSize([1, 2], 0)]` → `[6, [[1, 2, 3]], [[]]]`

34. Приклад розв'язку:

   ```js
   const grayCode = (n) => Array.from({ length: 1 << n }, (_, i) => i ^ (i >> 1))
   ```

   Виклик `[grayCode(2), grayCode(3)]` → `[[0, 1, 3, 2], [0, 1, 3, 2, 6, 7, 5, 4]]`

35. Приклад розв'язку:

   ```js
   function restoreIpAddresses(s) {
     const res = [];
     const go = (i, parts) => {
       if (parts.length === 4) {
         if (i === s.length) res.push(parts.join('.'));
         return;
       }
       for (let len = 1; len <= 3 && i + len <= s.length; len++) {
         const seg = s.slice(i, i + len);
         if ((seg.length > 1 && seg[0] === '0') || Number(seg) > 255) continue;
         go(i + len, [...parts, seg]);
       }
     };
     go(0, []);
     return res;
   }
   ```

   Виклик `[restoreIpAddresses('25525511135'), restoreIpAddresses('0000'), restoreIpAddresses('101023')]` → `[['255.255.11.135', '255.255.111.35'], ['0.0.0.0'], ['1.0.10.23', '1.0.102.3', '10.1.0.23', '10.10.2.3', '101.0.2.3']]`

36. Приклад розв'язку:

   ```js
   function wordBreakAll(s, dict) {
     const set = new Set(dict);
     const res = [];
     const go = (i, path) => {
       if (i === s.length) {
         res.push(path.join(' '));
         return;
       }
       for (let j = i + 1; j <= s.length; j++) {
         const w = s.slice(i, j);
         if (set.has(w)) go(j, [...path, w]);
       }
     };
     go(0, []);
     return res;
   }
   ```

   Виклик `[wordBreakAll('catsanddog', ['cat', 'cats', 'and', 'sand', 'dog']), wordBreakAll('pineapplepenapple', ['apple', 'pen', 'applepen', 'pine', 'pineapple']).length]` → `[['cat sand dog', 'cats and dog'], 3]`

37. Приклад розв'язку:

   ```js
   function solveSudokuCount(b) {
     const g = b.map(r => r.slice());
     const ok = (r, c, v) => {
       for (let i = 0; i < 4; i++) if (g[r][i] === v || g[i][c] === v) return false;
       const br = r - r % 2, bc = c - c % 2;
       for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (g[br + i][bc + j] === v) return false;
       return true;
     };
     let count = 0;
     const go = (pos) => {
       if (pos === 16) {
         count++;
         return;
       }
       const r = Math.floor(pos / 4), c = pos % 4;
       if (g[r][c] !== 0) {
         go(pos + 1);
         return;
       }
       for (let v = 1; v <= 4; v++) if (ok(r, c, v)) {
         g[r][c] = v;
         go(pos + 1);
         g[r][c] = 0;
       }
     };
     go(0);
     return count;
   }
   ```

   Виклик `[solveSudokuCount([[1, 0, 0, 0], [0, 0, 3, 0], [0, 4, 0, 0], [0, 0, 0, 2]]), solveSudokuCount([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])]` → `[1, 288]`

38. Приклад розв'язку:

   ```js
   function pathsInGrid(g) {
     const R = g.length, C = g[0].length;
     const go = (r, c) => {
       if (r >= R || c >= C || g[r][c] === 1) return 0;
       if (r === R - 1 && c === C - 1) return 1;
       return go(r + 1, c) + go(r, c + 1);
     };
     return go(0, 0);
   }
   ```

   Виклик `[pathsInGrid([[0, 0, 0], [0, 1, 0], [0, 0, 0]]), pathsInGrid([[0, 1], [0, 0]]), pathsInGrid([[1]])]` → `[2, 1, 0]`

39. Приклад розв'язку:

   ```js
   function knightsTourExists(n) {
     const mv = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
     const seen = Array.from({ length: n }, () => Array(n).fill(false));
     const go = (r, c, k) => {
       if (k === n * n) return true;
       for (const [dr, dc] of mv) {
         const nr = r + dr, nc = c + dc;
         if (nr >= 0 && nc >= 0 && nr < n && nc < n && !seen[nr][nc]) {
           seen[nr][nc] = true;
           if (go(nr, nc, k + 1)) return true;
           seen[nr][nc] = false;
         }
       }
       return false;
     };
     for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
       seen[r][c] = true;
       if (go(r, c, 1)) return true;
       seen[r][c] = false;
     }
     return false;
   }
   ```

   Виклик `[knightsTourExists(1), knightsTourExists(3), knightsTourExists(4), knightsTourExists(5)]` → `[true, false, false, true]`

40. Приклад розв'язку:

   ```js
   function targetSumWays(a, t) {
     const go = (i, s) => i === a.length ? (s === t ? 1 : 0) : go(i + 1, s + a[i]) + go(i + 1, s - a[i]);
     return go(0, 0);
   }
   ```

   Виклик `[targetSumWays([1, 1, 1, 1, 1], 3), targetSumWays([1], 1), targetSumWays([1], 2)]` → `[5, 1, 0]`

41. `path` — єдиний змінний масив, який перевикористовується на всіх гілках. Якщо додати посилання, то після повернення з рекурсії `path` змінюється (`pop`), і всі збережені «результати» вказують на той самий масив, що наприкінці порожній чи містить випадковий стан.
42. Вибір (змінити стан: `push`, `used[i] = true`), рекурсивний виклик із новим станом, скасування вибору (повернути стан: `pop`, `used[i] = false`). На базовому випадку зберігаємо копію розв'язку.
43. Спочатку сортують. У підмножинах пропускають `a[i] === a[i − 1]`, коли `i > start` (той самий рівень дерева). У перестановках — коли `a[i] === a[i − 1]` і `!used[i − 1]`: тоді рівний попередній елемент не використаний у поточному шляху, отже, ми дублюємо його вибір на цьому рівні.
44. Для кожного елемента є два варіанти (взяти чи ні) → `2^n`; перестановки — вибір першого з `n`, другого з `n − 1` тощо → `n!`. `n!` зростає швидше: 10! = 3 628 800, 15! ≈ 1,3·10¹², тому перебір перестановок можливий лише для `n` до 10–11.
45. Відмова від гілки дерева, яка гарантовано не дасть розв'язку (залишок завеликий, конфлікт ферзів, невалідний префікс дужок). Воно не змінює гірший випадок, але на практиці скорочує перебір на порядки.
46. Backtracking перебирає розв'язки (кожен шлях окремо), і складність експоненційна; ДП застосовують, коли підзадачі повторюються: зберігають їхні результати й рахують кількість чи оптимум за поліноміальний час. Якщо треба перелічити всі розв'язки — потрібен backtracking, якщо лише їх кількість або оптимум — часто ДП.
47. На одній діагоналі (↘) різниця `r − c` однакова, на іншій (↙) — сума `r + c`. Три множини (або булеві масиви) для стовпців, `r − c` і `r + c` дають перевірку й оновлення за `O(1)`.
48. Відкриваюча дужка додається, якщо відкритих менше `n`; закриваюча — лише якщо закритих менше за відкриті. Кожен префікс залишається валідним, тому глухих кутів немає й відсікання відбувається «на льоту».
49. Щоб не використати ту саму клітинку двічі в одному шляху. Позначка діє лише на поточну гілку; після повернення клітинку відновлюють, інакше інші шляхи вважали б її зайнятою.
50. Коли простір розв'язків величезний і не піддається відсіканню, або коли потрібна лише кількість чи оптимум: тоді ДП, жадібні алгоритми, meet in the middle, евристики (A*, обмежений пошук).
