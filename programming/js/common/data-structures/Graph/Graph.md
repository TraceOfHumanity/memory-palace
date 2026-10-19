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
