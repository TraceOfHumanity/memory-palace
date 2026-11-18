# Merge Sort — сортування злиттям

Усі виводи — реальним запуском (Node 24), реалізація перевірена на 300 випадкових масивах.

## 1. Ідея: розділяй і володарюй

1. **Розділи** масив навпіл.
2. **Відсортуй** кожну половину **рекурсивно**.
3. **Злий** дві відсортовані половини в один відсортований масив — рухаючись двома вказівниками й щоразу беручи менший елемент.

База рекурсії: масив із 0 або 1 елемента вже відсортований. Тут уся «магія» — у **злитті**: два відсортованих масиви зливаються за один лінійний прохід.

## 2. Приклад: `[5, 2, 9, 1, 5, 6]`

Реальний трасувальний вивід злиттів (знизу вгору):

| Злиття | Результат |
|---|---|
| `[2] + [9]` | `[2, 9]` |
| `[5] + [2, 9]` | `[2, 5, 9]` |
| `[5] + [6]` | `[5, 6]` |
| `[1] + [5, 6]` | `[1, 5, 6]` |
| `[2, 5, 9] + [1, 5, 6]` | `[1, 2, 5, 5, 6, 9]` |

Розбиття: `[5 2 9 1 5 6]` → `[5 2 9] [1 5 6]` → `[5] [2 9]`, `[1] [5 6]` → … Разом **10 порівнянь, 16 записів**.

## 3. Реалізація

```js
function mergeSort(a) {
  if (a.length < 2) return a;                    // база
  const mid = a.length >> 1;
  const left = mergeSort(a.slice(0, mid));       // розділи
  const right = mergeSort(a.slice(mid));
  return merge(left, right);                     // злий
}

function merge(l, r) {
  const out = [];
  let i = 0, j = 0;
  while (i < l.length && j < r.length) {
    out.push(l[i] <= r[j] ? l[i++] : r[j++]);    // <= → стабільність
  }
  while (i < l.length) out.push(l[i++]);         // хвіст лівого
  while (j < r.length) out.push(r[j++]);         // хвіст правого
  return out;
}
```
**`<=`** (а не `<`) при рівних бере елемент із **лівої** половини першим → зберігається початковий порядок → **стабільне**.

## 4. Складність (виміряно)

Рекурсія: `T(n) = 2·T(n/2) + O(n)` → за Master theorem **`O(n log n)`** (див. [big-o-notation.md](big-o-notation.md)). Рівнів `⌈log₂ n⌉`, на кожному злиття всіх `n` елементів.

Порівнянь / записів:

| n | Дані | Порівнянь | Записів |
|---|---|---|---|
| 10 | випадкові | 21 | 34 |
| 10 | відсортовані | 15 | 34 |
| 10 | зворотні | 19 | 34 |
| 100 | випадкові | 532 | 672 |
| 100 | відсортовані | 316 | 672 |
| 100 | зворотні | 358 | 672 |
| 1 000 | випадкові | 8 717 | 9 976 |
| 1 000 | відсортовані | 4 932 | 9 976 |
| 1 000 | зворотні | 5 071 | 9 976 |

- Записів завжди ≈ `n·⌈log₂ n⌉` (для 1000: **9 976**); порівнянь від `½ n log₂ n` (відсортований: 4 932) до `n log₂ n − n + 1` (≈ 8 967 максимум).
- **Усі випадки `O(n log n)`** — передбачуваний, гарантований час. Це відрізняє його від quick sort (найгірший `O(n²)`).
- **Пам'ять:** `O(n)` (допоміжні масиви; у наведеній реалізації `slice` створює копії на кожному рівні — загалом `n·log n` елементів проходить через `slice`: **9 976** для `n = 1000`, але одночасно живе `O(n)`).
- **Стабільне:** так.

## 5. Час (ця машина, випадкові дані)

| n | merge | quick | `Array.sort` | insertion | bubble |
|---|---|---|---|---|---|
| 1 000 | 0,2 мс | 0,1 | 0,2 | 0,3 | 0,7 |
| 10 000 | 2,8 | 1,4 | 1,7 | 31 | 67 |
| 20 000 | 6,2 | 3,2 | 2,9 | 128 | 440 |
| 100 000 | 31,9 | 18,3 | 17,2 | — | — |
| 1 000 000 | 413 | 214 | 207 | — | — |

Для 20 000 елементів: merge ≈ 6 мс проти bubble ≈ 440 мс (**70×**). Наша `slice`-версія приблизно вдвічі повільніша за quick та вбудований `sort` через виділення пам'яті.

## 6. Варіанти і оптимізації

- **Один допоміжний буфер:** виділити `tmp` розміру `n` один раз і зливати індексами — без `slice`, менше сміття.
- **Bottom-up (ітеративний):** без рекурсії — зливати блоки розміру 1, 2, 4, 8, … Немає ліміту стеку.
- **Гібрид з insertion sort:** для фрагментів ≤ 16–32 елементів — insertion sort (швидший на малих). Саме так працює **TimSort** (`Array.prototype.sort` у V8 з 2018, v7.0 — стабільний).
- **Природне злиття (natural merge sort / TimSort):** використовує вже наявні відсортовані «пробіги» (runs) → на майже відсортованих даних `O(n)`.
- **Зв'язні списки:** merge sort ідеальний — злиття без додаткової пам'яті (`O(1)`), без довільного доступу.
- **Зовнішнє сортування:** дані більші за RAM — сортують шматки, зливають з диска (K-way merge).
- **Підрахунок інверсій:** при злитті, коли береться елемент з правої половини, лівий залишок — це інверсії; `O(n log n)`.

## 7. Порівняння

| | Merge | Quick | Insertion |
|---|---|---|---|
| Найгірший | `O(n log n)` | `O(n²)` | `O(n²)` |
| Пам'ять | `O(n)` | `O(log n)` | `O(1)` |
| Стабільний | так | ні | так |
| Кеш/швидкість на масивах | трохи повільніший | швидший | швидкий на малих |

Коли обирати merge sort: потрібна **стабільність**, **гарантований** `O(n log n)`, сортування **зв'язних списків** або **зовнішніх** даних.

## 8. Типові помилки

1. `<` замість `<=` у злитті — втрата стабільності.
2. Забути **хвости** після основного циклу злиття — частина елементів загубиться.
3. **Середина:** `Math.floor((l + r) / 2)`; у мовах із фіксованими цілими `(l + r)` переповнюється — безпечніше `l + ((r - l) >> 1)`.
4. Зайві копії (`slice`) на кожному рівні — працює, але повільніше й більше сміття.
5. **Забути базу** (`length < 2`) → нескінченна рекурсія/`RangeError`.
6. Очікувати, що сортування «на місці» — класичний merge sort потребує `O(n)` додаткової пам'яті.
7. Використовувати для масивів з кількох елементів — накладні витрати вищі за insertion sort.
8. Не відрізняти `Array.sort()` без компаратора: `[10, 9, 1, 100, 25].sort()` → `[1, 10, 100, 25, 9]` (рядкове порівняння); для чисел — `(a, b) => a - b`.

## 9. Алгоритм

1. Якщо довжина `< 2` — повернути масив.
2. Знайти середину; **відсортувати** ліву і праву половини рекурсивно.
3. **Злити**: два вказівники `i`, `j`; поки обидва в межах — взяти менший (`<=` → ліворуч), потім дописати хвости.
4. Складність: час `O(n log n)` завжди, пам'ять `O(n)`, стабільне.

## Задачі для закріплення

26 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне алгоритм для `[5, 2, 9, 1, 5, 6]`?

```js
(() => { const S = (a) => { let cmp = 0; const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { cmp++; o.push(l[i] <= r[j] ? l[i++] : r[j++]); } return o.concat(l.slice(i), r.slice(j)); }; return { a: m(a), cmp }; }; return S([5, 2, 9, 1, 5, 6]).a; })()
```

**2.** Що поверне сортування порожнього та одноелементного масивів?

```js
(() => { const S = (a) => { let cmp = 0; const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { cmp++; o.push(l[i] <= r[j] ? l[i++] : r[j++]); } return o.concat(l.slice(i), r.slice(j)); }; return { a: m(a), cmp }; }; return [S([]).a, S([7]).a]; })()
```

**3.** Скільки порівнянь на відсортованому `[1, 2, 3, 4, 5, 6, 7, 8]`?

```js
(() => { const S = (a) => { let cmp = 0; const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { cmp++; o.push(l[i] <= r[j] ? l[i++] : r[j++]); } return o.concat(l.slice(i), r.slice(j)); }; return { a: m(a), cmp }; }; return S([1, 2, 3, 4, 5, 6, 7, 8]).cmp; })()
```

**4.** Скільки порівнянь на зворотному `[8, 7, 6, 5, 4, 3, 2, 1]`?

```js
(() => { const S = (a) => { let cmp = 0; const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { cmp++; o.push(l[i] <= r[j] ? l[i++] : r[j++]); } return o.concat(l.slice(i), r.slice(j)); }; return { a: m(a), cmp }; }; return S([8, 7, 6, 5, 4, 3, 2, 1]).cmp; })()
```

**5.** Скільки порівнянь на `[5, 2, 9, 1, 5, 6]`?

```js
(() => { const S = (a) => { let cmp = 0; const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { cmp++; o.push(l[i] <= r[j] ? l[i++] : r[j++]); } return o.concat(l.slice(i), r.slice(j)); }; return { a: m(a), cmp }; }; return S([5, 2, 9, 1, 5, 6]).cmp; })()
```

**6.** Що поверне сортування масиву з дублікатами `[3, 1, 3, 2, 1, 3]`?

```js
(() => { const S = (a) => { let cmp = 0; const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { cmp++; o.push(l[i] <= r[j] ? l[i++] : r[j++]); } return o.concat(l.slice(i), r.slice(j)); }; return { a: m(a), cmp }; }; return S([3, 1, 3, 2, 1, 3]).a; })()
```

**7.** Що поверне сортування від'ємних і дробових?

```js
(() => { const S = (a) => { let cmp = 0; const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { cmp++; o.push(l[i] <= r[j] ? l[i++] : r[j++]); } return o.concat(l.slice(i), r.slice(j)); }; return { a: m(a), cmp }; }; return S([0.5, -3, 2, -0.5, 0, -3]).a; })()
```

### Рівень 2. Деталі й поведінка

**8.** Скільки порівнянь для n = 4, 8, 16, 32 на зворотному вході?

```js
(() => { const S = (a) => { let cmp = 0; const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { cmp++; o.push(l[i] <= r[j] ? l[i++] : r[j++]); } return o.concat(l.slice(i), r.slice(j)); }; return { a: m(a), cmp }; }; return [4, 8, 16, 32].map(n => S(Array.from({ length: n }, (_, i) => n - i)).cmp); })()
```

**9.** Скільки порівнянь для n = 4, 8, 16, 32 на відсортованому вході?

```js
(() => { const S = (a) => { let cmp = 0; const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { cmp++; o.push(l[i] <= r[j] ? l[i++] : r[j++]); } return o.concat(l.slice(i), r.slice(j)); }; return { a: m(a), cmp }; }; return [4, 8, 16, 32].map(n => S(Array.from({ length: n }, (_, i) => i)).cmp); })()
```

**10.** Чому `[10, 9, 1, 100].sort()` дає неправильний порядок?

```js
[[10, 9, 1, 100].sort(), [10, 9, 1, 100].sort((a, b) => a - b)]
```

**11.** Як розбивається масив на кожному рівні для `[5, 2, 9, 1, 5, 6]`?

```js
(() => { const lv = []; let cur = [[5, 2, 9, 1, 5, 6]]; while (cur.some(x => x.length > 1)) { lv.push(cur.map(x => x.join(',')).join(' | ')); cur = cur.flatMap(x => x.length > 1 ? [x.slice(0, x.length >> 1), x.slice(x.length >> 1)] : [x]); } lv.push(cur.map(x => x.join(',')).join(' | ')); return lv; })()
```

**12.** Як зливаються `[1, 4, 7]` і `[2, 3, 9]`?

```js
(() => { const a = [1, 4, 7], b = [2, 3, 9], o = []; let i = 0, j = 0; while (i < a.length && j < b.length) o.push(a[i] <= b[j] ? a[i++] : b[j++]); return o.concat(a.slice(i), b.slice(j)); })()
```

**13.** Що буде, якщо один масив для злиття порожній?

```js
(() => { const merge = (a, b) => { const o = []; let i = 0, j = 0; while (i < a.length && j < b.length) o.push(a[i] <= b[j] ? a[i++] : b[j++]); return o.concat(a.slice(i), b.slice(j)); }; return [merge([], [1, 2]), merge([3], []), merge([], [])]; })()
```

**14.** Чи стабільний merge sort (`<=` у злитті)?

```js
(() => { const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) o.push(l[i].k <= r[j].k ? l[i++] : r[j++]); return o.concat(l.slice(i), r.slice(j)); }; return m([{ k: 2, n: 'a' }, { k: 1, n: 'b' }, { k: 2, n: 'c' }, { k: 1, n: 'd' }]).map(x => x.k + x.n); })()
```

### Рівень 3. Нюанси та пастки

**15.** Що станеться зі стабільністю при `<` замість `<=`?

```js
(() => { const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) o.push(l[i].k < r[j].k ? l[i++] : r[j++]); return o.concat(l.slice(i), r.slice(j)); }; return m([{ k: 1, n: 'a' }, { k: 1, n: 'b' }, { k: 1, n: 'c' }]).map(x => x.n); })()
```

**16.** Скільки рівнів рекурсії для n = 8, 16, 1000?

```js
[8, 16, 1000].map(n => Math.ceil(Math.log2(n)))
```

**17.** Скільки викликів рекурсивної функції для n = 8?

```js
(() => { let calls = 0; const m = (x) => { calls++; if (x.length < 2) return x; const mid = x.length >> 1; m(x.slice(0, mid)); m(x.slice(mid)); return x; }; m([1, 2, 3, 4, 5, 6, 7, 8]); return calls; })()
```

**18.** Напишіть `mergeSort(arr, cmp)` без мутації.

```js
const merge = (a, b, c) => { const o = []; let i = 0, j = 0; while (i < a.length && j < b.length) o.push(c(a[i], b[j]) <= 0 ? a[i++] : b[j++]); return o.concat(a.slice(i), b.slice(j)); }; const mergeSort = (x, c = (a, b) => a - b) => x.length < 2 ? [...x] : merge(mergeSort(x.slice(0, x.length >> 1), c), mergeSort(x.slice(x.length >> 1), c), c)
```

**19.** Напишіть нерекурсивний (bottom-up) merge sort.

```js
const bu = (arr) => { let a = [...arr]; const n = a.length; for (let w = 1; w < n; w *= 2) { const o = []; for (let i = 0; i < n; i += 2 * w) { const l = a.slice(i, i + w), r = a.slice(i + w, i + 2 * w); let x = 0, y = 0; while (x < l.length && y < r.length) o.push(l[x] <= r[y] ? l[x++] : r[y++]); o.push(...l.slice(x), ...r.slice(y)); } a = o; } return a; }
```

**20.** Порахуйте інверсії під час злиття (O(n log n)).

```js
const inv = (arr) => { let c = 0; const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { if (l[i] <= r[j]) o.push(l[i++]); else { o.push(r[j++]); c += l.length - i; } } return o.concat(l.slice(i), r.slice(j)); }; m(arr); return c; }
```

**21.** Злийте k відсортованих масивів.

```js
const mergeK = (arrs) => arrs.reduce((a, b) => { const o = []; let i = 0, j = 0; while (i < a.length && j < b.length) o.push(a[i] <= b[j] ? a[i++] : b[j++]); return o.concat(a.slice(i), b.slice(j)); }, [])
```

### Рівень 4. Практика

**22.** Видаліть дублікати з відсортованого злиття двох масивів.

```js
const mergeUniq = (a, b) => { const o = []; let i = 0, j = 0; while (i < a.length || j < b.length) { const v = j >= b.length || (i < a.length && a[i] <= b[j]) ? a[i++] : b[j++]; if (o.at(-1) !== v) o.push(v); } return o; }
```

**23.** Відсортуйте масив об'єктів за ключем стабільно та покажіть порядок рівних.

```js
const sortBy = (arr, key) => { const m = (x) => { if (x.length < 2) return x; const mid = x.length >> 1; const l = m(x.slice(0, mid)), r = m(x.slice(mid)); const o = []; let i = 0, j = 0; while (i < l.length && j < r.length) o.push(key(l[i]) <= key(r[j]) ? l[i++] : r[j++]); return o.concat(l.slice(i), r.slice(j)); }; return m(arr); }
```

**24.** Відсортуйте зв'язаний список злиттям (список як `{v, next}`).

```js
const toList = (a) => a.reduceRight((n, v) => ({ v, next: n }), null); const toArr = (l) => { const r = []; for (; l; l = l.next) r.push(l.v); return r; }; const mergeL = (a, b) => { if (!a) return b; if (!b) return a; return a.v <= b.v ? (a.next = mergeL(a.next, b), a) : (b.next = mergeL(a, b.next), b); }; const sortL = (l) => { if (!l || !l.next) return l; let s = l, f = l.next; while (f && f.next) { s = s.next; f = f.next.next; } const h = s.next; s.next = null; return mergeL(sortL(l), sortL(h)); }
```

**25.** Які складності у merge sort?

**26.** Чому merge sort добре підходить для зв'язаних списків і зовнішнього сортування?

### Відповіді

1. `[1, 2, 5, 5, 6, 9]`
2. `[[], [7]]`
3. `12`
4. `12`
5. `10`
6. `[1, 1, 2, 3, 3, 3]`
7. `[-3, -3, -0.5, 0, 0.5, 2]`
8. `[4, 12, 32, 80]`
9. `[4, 12, 32, 80]`
10. `[[1, 10, 100, 9], [1, 9, 10, 100]]`
11. `['5,2,9,1,5,6', '5,2,9 | 1,5,6', '5 | 2,9 | 1 | 5,6', '5 | 2 | 9 | 1 | 5 | 6']`
12. `[1, 2, 3, 4, 7, 9]`
13. `[[1, 2], [3], []]`
14. `['1b', '1d', '2a', '2c']`
15. `['c', 'b', 'a']`
16. `[3, 4, 10]`
17. `15`
18. Виклик `(() => { const x = [4, 2, 7, 1]; return [mergeSort(x), mergeSort(x, (a, b) => b - a), x]; })()` → `[[1, 2, 4, 7], [7, 4, 2, 1], [4, 2, 7, 1]]`
19. Виклик `bu([5, 2, 9, 1, 5, 6, 3])` → `[1, 2, 3, 5, 5, 6, 9]`
20. Виклик `[inv([1, 2, 3]), inv([3, 2, 1]), inv([3, 1, 2, 5, 4])]` → `[0, 3, 3]`
21. Виклик `mergeK([[1, 4, 7], [2, 5], [0, 3, 6, 9]])` → `[0, 1, 2, 3, 4, 5, 6, 7, 9]`
22. Виклик `mergeUniq([1, 2, 2, 5], [2, 3, 5, 8])` → `[1, 2, 3, 5, 8]`
23. Виклик `sortBy([{ n: 'a', k: 3 }, { n: 'b', k: 1 }, { n: 'c', k: 3 }, { n: 'd', k: 1 }], x => x.k).map(x => x.n)` → `['b', 'd', 'a', 'c']`
24. Виклик `toArr(sortL(toList([4, 2, 5, 1, 3])))` → `[1, 2, 3, 4, 5]`
25. O(n log n) в усіх випадках; додаткова пам'ять O(n); алгоритм стабільний
26. Не вимагає довільного доступу — лише послідовне читання та злиття; на списках не потрібна додаткова пам'ять під масив
