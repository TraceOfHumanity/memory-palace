# Strongly Connected Components — компоненти сильної зв'язності (Тар'ян і Косараджу)

У орієнтованому графі вершини `u` і `v` **сильно зв'язані**, якщо існує шлях і `u → v`, і `v → u`. Це відношення еквівалентності, воно розбиває граф на **компоненти сильної зв'язності (SCC)**. Якщо «стиснути» кожну SCC в одну вершину, отримаємо **ациклічний граф** (DAG) — **конденсацію**. SCC потрібні для аналізу залежностей (циклічні імпорти), детекції взаємоблокувань, розв'язання **2-SAT**, оптимізації компіляторів і для будь-яких задач, де «цикли» треба обробити як одне ціле. Два лінійні алгоритми: **Косараджу** (два DFS) і **Тар'ян** (один DFS зі значеннями low-link).

## 1. Приклад

Граф: `0→1`, `1→2`, `2→0` (цикл), `2→3`, `3→4`, `4→5`, `5→3` (інший цикл), `6→5`. Компоненти: `[[3, 4, 5], [0, 1, 2], [6]]`. Вершини `{0, 1, 2}` утворюють цикл (одна SCC), `{3, 4, 5}` — інший, а `6` — окрема SCC з одної вершини. Конденсація: `{0,1,2} → {3,4,5} ← {6}` — DAG.

Кількість SCC: 3. Граф сильно зв'язний, якщо SCC рівно одна.

## 2. Алгоритм Косараджу (Kosaraju)

Ідея на двох властивостях DFS:

1. Запустити DFS на графі `G` і записати вершини за **порядком завершення** (post-order).
2. Побудувати **транспонований** граф `Gᵀ` (усі ребра розвернуті — SCC не змінюються).
3. Обробляти вершини за **зменшенням часу завершення**; DFS на `Gᵀ` від кожної ще не відвіданої вершини збирає рівно одну SCC.

**Чому це працює.** Нехай `C` і `C'` — SCC, і в `G` є ребро `C → C'`. Тоді **максимальний час завершення в `C` більший, ніж у `C'`**. Тому вершина з найбільшим часом завершення лежить у «початковій» SCC конденсації (з якої нічого не входить). У `Gᵀ` ребра розвернуті, тож з неї можна дістатись лише до її власної SCC — DFS збирає її й зупиняється. Видаляючи її, повторюємо з наступним найбільшим часом.

`kosaraju(sccGraph)` = `[[6], [0, 1, 2], [3, 4, 5]]`.

## 3. Алгоритм Тар'яна

Один DFS. Для кожної вершини зберігаємо:

- `index[v]` — порядковий номер відвідування (час входу);
- `low[v]` — найменший `index` вершини, досяжної з піддерева `v` через **не більше одного зворотного ребра** до вершини, що ще в стеку;
- **стек** вершин поточної гілки, які ще не віднесено до SCC.

Правило: якщо після обробки всіх сусідів `low[v] === index[v]` — `v` є **коренем** SCC: виймаємо зі стека вершини до `v` включно — це одна SCC.

Чому: `low[v] < index[v]` означає, що з піддерева `v` можна повернутись до предка → `v` не корінь SCC; `low[v] === index[v]` — піддерево з `v` не має шляху вище, тож усе, що в стеку над `v`, замкнене в одну компоненту.

Трасування для `sccGraph` (вершини в порядку завершення): v5: index=5, low=3; v4: index=4, low=3; v3: index=3, low=3 → корінь SCC; v2: index=2, low=0; v1: index=1, low=0; v0: index=0, low=0 → корінь SCC; v6: index=6, low=6 → корінь SCC.

## 4. Реалізація

```js
const sccGraph = {
  0: [1],
  1: [2],
  2: [0, 3],
  3: [4],
  4: [5],
  5: [3],
  6: [5],
};

function tarjan(g) {
  const index = {};
  const low = {};
  const onStack = {};
  const stack = [];
  const comps = [];
  let idx = 0;
  const go = (v) => {
    index[v] = low[v] = idx++;
    stack.push(v);
    onStack[v] = true;
    for (const u of g[v]) {
      if (!(u in index)) {
        go(u);
        low[v] = Math.min(low[v], low[u]);
      } else if (onStack[u]) {
        low[v] = Math.min(low[v], index[u]);
      }
    }
    if (low[v] === index[v]) {
      const comp = [];
      let w;
      do {
        w = stack.pop();
        onStack[w] = false;
        comp.push(Number(w));
      } while (w !== v);
      comps.push(comp.sort((a, b) => a - b));
    }
  };
  for (const v of Object.keys(g)) if (!(v in index)) go(v);
  return comps;
}

function tarjanTrace(g) {
  const index = {};
  const low = {};
  const onStack = {};
  const stack = [];
  const out = [];
  let idx = 0;
  const go = (v) => {
    index[v] = low[v] = idx++;
    stack.push(v);
    onStack[v] = true;
    for (const u of g[v]) {
      if (!(u in index)) { go(u); low[v] = Math.min(low[v], low[u]); }
      else if (onStack[u]) low[v] = Math.min(low[v], index[u]);
    }
    out.push('v' + v + ': index=' + index[v] + ', low=' + low[v] + (low[v] === index[v] ? ' → корінь SCC' : ''));
    if (low[v] === index[v]) {
      let w;
      do { w = stack.pop(); onStack[w] = false; } while (w !== v);
    }
  };
  for (const v of Object.keys(g)) if (!(v in index)) go(v);
  return out.join('; ');
}

function kosaraju(g) {
  const keys = Object.keys(g);
  const seen = new Set();
  const order = [];
  const dfs1 = (v) => {
    seen.add(v);
    for (const u of g[v]) if (!seen.has(String(u))) dfs1(String(u));
    order.push(v);
  };
  for (const v of keys) if (!seen.has(v)) dfs1(v);
  const rev = {};
  for (const v of keys) rev[v] = [];
  for (const v of keys) for (const u of g[v]) rev[u].push(v);
  const seen2 = new Set();
  const comps = [];
  const dfs2 = (v, comp) => {
    seen2.add(v);
    comp.push(Number(v));
    for (const u of rev[v]) if (!seen2.has(String(u))) dfs2(String(u), comp);
  };
  for (let i = order.length - 1; i >= 0; i--) {
    const v = order[i];
    if (!seen2.has(v)) {
      const comp = [];
      dfs2(v, comp);
      comps.push(comp.sort((a, b) => a - b));
    }
  }
  return comps;
}

function condensation(g) {
  const comps = tarjan(g);
  const id = {};
  comps.forEach((c, i) => c.forEach((v) => { id[v] = i; }));
  const edges = new Set();
  for (const v of Object.keys(g)) for (const u of g[v]) if (id[v] !== id[u]) edges.add(id[v] + '>' + id[u]);
  return { comps, edges: [...edges].sort() };
}

function isStronglyConnected(g) {
  return tarjan(g).length === 1;
}

function bridges(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  edges.forEach(([u, v], i) => { adj[u].push([v, i]); adj[v].push([u, i]); });
  const tin = new Array(n).fill(-1);
  const low = new Array(n).fill(0);
  const res = [];
  let t = 0;
  const go = (v, pe) => {
    tin[v] = low[v] = t++;
    for (const [u, id] of adj[v]) {
      if (id === pe) continue;
      if (tin[u] !== -1) low[v] = Math.min(low[v], tin[u]);
      else {
        go(u, id);
        low[v] = Math.min(low[v], low[u]);
        if (low[u] > tin[v]) res.push([v, u]);
      }
    }
  };
  for (let i = 0; i < n; i++) if (tin[i] === -1) go(i, -1);
  return res;
}

function articulationPoints(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }
  const tin = new Array(n).fill(-1);
  const low = new Array(n).fill(0);
  const ap = new Set();
  let t = 0;
  const go = (v, p) => {
    tin[v] = low[v] = t++;
    let children = 0;
    for (const u of adj[v]) {
      if (u === p) continue;
      if (tin[u] !== -1) low[v] = Math.min(low[v], tin[u]);
      else {
        go(u, v);
        low[v] = Math.min(low[v], low[u]);
        if (low[u] >= tin[v] && p !== -1) ap.add(v);
        children++;
      }
    }
    if (p === -1 && children > 1) ap.add(v);
  };
  for (let i = 0; i < n; i++) if (tin[i] === -1) go(i, -1);
  return [...ap].sort((a, b) => a - b);
}

function twoSat(n, clauses) {
  const node = (x) => (x > 0 ? 2 * (x - 1) : 2 * (-x - 1) + 1);
  const g = {};
  for (let i = 0; i < 2 * n; i++) g[i] = [];
  for (const [a, b] of clauses) {
    g[node(-a)].push(node(b));
    g[node(-b)].push(node(a));
  }
  const comps = tarjan(g);
  const id = {};
  comps.forEach((c, i) => c.forEach((v) => { id[v] = i; }));
  for (let i = 0; i < n; i++) if (id[2 * i] === id[2 * i + 1]) return false;
  return true;
}

function findCircularDependencies(deps) {
  const g = {};
  const names = Object.keys(deps);
  names.forEach((n, i) => { g[i] = deps[n].map((d) => names.indexOf(d)); });
  return tarjan(g).filter((c) => c.length > 1 || g[c[0]].includes(c[0])).map((c) => c.map((i) => names[i]));
}
```

## 5. Тар'ян чи Косараджу

| | Косараджу | Тар'ян |
|---|---|---|
| Кількість обходів | 2 DFS + транспонування | 1 DFS |
| Додаткова пам'ять | граф `Gᵀ`, порядок | стек, `low`, `index` |
| Простота ідеї | простіша для розуміння | елегантніша, складніша для доведення |
| Порядок SCC на виході | топологічний порядок конденсації | **зворотний** топологічний |

Обидва `O(V + E)`. Тар'ян видає SCC у **зворотному топологічному порядку** конденсації: перша знайдена SCC — «стік» (з неї нікуди не виходять ребра до інших SCC).

## 6. Конденсація й застосування

`condensation(sccGraph)` = `{ comps: [[3, 4, 5], [0, 1, 2], [6]], edges: ['1>0', '2>0'] }` — ребра між компонентами утворюють DAG, тож до нього застосовне [топологічне сортування](topological-sort.md).

- **Циклічні залежності модулів:** `findCircularDependencies({ a: ['b'], b: ['c'], c: ['a'], d: ['a'] })` = `[['a', 'b', 'c']]`.
- **2-SAT:** кожна змінна `x` — дві вершини (`x`, `¬x`), клаузула `(a ∨ b)` — ребра `¬a → b`, `¬b → a`. Формула виконувана, якщо жодна змінна не в одній SCC зі своїм запереченням: `twoSat(2, [[1, 2], [-1, 2], [1, -2]])` = `true`, а `twoSat(1, [[1, 1], [-1, -1]])` = `false`.
- **Мости й точки зчленування** (неорієнтований граф) — та сама техніка `low`: `bridges(4, [[0, 1], [1, 2], [2, 0], [1, 3]])` = `[[1, 3]]` (ребро `1–3`); `articulationPoints(4, [[0, 1], [1, 2], [2, 0], [1, 3]])` = `[1]` (вершина `1`).
- **Аналіз програм:** граф викликів, зворотні дзвінки; **взаємоблокування:** цикл у графі очікування (wait-for).
- **Веб:** «bow-tie» структура інтернету — найбільша SCC ядра.
- **Оптимізація:** згортання циклів у графах залежностей перед динамічним програмуванням на DAG.

## 7. Складність

- **Час `O(V + E)`** для обох алгоритмів.
- **Пам'ять `O(V + E)`** (Косараджу — ще транспонований граф).
- Рекурсивний DFS на глибоких графах призводить до `RangeError` — використовуйте ітеративну версію з явним стеком.

## 8. Типові помилки

1. **Оновлювати `low[v]` через `low[u]` для вершини, що вже не в стеку** — її SCC уже виділена; потрібно `index[u]` і лише для `onStack[u]`.
2. **Використовувати `low[u]` замість `index[u]` для зворотного ребра** — для SCC обидва формально допустимі, але для мостів — лише `tin[u]`; плутанина веде до помилок.
3. **Забути прапор `onStack`:** ребро перехресне до вже завершеної SCC не повинно впливати на `low`.
4. **У Косараджу** — транспонований граф або неправильний порядок обробки (за **зростанням** часу завершення).
5. **Ключі об'єкта — рядки**, а сусіди — числа: порівняння `String(u)`.
6. **Одновершинні SCC й петлі:** вершина без циклу — теж SCC; перевіряйте петлі окремо при пошуку циклів.
7. **Мости:** для неорієнтованих — пропускати **ребро** батька за id (а не вершину), інакше кратні ребра зникнуть.
8. **Корінь DFS у точках зчленування:** окремий випадок — більше одного дочірнього піддерева.

## 9. Алгоритм (стисло)

1. DFS; для кожної вершини `index` і `low`; вершину — у стек.
2. Для ребра `v → u`: якщо `u` новий — рекурсія, `low[v] = min(low[v], low[u])`; якщо `u` у стеку — `low[v] = min(low[v], index[u])`.
3. Якщо `low[v] === index[v]` — вийняти зі стека вершини до `v` — це SCC.
4. Час `O(V + E)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Які SCC знаходить `tarjan(sccGraph)`?

```js
tarjan(sccGraph)
```

**2.** Які SCC знаходить `kosaraju(sccGraph)`? Чи збігаються як множини?

```js
(() => { const norm = (c) => JSON.stringify(c.map(x => x.slice().sort((a, b) => a - b)).sort((a, b) => a[0] - b[0])); return [kosaraju(sccGraph), norm(tarjan(sccGraph)) === norm(kosaraju(sccGraph))]; })()
```

**3.** Який трасувальний вивід `tarjanTrace(sccGraph)`?

```js
tarjanTrace(sccGraph)
```

**4.** Скільки SCC у `sccGraph`?

```js
tarjan(sccGraph).length
```

**5.** Яка конденсація `condensation(sccGraph)`?

```js
condensation(sccGraph)
```

**6.** Чи сильно зв'язний граф-цикл `{ 0: [1], 1: [2], 2: [0] }`?

```js
isStronglyConnected({ 0: [1], 1: [2], 2: [0] })
```

**7.** А ланцюжок `{ 0: [1], 1: [2], 2: [] }`?

```js
isStronglyConnected({ 0: [1], 1: [2], 2: [] })
```

**8.** Скільки SCC у ланцюжка з 4 вершин (DAG)?

```js
tarjan({ 0: [1], 1: [2], 2: [3], 3: [] }).length
```

**9.** Які SCC у графі з петлею `{ 0: [0], 1: [0] }`?

```js
tarjan({ 0: [0], 1: [0] })
```

**10.** Які SCC в одній вершині без ребер `{ 0: [] }`?

```js
tarjan({ 0: [] })
```

**11.** Які SCC у двох зв'язаних між собою циклах `0→1→0`, `1→2→1`?

```js
tarjan({ 0: [1], 1: [0, 2], 2: [1] })
```

**12.** Які SCC для двох окремих циклів, з'єднаних ребром в одну сторону: `0⇄1`, `2⇄3`, `1→2`?

```js
tarjan({ 0: [1], 1: [0, 2], 2: [3], 3: [2] })
```

**13.** Яка конденсація цього графа?

```js
condensation({ 0: [1], 1: [0, 2], 2: [3], 3: [2] })
```

### Рівень 2. Робота алгоритму

**14.** Що поверне `findCircularDependencies({ a: ['b'], b: ['c'], c: ['a'], d: ['a'] })`?

```js
findCircularDependencies({ a: ['b'], b: ['c'], c: ['a'], d: ['a'] })
```

**15.** А без циклів `{ a: ['b'], b: [], c: ['a'] }`?

```js
findCircularDependencies({ a: ['b'], b: [], c: ['a'] })
```

**16.** А з самозалежністю `{ a: ['a'] }`?

```js
findCircularDependencies({ a: ['a'] })
```

**17.** Що поверне `twoSat(2, [[1, 2], [-1, 2], [1, -2]])`?

```js
twoSat(2, [[1, 2], [-1, 2], [1, -2]])
```

**18.** Що поверне `twoSat(1, [[1, 1], [-1, -1]])` (суперечність)?

```js
twoSat(1, [[1, 1], [-1, -1]])
```

**19.** Що поверне `twoSat(2, [[1, 2], [-1, -2], [1, -2], [-1, 2]])`?

```js
twoSat(2, [[1, 2], [-1, -2], [1, -2], [-1, 2]])
```

**20.** Які мости в `bridges(4, [[0, 1], [1, 2], [2, 0], [1, 3]])`?

```js
bridges(4, [[0, 1], [1, 2], [2, 0], [1, 3]])
```

**21.** Які точки зчленування в тому ж графі?

```js
articulationPoints(4, [[0, 1], [1, 2], [2, 0], [1, 3]])
```

**22.** Скільки мостів у ланцюжку з 5 вершин?

```js
bridges(5, [[0, 1], [1, 2], [2, 3], [3, 4]]).length
```

**23.** Які точки зчленування в ланцюжку з 5 вершин?

```js
articulationPoints(5, [[0, 1], [1, 2], [2, 3], [3, 4]])
```

**24.** Скільки мостів у циклі з 4 вершин?

```js
bridges(4, [[0, 1], [1, 2], [2, 3], [3, 0]]).length
```

**25.** Які точки зчленування в зірці `0–1, 0–2, 0–3`?

```js
articulationPoints(4, [[0, 1], [0, 2], [0, 3]])
```

**26.** Скільки мостів у графі з кратними ребрами `0–1` двічі?

```js
bridges(2, [[0, 1], [0, 1]]).length
```

### Рівень 3. Складність і нюанси

**27.** Скільки SCC у повному орієнтованому графі на 5 вершинах?

```js
tarjan(Object.fromEntries([0, 1, 2, 3, 4].map(i => [i, [0, 1, 2, 3, 4].filter(j => j !== i)]))).length
```

**28.** Скільки SCC у DAG-«діаманті» `0→1, 0→2, 1→3, 2→3`?

```js
tarjan({ 0: [1, 2], 1: [3], 2: [3], 3: [] }).length
```

**29.** Чи збігається кількість SCC за Косараджу і Тар'яном на 50 «псевдовипадкових» графах із 6 вершин?

```js
(() => { let ok = true; for (let t = 1; t <= 50; t++) { const g = {}; for (let i = 0; i < 6; i++) g[i] = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (i !== j && ((t * 7 + i * 3 + j * 5 + i * j * t) % 5) === 0) g[i].push(j); if (tarjan(g).length !== kosaraju(g).length) ok = false; } return ok; })()
```

**30.** Напишіть `sccSizes(g)` — розміри SCC за спаданням.

**31.** Напишіть `largestScc(g)` — найбільшу SCC (за кількістю вершин).

**32.** Напишіть `sourceComponents(g)` — SCC без вхідних ребер у конденсації (їх кількість — мінімум ребер для сильної зв'язності разом із стоками).

**33.** Напишіть `sinkComponents(g)` — SCC без вихідних ребер.

**34.** Напишіть `minEdgesToStronglyConnect(g)` — мінімум ребер, які треба додати, щоб граф став сильно зв'язним: `max(джерел, стоків)`, або `0`, якщо SCC одна.

**35.** Напишіть `transposeGraph(g)` — транспонований граф (усі ребра розвернуті).

**36.** Напишіть `sameSccQuery(g, a, b)` — чи лежать `a` і `b` в одній SCC.

**37.** Напишіть `countBiconnectedPairs(n, edges)` — кількість мостів + точок зчленування (кількість «критичних елементів» мережі).

**38.** Напишіть `deadlockCycle(waitFor)` — чи є взаємоблокування в графі очікування (`{ процес: [процеси] }`): будь-яка SCC розміру > 1 або петля.

**39.** Напишіть `reachableComponents(g, start)` — кількість SCC, досяжних з `start` (включно з власною).

### Рівень 4. Задачі з інтерв'ю

**40.** Що таке компонента сильної зв'язності?

**41.** Чому конденсація графа — DAG?

**42.** Як працює Косараджу?

**43.** Що означає `low[v]` у Тар'яні?

**44.** Навіщо в Тар'яна потрібен стек і прапор `onStack`?

**45.** Чим відрізняються SCC у орієнтованому графі від компонент зв'язності в неорієнтованому?

**46.** Як SCC допомагають розв'язати 2-SAT?

**47.** Як пов'язані мости й точки зчленування з low-link?

**48.** Яка складність алгоритмів SCC?

**49.** Де на практиці зустрічаються задачі про SCC?

**50.** Яка транспонована структура для `{ 0: [1], 1: [2], 2: [] }` (кількість SCC зберігається)?

```js
[tarjan({ 0: [1], 1: [2], 2: [] }).length, tarjan({ 0: [], 1: [0], 2: [1] }).length]
```

### Відповіді

1. `[[3, 4, 5], [0, 1, 2], [6]]`
2. `[[[6], [0, 1, 2], [3, 4, 5]], true]`
3. `'v5: index=5, low=3; v4: index=4, low=3; v3: index=3, low=3 → корінь SCC; v2: index=2, low=0; v1: index=1, low=0; v0: index=0, low=0 → корінь SCC; v6: index=6, low=6 → корінь SCC'`
4. `3`
5. `{ comps: [[3, 4, 5], [0, 1, 2], [6]], edges: ['1>0', '2>0'] }`
6. `true`
7. `false`
8. `4`
9. `[[0], [1]]`
10. `[[0]]`
11. `[[0, 1, 2]]`
12. `[[2, 3], [0, 1]]`
13. `{ comps: [[2, 3], [0, 1]], edges: ['1>0'] }`
14. `[['a', 'b', 'c']]`
15. `[]`
16. `[['a']]`
17. `true`
18. `false`
19. `false`
20. `[[1, 3]]`
21. `[1]`
22. `4`
23. `[1, 2, 3]`
24. `0`
25. `[0]`
26. `0`
27. `1`
28. `4`
29. `true`
30. Приклад розв'язку:

   ```js
   const sccSizes = (g) => tarjan(g).map(c => c.length).sort((a, b) => b - a)
   ```

   Виклик `[sccSizes(sccGraph), sccSizes({ 0: [] })]` → `[[3, 3, 1], [1]]`

31. Приклад розв'язку:

   ```js
   const largestScc = (g) => tarjan(g).reduce((m, c) => c.length > m.length ? c : m, [])
   ```

   Виклик `largestScc(sccGraph)` → `[3, 4, 5]`

32. Приклад розв'язку:

   ```js
   function sourceComponents(g) {
     const { comps, edges } = condensation(g);
     const hasIn = new Set(edges.map(e => Number(e.split('>')[1])));
     return comps.filter((_, i) => !hasIn.has(i));
   }
   ```

   Виклик `sourceComponents(sccGraph)` → `[[0, 1, 2], [6]]`

33. Приклад розв'язку:

   ```js
   function sinkComponents(g) {
     const { comps, edges } = condensation(g);
     const hasOut = new Set(edges.map(e => Number(e.split('>')[0])));
     return comps.filter((_, i) => !hasOut.has(i));
   }
   ```

   Виклик `sinkComponents(sccGraph)` → `[[3, 4, 5]]`

34. Приклад розв'язку:

   ```js
   function minEdgesToStronglyConnect(g) {
     if (tarjan(g).length === 1) return 0;
     return Math.max(sourceComponents(g).length, sinkComponents(g).length);
   }
   ```

   Виклик `[minEdgesToStronglyConnect(sccGraph), minEdgesToStronglyConnect({ 0: [1], 1: [0] })]` → `[2, 0]`

35. Приклад розв'язку:

   ```js
   function transposeGraph(g) {
     const r = {};
     for (const v of Object.keys(g)) r[v] = [];
     for (const v of Object.keys(g)) for (const u of g[v]) r[u].push(Number(v));
     return r;
   }
   ```

   Виклик `transposeGraph(sccGraph)` → `{ '0': [2], '1': [0], '2': [1], '3': [2, 5], '4': [3], '5': [4, 6], '6': [] }`

36. Приклад розв'язку:

   ```js
   function sameSccQuery(g, a, b) {
     return tarjan(g).some(c => c.includes(a) && c.includes(b));
   }
   ```

   Виклик `[sameSccQuery(sccGraph, 0, 2), sameSccQuery(sccGraph, 0, 3), sameSccQuery(sccGraph, 3, 5)]` → `[true, false, true]`

37. Приклад розв'язку:

   ```js
   const countBiconnectedPairs = (n, e) => bridges(n, e).length + articulationPoints(n, e).length
   ```

   Виклик `countBiconnectedPairs(4, [[0, 1], [1, 2], [2, 0], [1, 3]])` → `2`

38. Приклад розв'язку:

   ```js
   function deadlockCycle(w) {
     const names = Object.keys(w);
     const idx = Object.fromEntries(names.map((n, i) => [n, i]));
     const g = {};
     names.forEach((n, i) => { g[i] = w[n].map(x => idx[x]); });
     return tarjan(g).some(c => c.length > 1 || g[c[0]].includes(c[0]));
   }
   ```

   Виклик `[deadlockCycle({ p1: ['p2'], p2: ['p3'], p3: ['p1'] }), deadlockCycle({ p1: ['p2'], p2: [] })]` → `[true, false]`

39. Приклад розв'язку:

   ```js
   function reachableComponents(g, start) {
     const { comps, edges } = condensation(g);
     const cid = comps.findIndex(c => c.includes(start));
     const adj = {};
     edges.forEach(e => { const [a, b] = e.split('>').map(Number); (adj[a] ||= []).push(b); });
     const seen = new Set([cid]);
     const st = [cid];
     while (st.length) {
       const c = st.pop();
       for (const d of adj[c] || []) if (!seen.has(d)) {
         seen.add(d);
         st.push(d);
       }
     }
     return seen.size;
   }
   ```

   Виклик `[reachableComponents(sccGraph, 0), reachableComponents(sccGraph, 6), reachableComponents(sccGraph, 3)]` → `[2, 2, 1]`

40. Максимальна множина вершин орієнтованого графа, у якій між будь-якими двома вершинами є шлях в обидва боки. SCC розбивають множину вершин на непересічні класи еквівалентності.
41. Якби між різними SCC був цикл, усі вершини цього циклу були б взаємно досяжні й належали б до однієї SCC — суперечність із максимальністю компонент. Отже, граф SCC ациклічний.
42. Робить DFS і записує порядок завершення; транспонує граф; обробляє вершини за спаданням часу завершення, запускаючи DFS на транспонованому графі: кожен такий DFS охоплює рівно одну SCC.
43. Найменший порядковий номер вершини, досяжної з піддерева `v` через дерево DFS плюс не більше одного ребра до вершини, що перебуває в стеку. Якщо `low[v] === index[v]`, піддерево `v` не має виходу вище — `v` корінь SCC.
44. Стек зберігає вершини поточної гілки, ще не віднесені до SCC. Ребро до вершини, що не в стеку, веде в уже завершену SCC і не повинне зменшувати `low`; прапор відрізняє такі випадки.
45. У неорієнтованому графі достатньо існування шляху між вершинами; в орієнтованому потрібні шляхи в обох напрямках. Тому орієнтований граф може бути «слабко» зв'язним, але мати багато SCC.
46. Будуємо граф імплікацій (по два вузли на змінну), знаходимо SCC. Формула виконувана тоді й лише тоді, коли жодна змінна не лежить в одній SCC зі своїм запереченням; значення змінних визначають за топологічним порядком конденсації.
47. У неорієнтованому DFS ребро `v–u` — міст, якщо `low[u] > tin[v]` (з піддерева `u` немає зворотного ребра вище `v`); вершина `v` — точка зчленування, якщо `low[u] ≥ tin[v]` для якогось дитини (або корінь із ≥ 2 дітьми).
48. `O(V + E)` для обох — Косараджу робить два DFS, Тар'ян — один. Пам'ять `O(V + E)`; на глибоких графах рекурсію замінюють явним стеком.
49. Циклічні залежності модулів і пакетів, взаємоблокування в графах очікування, оптимізація компіляторів і аналіз потоку даних, структура веб-графа, розв'язання 2-SAT, групування взаємно досяжних станів у кінцевих автоматах і марківських ланцюгах.
50. `[3, 3]`
