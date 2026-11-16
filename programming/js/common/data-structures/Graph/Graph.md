# Graph — граф: вершини та зв'язки між ними

> Граф — найзагальніша структура. Список, дерево — це частинні випадки графа. Соціальна мережа, карта доріг, інтернет, залежності пакетів, маршрутизація, рекомендації — усе це графи. Розуміння графа розширює мислення: ти вчишся бачити **зв'язки**, а не лише послідовності.

## 1. Основні терміни

- **Вершина (vertex, node)** — об'єкт (людина, місто, сторінка);
- **Ребро (edge)** — зв'язок між двома вершинами;
- **Неорієнтований граф** — ребро працює в обидва боки (дружба): `A — B`;
- **Орієнтований граф (digraph)** — ребро має напрямок (підписка, посилання): `A → B`;
- **Зважений граф** — на ребрі є число (відстань, ціна, час);
- **Степінь вершини** — кількість ребер, що до неї підходять;
- **Шлях** — послідовність вершин, з'єднаних ребрами; **цикл** — шлях, що повертається в початок;
- **Зв'язний граф** — із будь-якої вершини можна дійти до будь-якої.

```
неорієнтований:      A ─── B           орієнтований зважений:   A ──4──▶ B
                     │     │                                    │      ▲
                     C ─── D                                    1      2
                                                                ▼      │
                                                                C ─────┘
```

> **Дерево — це зв'язний граф без циклів.** Список — дерево, в якому у кожної вершини не більше одного нащадка.

## 2. Як зберігати граф

| Представлення | Ідея | Пам'ять | Є ребро A–B? | Сусіди A |
|---|---|---|---|---|
| **Список суміжності** | для кожної вершини — перелік сусідів | O(V + E) | O(степінь) | **O(степінь)** |
| **Матриця суміжності** | таблиця V×V: `m[a][b] = 1`, якщо ребро є | O(V²) | **O(1)** | O(V) |
| **Список ребер** | масив пар `(a, b)` | O(E) | O(E) | O(E) |

V — вершини, E — ребра. Для **розріджених** графів (ребер багато менше, ніж V²) — список суміжності: це майже завжди вибір за замовчуванням. Матриця — для **щільних** графів і коли треба перевіряти ребро за O(1).

## 3. Твоя реалізація (`algorithms/src/algorithms/TS/graph.ts`)

```ts
class Graph {
  adjacencyList: { [key: string]: string[] };

  constructor() {
    this.adjacencyList = {};
  }

  addVertex(vertex: string) {
    if (!this.adjacencyList[vertex]) {
      this.adjacencyList[vertex] = [];
      return true;
    }
    return false;
  }

  addEdge(vertex1: string, vertex2: string) {
    if (this.adjacencyList[vertex1] && this.adjacencyList[vertex2]) {
      this.adjacencyList[vertex1].push(vertex2);
      this.adjacencyList[vertex2].push(vertex1);
      return true;
    }
    return false;
  }

  removeEdge(vertex1: string, vertex2: string) {
    if (this.adjacencyList[vertex1] && this.adjacencyList[vertex2]) {
      this.adjacencyList[vertex1] = this.adjacencyList[vertex1].filter(v => v !== vertex2);
      this.adjacencyList[vertex2] = this.adjacencyList[vertex2].filter(v => v !== vertex1);
      return true;
    }
    return false;
  }

  removeVertex(vertex: string) {
    if (!this.adjacencyList[vertex]) return undefined;
    while (this.adjacencyList[vertex].length) {
      let temp = this.adjacencyList[vertex].pop();
      if (temp) {
        this.removeEdge(vertex, temp);
      }
    }
    delete this.adjacencyList[vertex];
    return this;
  }
}
```

### Що добре
- правильне й найпоширеніше представлення — **список суміжності** (`{ вершина: [сусіди] }`);
- неорієнтований граф: `addEdge` додає зв'язок в **обидва боки**;
- `removeVertex` спершу прибирає всі ребра, а потім саму вершину — не лишає «висячих» посилань.

### Що виправити (підтверджено запуском)

1. **Дублікати ребер:** `addEdge("A","B")` двічі дає `{"A":["B","B"],"B":["A","A"]}`. Масив не заважає повторам. **Set** розв'язує це «безкоштовно».
2. **Самопетлі:** `addEdge("A","A")` додає `"A"` двічі в список самої `A` (`["B","B","A","A"]`). Потрібно або заборонити, або свідомо підтримати.
3. **Об'єкт як словник:** `adjacencyList: {[key: string]: string[]}` — це `Object` з прототипом: вершина з іменем `"constructor"` чи `"__proto__"` поводиться дивно. Правильніше — `Map`.
4. **`filter` у `removeEdge`** створює нові масиви й проходить по всьому списку (O(степінь)); зі `Set` це `delete` за O(1).
5. **`removeVertex` через `pop()` + `removeEdge`** робить зайву роботу: у `removeEdge` знову фільтруються обидва списки. З `Set` достатньо пройтись по сусідах і видалити вершину з їхніх множин.
6. Немає `hasEdge`, `neighbors`, `degree`, обходів.
7. **Лише неорієнтований та незважений** граф. Для реальних задач потрібні напрямки й ваги (див. нижче).

## 4. Виправлена реалізація (варіант 1: неорієнтований, `Map<string, Set<string>>`)

```ts
class Graph {
  private adj = new Map<string, Set<string>>();

  addVertex(v: string): boolean {
    if (this.adj.has(v)) return false;
    this.adj.set(v, new Set());
    return true;
  }

  // Set не дає дублікатів ребер; самопетлі забороняємо
  addEdge(a: string, b: string): boolean {
    if (a === b || !this.adj.has(a) || !this.adj.has(b)) return false;
    this.adj.get(a)!.add(b);
    this.adj.get(b)!.add(a);
    return true;
  }

  removeEdge(a: string, b: string): boolean {
    if (!this.adj.has(a) || !this.adj.has(b)) return false;
    return this.adj.get(a)!.delete(b) && this.adj.get(b)!.delete(a);
  }

  removeVertex(v: string): boolean {
    const neighbors = this.adj.get(v);
    if (!neighbors) return false;
    for (const n of neighbors) this.adj.get(n)!.delete(v); // прибрати ребра, що ведуть до v
    return this.adj.delete(v);
  }

  hasEdge(a: string, b: string): boolean {
    return this.adj.get(a)?.has(b) ?? false;
  }
  neighbors(v: string): string[] {
    return [...(this.adj.get(v) ?? [])];
  }
  get vertices(): string[] {
    return [...this.adj.keys()];
  }
  degree(v: string): number {
    return this.adj.get(v)?.size ?? 0;
  }

  // обхід вшир
  bfs(start: string): string[] {
    if (!this.adj.has(start)) return [];
    const seen = new Set([start]);
    const queue = [start];
    const out: string[] = [];
    for (let i = 0; i < queue.length; i++) {
      const v = queue[i];
      out.push(v);
      for (const n of this.adj.get(v)!) {
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    return out;
  }

  // обхід вглиб (ітеративно, зі стеком)
  dfs(start: string): string[] {
    if (!this.adj.has(start)) return [];
    const seen = new Set<string>();
    const stack = [start];
    const out: string[] = [];
    while (stack.length) {
      const v = stack.pop()!;
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
      for (const n of [...this.adj.get(v)!].reverse()) if (!seen.has(n)) stack.push(n);
    }
    return out;
  }
}
```


### Як це працює

```
addVertex A, B, C, D, E;
ребра: A—B, A—C, B—D, C—D, D—E

            B
          /   \
        A       D — E
          \   /
            C

adj: A → {B, C}   B → {A, D}   C → {A, D}   D → {B, C, E}   E → {D}
```

`addEdge(a, b)` додає **два записи** (a→b і b→a) — так неорієнтований граф зберігається в списку суміжності. `removeVertex(v)` проходить по сусідах `v` і видаляє `v` з кожного з їхніх списків — інакше в них лишаться посилання на неіснуючу вершину.

## 5. Обходи графа: BFS та DFS

Обхід = відвідати кожну вершину рівно один раз. На відміну від дерева, у графі є **цикли**, тому потрібна множина **відвіданих** (`seen`): без неї обхід зациклиться.

### BFS — вшир (з черги)

Спершу всі сусіди, потім сусіди сусідів — **хвилями**:

```
з A:   хвиля 0: A
       хвиля 1: B, C         (сусіди A)
       хвиля 2: D            (сусіди B, C, ще не відвідані)
       хвиля 3: E
порядок: A, B, C, D, E
```

Використання: **найкоротший шлях за кількістю ребер** (у незваженому графі), «рівні знайомства», найближчі об'єкти.

### DFS — вглиб (зі стека)

Іде **якомога глибше** по одній гілці, потім повертається:

```
з A:   A → B → D → C (через D) → ... → E
порядок: A, B, D, C, E          (перевірено запуском)
```

Використання: пошук циклів, топологічне сортування, компоненти зв'язності, розв'язування лабіринтів і задач перебору.

| | BFS | DFS |
|---|---|---|
| структура | **черга** | **стек** (або рекурсія) |
| пам'ять | ширина графа | глибина графа |
| знаходить | найкоротший шлях (за кількістю ребер) | будь-який шлях |

Обидва — O(V + E). Обидва реалізовані в класі вище: у `bfs` — черга з індексом голови (без `shift`), у `dfs` — явний стек.

## 6. Варіант 2: орієнтований зважений граф

```ts
class WeightedDigraph {
  private adj = new Map<string, Map<string, number>>();
  addVertex(v: string): void {
    if (!this.adj.has(v)) this.adj.set(v, new Map());
  }
  addEdge(from: string, to: string, weight: number): void {
    this.addVertex(from);
    this.addVertex(to);
    this.adj.get(from)!.set(to, weight); // стрілка тільки в один бік
  }
  weight(from: string, to: string): number | undefined {
    return this.adj.get(from)?.get(to);
  }
  outgoing(v: string): [string, number][] {
    return [...(this.adj.get(v) ?? [])];
  }
  // кількість ребер, що ведуть У вершину (потрібен обхід усіх)
  inDegree(v: string): number {
    let c = 0;
    for (const m of this.adj.values()) if (m.has(v)) c++;
    return c;
  }
}
```


- `Map<string, Map<string, number>>`: для кожної вершини — карта «сусід → вага»;
- `addEdge(from, to, w)` додає лише **одну** стрілку;
- **вихідні** ребра (`outgoing`) знаходяться миттєво; **вхідні** (`inDegree`) — лише обходом усіх вершин, O(V).

Зважені орієнтовані графи — основа маршрутизаторів, карт (вага = час у дорозі), залежностей збірки (вершина «зібрати X» → «зібрати Y»).

## 7. Варіант 3: матриця суміжності

```ts
class MatrixGraph {
  private m: number[][];
  constructor(private n: number) {
    this.m = Array.from({length: n}, () => new Array(n).fill(0));
  }
  addEdge(a: number, b: number, directed = false): void {
    this.m[a][b] = 1;
    if (!directed) this.m[b][a] = 1;
  }
  hasEdge(a: number, b: number): boolean {
    return this.m[a][b] === 1; // O(1)
  }
  neighbors(a: number): number[] {
    return this.m[a].flatMap((x, i) => (x ? [i] : [])); // O(V)
  }
  toMatrix(): number[][] {
    return this.m.map(r => [...r]);
  }
}
```


```
вершини 0,1,2;  ребра 0—1 (неорієнтоване), 1→2 (орієнтоване):

      0  1  2
  0 [ 0, 1, 0 ]
  1 [ 1, 0, 1 ]      m[1][2] = 1, але m[2][1] = 0 — напрямок видно в матриці
  2 [ 0, 0, 0 ]
```

Плюс: `hasEdge` за O(1) і зручна математика (множення матриць = кількість шляхів). Мінус: **O(V²) пам'яті** навіть для порожнього графа; 100 000 вершин — 10¹⁰ клітинок. Для зважених графів замість `1` зберігають вагу (а «немає ребра» позначають `Infinity` або `null`).

## 8. Складність (список суміжності)

| Операція | Складність |
|---|---|
| `addVertex` | O(1) |
| `addEdge`, `removeEdge`, `hasEdge` | O(1) (зі `Set`) |
| `removeVertex` | O(степінь вершини) |
| `neighbors` | O(степінь) |
| `bfs`, `dfs` | O(V + E) |
| пам'ять | O(V + E) |

## 9. Типові помилки

1. Забути множину `seen` в обході → **нескінченний цикл** на графі з циклами.
2. У неорієнтованому графі додати ребро в **одну** сторону.
3. Видалити вершину, але лишити посилання на неї в сусідів.
4. Використовувати `Object` як словник вершин (проблеми з ключами `constructor`, `__proto__`) — бери `Map`.
5. Дублікати ребер і самопетлі без свідомого рішення.
6. Позначати вершину відвіданою **під час витягання** з черги (а не при додаванні) — вершина потрапляє в чергу багато разів.
7. Рекурсивний DFS на дуже глибоких графах → переповнення стека; використовуй явний стек.
8. Матриця суміжності для величезного розрідженого графа.
9. Плутати орієнтовані й неорієнтовані ребра при видаленні.

## 10. Алгоритм: працюючи з графом

1. Визнач: орієнтований чи ні, зважений чи ні, розріджений чи щільний.
2. Розріджений → **Map + Set** (список суміжності); щільний або потрібне O(1) для ребра → матриця.
3. Обхід: потрібен `seen`. Найкоротший шлях за ребрами → **BFS**; глибинний аналіз → **DFS**.
4. Зважений найкоротший шлях → Дейкстра (з [Heap/PriorityQueue](../Heap/Heap.md)).
5. Видаляючи вершину — прибери її з усіх сусідів.

## Задачі для закріплення

32 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Чим відрізняються орієнтований і неорієнтований граф? Скільки ребер у повному неорієнтованому графі з `n` вершинами?

**2.** Порівняйте список суміжності та матрицю суміжності за пам'яттю й перевіркою ребра.

**3.** Яка складність BFS і DFS для графа зі списком суміжності?

**4.** Яку структуру використовує BFS, а яку — ітеративний DFS?

**5.** Що таке зв'язна компонента і як її знайти?

**6.** Чому BFS знаходить найкоротший шлях у неваговому графі, а DFS ні?

**7.** Реалізуйте `Graph` (список суміжності на `Map` і `Set`). Які сусіди вершини `a` після ребер `a-b`, `a-c`, `b-d`?

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
```

**8.** Який порядок BFS і DFS від `a` для графа `a-b, a-c, b-d, c-d, d-e`?

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
```

### Рівень 2. Методи й поведінка

**9.** Скільки ребер у неорієнтованому графі після `addEdge` двічі для однієї пари?

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
```

**10.** Що поверне `neighbors` для орієнтованого графа `a→b`: для `a` і для `b`?

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
```

**11.** Напишіть `degree(g, v)`.

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
const degree = (g, v) => g.adj.get(v).size
```

**12.** Напишіть `hasPath(g, a, b)`.

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
const hasPath = (g, a, b) => g.bfs(a).includes(b)
```

**13.** Напишіть `components(g)` — кількість зв'язних компонент.

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
function components(g) {
  const seen = new Set(); let n = 0
  for (const v of g.adj.keys()) if (!seen.has(v)) { n++; g.bfs(v).forEach(x => seen.add(x)) }
  return n
}
```

**14.** Напишіть `shortestPath(g, from, to)` (BFS, повертає масив вершин або `null`).

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
function shortestPath(g, a, b) {
  const prev = new Map([[a, null]]), q = [a]
  for (let i = 0; i < q.length; i++) { for (const n of g.adj.get(q[i])) if (!prev.has(n)) { prev.set(n, q[i]); q.push(n) } }
  if (!prev.has(b)) return null
  const p = []; for (let v = b; v !== null; v = prev.get(v)) p.push(v)
  return p.reverse()
}
```

**15.** Напишіть `hasCycleUndirected(g)` (DFS із батьком).

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
function hasCycleUndirected(g) {
  const seen = new Set()
  const go = (v, p) => { seen.add(v); for (const n of g.adj.get(v)) { if (!seen.has(n)) { if (go(n, v)) return true } else if (n !== p) return true } return false }
  for (const v of g.adj.keys()) if (!seen.has(v) && go(v, null)) return true
  return false
}
```

**16.** Напишіть `hasCycleDirected(g)` (кольори: 0 нова, 1 у стеку, 2 завершена).

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
function hasCycleDirected(g) {
  const st = new Map()
  const go = v => { st.set(v, 1); for (const n of g.adj.get(v)) { if (st.get(n) === 1) return true; if (!st.get(n) && go(n)) return true } st.set(v, 2); return false }
  for (const v of g.adj.keys()) if (!st.get(v) && go(v)) return true
  return false
}
```

### Рівень 3. Нюанси та пастки

**17.** Напишіть `topoSort(g)` на DFS (орієнтований ациклічний граф).

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
function topoSort(g) {
  const seen = new Set(), out = []
  const go = v => { seen.add(v); for (const n of g.adj.get(v)) if (!seen.has(n)) go(n); out.push(v) }
  for (const v of g.adj.keys()) if (!seen.has(v)) go(v)
  return out.reverse()
}
```

**18.** Напишіть `isBipartite(g)` — чи двочастковий граф (BFS-розфарбування).

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
function isBipartite(g) {
  const color = new Map()
  for (const s of g.adj.keys()) {
    if (color.has(s)) continue
    color.set(s, 0); const q = [s]
    for (let i = 0; i < q.length; i++) for (const n of g.adj.get(q[i])) {
      if (!color.has(n)) { color.set(n, 1 - color.get(q[i])); q.push(n) } else if (color.get(n) === color.get(q[i])) return false
    }
  }
  return true
}
```

**19.** Напишіть `dijkstra(graph, src)` для зваженого графа `{ a: { b: 1, c: 4 }, … }` (без купи, масивом).

```js
function dijkstra(g, src) {
  const dist = Object.fromEntries(Object.keys(g).map(k => [k, Infinity])); dist[src] = 0
  const done = new Set()
  while (done.size < Object.keys(g).length) {
    let u = null
    for (const k in dist) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k
    if (dist[u] === Infinity) break
    done.add(u)
    for (const [v, w] of Object.entries(g[u])) dist[v] = Math.min(dist[v], dist[u] + w)
  }
  return dist
}
```

**20.** Напишіть `cloneGraph`-перевірку: `edgeList(g)` — список унікальних ребер неорієнтованого графа.

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
function edgeList(g) {
  const out = [], seen = new Set()
  for (const [a, ns] of g.adj) for (const b of ns) { const k = [a, b].sort().join('-'); if (!seen.has(k)) { seen.add(k); out.push([a, b]) } }
  return out
}
```

**21.** Напишіть `toMatrix(g, order)` — матриця суміжності.

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
const toMatrix = (g, order) => order.map(a => order.map(b => (g.adj.get(a).has(b) ? 1 : 0)))
```

**22.** Напишіть `fromMatrix(m)` — список ребер із матриці.

```js
const fromMatrix = m => m.flatMap((r, i) => r.flatMap((x, j) => (x ? [[i, j]] : [])))
```

**23.** Напишіть `canFinish(n, prereqs)` — чи можна пройти всі курси (немає циклу).

```js
function canFinish(n, pre) {
  const indeg = Array(n).fill(0), adj = Array.from({ length: n }, () => [])
  for (const [a, b] of pre) { adj[b].push(a); indeg[a]++ }
  const q = indeg.flatMap((d, i) => (d ? [] : [i])); let c = 0
  for (let i = 0; i < q.length; i++) { c++; for (const m of adj[q[i]]) if (--indeg[m] === 0) q.push(m) }
  return c === n
}
```

**24.** Напишіть `findJudge(n, trust)` — суддя: його всі довіряють, він нікому не довіряє.

```js
function findJudge(n, trust) {
  const score = Array(n + 1).fill(0)
  for (const [a, b] of trust) { score[a]--; score[b]++ }
  for (let i = 1; i <= n; i++) if (score[i] === n - 1) return i
  return -1
}
```

### Рівень 4. Практика й реалізація

**25.** Напишіть `numProvinces(isConnected)` — кількість груп міст.

```js
function numProvinces(m) {
  const seen = new Set(); let n = 0
  const go = i => { seen.add(i); m[i].forEach((c, j) => c && !seen.has(j) && go(j)) }
  for (let i = 0; i < m.length; i++) if (!seen.has(i)) { n++; go(i) }
  return n
}
```

**26.** Напишіть `allPaths(g, from, to)` — усі шляхи в орієнтованому ациклічному графі.

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
function allPaths(g, a, b, path = [a]) {
  if (a === b) return [path]
  return g.neighbors(a).flatMap(n => allPaths(g, n, b, [...path, n]))
}
```

**27.** Напишіть `unionFind` з `find` і `union`. Скільки компонент після `union(1,2), union(3,4), union(2,3)` для 5 вершин?

```js
class DSU {
  constructor(n) { this.p = Array.from({ length: n }, (_, i) => i); this.c = n }
  find(x) { return this.p[x] === x ? x : (this.p[x] = this.find(this.p[x])) }
  union(a, b) { const x = this.find(a), y = this.find(b); if (x !== y) { this.p[x] = y; this.c-- } }
}
```

**28.** Напишіть `kruskal(n, edges)` — вага мінімального остовного дерева.

```js
function kruskal(n, edges) {
  const p = Array.from({ length: n }, (_, i) => i)
  const find = x => (p[x] === x ? x : (p[x] = find(p[x])))
  let w = 0
  for (const [a, b, c] of [...edges].sort((x, y) => x[2] - y[2])) { const x = find(a), y = find(b); if (x !== y) { p[x] = y; w += c } }
  return w
}
```

**29.** Напишіть `levelsFrom(g, s)` — відстані (кількість ребер) від `s` до всіх досяжних вершин.

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
function levelsFrom(g, s) {
  const d = new Map([[s, 0]]), q = [s]
  for (let i = 0; i < q.length; i++) for (const n of g.adj.get(q[i])) if (!d.has(n)) { d.set(n, d.get(q[i]) + 1); q.push(n) }
  return Object.fromEntries(d)
}
```

**30.** Напишіть `cloneGraph(g)` — глибока копія. Чи ділять копія й оригінал `Set`?

```js
class Graph {
  constructor(directed = false) { this.adj = new Map(); this.directed = directed }
  addVertex(v) { if (!this.adj.has(v)) this.adj.set(v, new Set()); return this }
  addEdge(a, b) { this.addVertex(a).addVertex(b); this.adj.get(a).add(b); if (!this.directed) this.adj.get(b).add(a); return this }
  neighbors(v) { return [...(this.adj.get(v) ?? [])] }
  bfs(s) { const seen = new Set([s]), q = [s], o = []; for (let i = 0; i < q.length; i++) { o.push(q[i]); for (const n of this.adj.get(q[i])) if (!seen.has(n)) { seen.add(n); q.push(n) } } return o }
  dfs(s, seen = new Set(), o = []) { seen.add(s); o.push(s); for (const n of this.adj.get(s)) if (!seen.has(n)) this.dfs(n, seen, o); return o }
}
const mkG = (edges, directed = false) => edges.reduce((g, [a, b]) => g.addEdge(a, b), new Graph(directed))
function cloneGraph(g) { const c = new Graph(g.directed); for (const [k, v] of g.adj) c.adj.set(k, new Set(v)); return c }
```

**31.** Напишіть `islandPerimeter(grid)` — периметр острова з `1`.

```js
function islandPerimeter(g) {
  let p = 0
  for (let i = 0; i < g.length; i++) for (let j = 0; j < g[0].length; j++) if (g[i][j]) { p += 4; if (i && g[i - 1][j]) p -= 2; if (j && g[i][j - 1]) p -= 2 }
  return p
}
```

**32.** Напишіть `courseOrder(n, prereqs)` — порядок проходження курсів (Кан).

```js
function courseOrder(n, pre) {
  const indeg = Array(n).fill(0), adj = Array.from({ length: n }, () => [])
  for (const [a, b] of pre) { adj[b].push(a); indeg[a]++ }
  const q = indeg.flatMap((d, i) => (d ? [] : [i]))
  for (let i = 0; i < q.length; i++) for (const m of adj[q[i]]) if (--indeg[m] === 0) q.push(m)
  return q.length === n ? q : []
}
```

### Відповіді

1. В орієнтованому ребро має напрям; у неорієнтованому — ні. Повний граф: `n(n−1)/2` ребер.
2. Список: `O(V+E)` пам'яті, перевірка ребра `O(deg)`; матриця: `O(V²)` пам'яті, перевірка ребра `O(1)`.
3. `O(V + E)`.
4. BFS — чергу, DFS — стек (або рекурсію).
5. Максимальна множина вершин, досяжних одна з одної; знаходять запуском BFS/DFS із ще не відвіданих вершин.
6. BFS відвідує вершини в порядку зростання відстані (за кількістю ребер); DFS іде вглиб і може знайти довший шлях першим.
7. Виклик `mkG([['a', 'b'], ['a', 'c'], ['b', 'd']]).neighbors('a')` → `['b', 'c']`
8. Виклик `(() => { const g = mkG([['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['d', 'e']]); return [g.bfs('a'), g.dfs('a')]; })()` → `[['a', 'b', 'c', 'd', 'e'], ['a', 'b', 'd', 'c', 'e']]`
9. Виклик `(() => { const g = mkG([['a', 'b'], ['b', 'a']]); return [...g.adj.values()].reduce((s, x) => s + x.size, 0) / 2; })()` → `1`
10. Виклик `(() => { const g = mkG([['a', 'b']], true); return [g.neighbors('a'), g.neighbors('b')]; })()` → `[['b'], []]`
11. Виклик `(() => { const g = mkG([['a', 'b'], ['a', 'c'], ['b', 'c']]); return [degree(g, 'a'), degree(g, 'c')]; })()` → `[2, 2]`
12. Виклик `(() => { const g = mkG([['a', 'b'], ['c', 'd']]); return [hasPath(g, 'a', 'b'), hasPath(g, 'a', 'd')]; })()` → `[true, false]`
13. Виклик `components(mkG([['a', 'b'], ['c', 'd'], ['d', 'e']]).addVertex('z'))` → `3`
14. Виклик `(() => { const g = mkG([['a', 'b'], ['b', 'c'], ['a', 'd'], ['d', 'c'], ['c', 'e']]); return [shortestPath(g, 'a', 'e'), shortestPath(g.addVertex('z'), 'a', 'z')]; })()` → `[['a', 'b', 'c', 'e'], null]`
15. Виклик `[hasCycleUndirected(mkG([['a', 'b'], ['b', 'c']])), hasCycleUndirected(mkG([['a', 'b'], ['b', 'c'], ['c', 'a']]))]` → `[false, true]`
16. Виклик `[hasCycleDirected(mkG([['a', 'b'], ['b', 'c']], true)), hasCycleDirected(mkG([['a', 'b'], ['b', 'c'], ['c', 'a']], true))]` → `[false, true]`
17. Виклик `topoSort(mkG([['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']], true))` → `['a', 'c', 'b', 'd']`
18. Виклик `[isBipartite(mkG([['a', 'b'], ['b', 'c'], ['c', 'd']])), isBipartite(mkG([['a', 'b'], ['b', 'c'], ['c', 'a']]))]` → `[true, false]`
19. Виклик `dijkstra({ a: { b: 1, c: 4 }, b: { c: 2, d: 5 }, c: { d: 1 }, d: {} }, 'a')` → `{ a: 0, b: 1, c: 3, d: 4 }`
20. Виклик `edgeList(mkG([['a', 'b'], ['b', 'c'], ['c', 'a']]))` → `[['a', 'b'], ['a', 'c'], ['b', 'c']]`
21. Виклик `toMatrix(mkG([['a', 'b'], ['b', 'c']]), ['a', 'b', 'c'])` → `[[0, 1, 0], [1, 0, 1], [0, 1, 0]]`
22. Виклик `fromMatrix([[0, 1, 0], [0, 0, 1], [1, 0, 0]])` → `[[0, 1], [1, 2], [2, 0]]`
23. Виклик `[canFinish(2, [[1, 0]]), canFinish(2, [[1, 0], [0, 1]])]` → `[true, false]`
24. Виклик `[findJudge(3, [[1, 3], [2, 3]]), findJudge(3, [[1, 3], [2, 3], [3, 1]])]` → `[3, -1]`
25. Виклик `[numProvinces([[1, 1, 0], [1, 1, 0], [0, 0, 1]]), numProvinces([[1, 0], [0, 1]])]` → `[2, 2]`
26. Виклик `allPaths(mkG([['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']], true), 'a', 'd')` → `[['a', 'b', 'd'], ['a', 'c', 'd']]`
27. Виклик `(() => { const d = new DSU(5); d.union(1, 2); d.union(3, 4); d.union(2, 3); return [d.c, d.find(1) === d.find(4), d.find(0) === d.find(1)]; })()` → `[2, true, false]`
28. Виклик `kruskal(4, [[0, 1, 10], [0, 2, 6], [0, 3, 5], [1, 3, 15], [2, 3, 4]])` → `19`
29. Виклик `levelsFrom(mkG([['a', 'b'], ['a', 'c'], ['b', 'd'], ['d', 'e']]), 'a')` → `{ a: 0, b: 1, c: 1, d: 2, e: 3 }`
30. Виклик `(() => { const g = mkG([['a', 'b']]); const c = cloneGraph(g); c.addEdge('a', 'z'); return [g.neighbors('a'), c.neighbors('a'), g.adj.get('a') === c.adj.get('a')]; })()` → `[['b'], ['b', 'z'], false]`
31. Виклик `islandPerimeter([[0, 1, 0, 0], [1, 1, 1, 0], [0, 1, 0, 0], [1, 1, 0, 0]])` → `16`
32. Виклик `[courseOrder(4, [[1, 0], [2, 0], [3, 1], [3, 2]]), courseOrder(2, [[1, 0], [0, 1]])]` → `[[0, 1, 2, 3], []]`
