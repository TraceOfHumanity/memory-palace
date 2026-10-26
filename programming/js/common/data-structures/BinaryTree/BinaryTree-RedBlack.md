# BinaryTree — червоно-чорне дерево (Red-Black Tree)

Продовження [BinaryTree.md](BinaryTree.md) і [BinaryTree-AVL.md](BinaryTree-AVL.md). Усі результати нижче отримані реальним запуском реалізації з розділу 8 (Node 24). Кожен тест перевіряв усі п'ять властивостей після кожної операції.

## 1. Проблема і ідея

Звичайний BST на відсортованих даних вироджується в список: вставка 1…1000 дає висоту **1000**, пошук `O(n)`. Самобалансівні дерева гарантують `O(log n)`. AVL тримає суворий баланс (різниця висот ≤ 1), тому часто обертає. **Червоно-чорне дерево** (Bayer 1972; назву й кольори запропонували Guibas і Sedgewick, 1978) тримає **слабший** баланс: кожен вузол має колір, а набір правил про кольори гарантує, що найдовший шлях не більше ніж у 2 рази довший за найкоротший.

## 2. П'ять властивостей

1. Кожен вузол **червоний** або **чорний**.
2. **Корінь чорний.**
3. Усі «листки» (порожні посилання, **NIL**) **чорні**. NIL — це відсутні діти; у реалізації один спільний вузол-сторож.
4. **Червоний вузол не має червоних дітей** (немає двох червоних поспіль на шляху).
5. Усі шляхи від будь-якого вузла до його NIL-листків містять **однакову кількість чорних вузлів** (чорна висота, black-height).

## 3. Чому це дає O(log n)

- Нехай чорна висота кореня `bh`. За властивістю 5 усі шляхи мають `bh` чорних вузлів, а за властивістю 4 червоні вузли не стоять поспіль → найдовший шлях ≤ `2·bh` (чорний, червоний, чорний, червоний…), найкоротший = `bh`. Отже **висота ≤ 2·bh**.
- Піддерево з чорною висотою `bh` має щонайменше `2^bh − 1` вузлів (дерево з самих чорних, повне). Тому `n ≥ 2^bh − 1` → `bh ≤ log₂(n+1)`.
- Разом: **висота ≤ 2·log₂(n + 1)**. Для `n = 10⁶` це ≤ 39,9.

Виміряно (вставка 1, 2, 3, … n по порядку — найгірший сценарій для звичайного BST):

| n | висота RB | межа 2·log₂(n+1) | ⌈log₂(n+1)⌉ (ідеал) | чорна висота | обертань на вставку |
|---|---|---|---|---|---|
| 7 | 4 | 6,0 | 3 | 2 | 0,43 |
| 15 | 6 | 8,0 | 4 | 3 | 0,60 |
| 100 | 11 | 13,3 | 7 | 6 | 0,89 |
| 1 000 | 17 | 19,9 | 10 | 9 | 0,98 |
| 100 000 | 31 | 33,2 | 17 | 16 | 1,00 |
| 1 000 000 | 37 | 39,9 | 20 | 19 | 1,00 |

Для порівняння: звичайний BST на тих самих даних при `n = 1000` має висоту **1000**. Випадкова вставка: 200 дерев по 1000 ключів — найбільша висота **13**; `n = 10⁵` випадкових ключів → висота **20** (log₂ ≈ 16,6), у середньому **0,605** обертань і **0,517** перефарбувань на вставку.

## 4. Обертання

Ті самі, що в AVL (див. [BinaryTree-AVL.md](BinaryTree-AVL.md)): `rotateLeft(x)`, `rotateRight(x)` — `O(1)`, зберігають порядок BST, змінюють лише форму.

```
     x                  y
    / \                / \
   A   y     ──▶     x   C
      / \             / \
     B   C           A   B       (rotateLeft(x); rotateRight — дзеркально)
```

## 5. Вставка

1. Вставляємо як у звичайному BST, новий вузол **червоний** (щоб не порушити чорну висоту — властивість 5).
2. Порушитись може лише: корінь став червоним (властивість 2) або **червоний батько** у червоного вузла (властивість 4). Виправляємо знизу вгору («fix-up»).

Нехай `z` — новий вузол, `p` — батько (червоний), `g` — дід (він чорний, бо батько червоний), `u` — дядько. Якщо батько — ліва дитина діда (дзеркально для правої):

| Випадок | Умова | Дія |
|---|---|---|
| **1. Дядько червоний** | `u` червоний | перефарбувати `p` і `u` у чорний, `g` у червоний; піднятися: `z = g` (проблема може піти вгору) |
| **2. Дядько чорний, «трикутник»** | `u` чорний, `z` — права дитина `p` | `rotateLeft(p)` → зводиться до випадку 3 |
| **3. Дядько чорний, «лінія»** | `u` чорний, `z` — ліва дитина `p` | `p` у чорний, `g` у червоний, `rotateRight(g)` — **кінець** |

Наприкінці корінь завжди фарбуємо в чорний. Випадок 1 може повторюватись до кореня (`O(log n)` перефарбувань), випадки 2–3 виконуються **не більше одного разу** → **не більше 2 обертань на вставку**.

### Покроковий приклад (реальний вивід): вставляємо 10, 20, 30, 15, 25, 5, 1

Запис дерева: `ключ+колір(ліве, праве)`, `R` — червоний, `B` — чорний, `·` — NIL.

| Вставка | Дерево після вставки | Що сталося |
|---|---|---|
| 10 | `10B` | корінь, фарбуємо в чорний |
| 20 | `10B(·, 20R)` | червоний під чорним — порушень немає |
| 30 | `20B(10R, 30R)` | дядько чорний (NIL), «лінія» → `rotateLeft(10)` + перефарбування |
| 15 | `20B(10B(·,15R), 30B)` | дядько (30) червоний → перефарбування: 10 і 30 чорні, 20 червоний → корінь знову чорний |
| 25 | `20B(10B(·,15R), 30B(25R,·))` | батько чорний — без змін |
| 5 | `20B(10B(5R,15R), 30B(25R,·))` | батько чорний — без змін |
| 1 | `20B(10R(5B(1R,·),15B), 30B(25R,·))` | дядько (15) червоний → перефарбування вгору: 5 і 15 чорні, 10 червоний |

Ще приклад — послідовність 1…7 (реальний вивід): `+3: rotateLeft(1)` → `2B(1R,3R)`; `+4`: дядько червоний → `2B(1B, 3B(·,4R))`; `+5`: `rotateLeft(3)` → `2B(1B, 4B(3R,5R))`; `+6`: перефарбування → `2B(1B, 4R(3B, 5B(·,6R)))`; `+7`: `rotateLeft(5)` → `2B(1B, 4R(3B, 6B(5R,7R)))`. Висота 4 для 7 елементів (ідеал 3).

## 6. Видалення

Складніше за вставку. Спершу — як у BST: якщо вузол має двох дітей, береться наступник (мінімум правого піддерева). Якщо **видалений (або перенесений) вузол був чорним**, порушується чорна висота — на його місці лишається «подвійно чорний» вузол `x`. Якщо видалений був червоним — нічого виправляти не треба.

Нехай `x` — подвійно чорний, `w` — його брат (для `x` — ліва дитина; дзеркально інакше):

| Випадок | Умова | Дія |
|---|---|---|
| **1** | брат `w` червоний | `w` у чорний, батько в червоний, `rotateLeft(батько)`; тепер брат чорний → випадки 2–4 |
| **2** | `w` чорний, **обидва** його діти чорні | `w` у червоний; піднятися: `x = батько` |
| **3** | `w` чорний, його **ближня** дитина червона, дальня чорна | ближню в чорний, `w` у червоний, `rotateRight(w)` → випадок 4 |
| **4** | `w` чорний, **дальня** дитина червона | `w` отримує колір батька, батько й дальня дитина стають чорними, `rotateLeft(батько)` — **кінець** |

Наприкінці `x` фарбуємо в чорний. Не більше **3 обертань** на видалення.

Реальні приклади. Дерево `20B(10B(5R,15R), 30B(25R,40R))`:
- видаляємо 5 (червоний лист) → `20B(10B(·,15R), …)` без виправлень;
- видаляємо 15 (червоний) → без виправлень;
- видаляємо 10 (чорний) → **випадок 4**: `rotateLeft(20)`, результат `30B(20B(·,25R), 40B)`.

Дерево `10B(5R(3B(1R),7B), 15B(12R,20R))`: видалили 12 і 15 — без виправлень (червоний / з червоним замінником); видалення 20 → **випадок 1** (`rotateRight`), потім **випадок 2** (перефарбування, піднімання), результат `5B(3B(1R), 10B(7R))`. Чорна висота після кожного кроку збереглась (перевірка `bh = 2`).

Стрес-тест: 2000 випадкових ключів, видалено 1500 по одному з перевіркою усіх властивостей після **кожного** видалення — порушень немає (залишилось 500, висота 11, bh 7); потім 5000 випадкових вставок/видалень — порушень немає.

## 7. Порівняння з AVL

| | AVL | Червоно-чорне |
|---|---|---|
| Баланс | суворий (різниця висот ≤ 1) | слабкий (найдовший шлях ≤ 2× найкоротшого) |
| Висота | ≈ 1,44·log₂ n (у вставці по порядку 1…10⁶ ≈ 20) | ≤ 2·log₂(n+1) (при тих самих даних **37**) |
| Пошук | трохи швидший (нижче дерево) | трохи повільніший |
| Вставка / видалення | більше обертань | ≤ 2 / ≤ 3 обертання, переважно перефарбування |
| Зберігає | висоту/баланс (≥ 2 біти) | 1 біт кольору |
| Де використовується | коли пошуків багато, змін мало | коли багато змін |

Червоно-чорні дерева використовують: `std::map` / `std::set` у C++ (у поширених реалізаціях), `TreeMap` / `TreeSet` у Java, бакети `HashMap` у Java при великих колізіях (від 8 елементів), ядро Linux (`rbtree`, наприклад у планувальнику процесів та таймерах). У JavaScript вбудованого червоно-чорного дерева немає (`Map`/`Set` — хеш-таблиці), тому для впорядкованого словника його пишуть самі або беруть бібліотеку.

## 8. Реалізація (перевірена) на JavaScript

Один спільний вузол `NIL` (чорний) замість `null` — спрощує код: у NIL завжди можна читати `.color`.

```js
const RED=true, BLACK=false;
class Node{constructor(k,c,nil){this.key=k;this.color=c;this.left=nil;this.right=nil;this.parent=nil}}
class RBTree{
  constructor(){this.NIL=new Node(null,BLACK,null);this.NIL.left=this.NIL.right=this.NIL.parent=this.NIL;this.root=this.NIL;this.log=[];this.rot=0;this.recolor=0}
  rotateLeft(x){const y=x.right;x.right=y.left;if(y.left!==this.NIL)y.left.parent=x;y.parent=x.parent;
    if(x.parent===this.NIL)this.root=y;else if(x===x.parent.left)x.parent.left=y;else x.parent.right=y;y.left=x;x.parent=y;this.rot++}
  rotateRight(x){const y=x.left;x.left=y.right;if(y.right!==this.NIL)y.right.parent=x;y.parent=x.parent;
    if(x.parent===this.NIL)this.root=y;else if(x===x.parent.right)x.parent.right=y;else x.parent.left=y;y.right=x;x.parent=y;this.rot++}
  insert(key){
    const z=new Node(key,RED,this.NIL);let y=this.NIL,x=this.root;
    while(x!==this.NIL){y=x;x=key<x.key?x.left:x.right}
    z.parent=y;if(y===this.NIL)this.root=z;else if(key<y.key)y.left=z;else y.right=z;
    this.fixInsert(z);
  }
  fixInsert(z){
    while(z.parent.color===RED){
      const p=z.parent,g=p.parent;
      if(p===g.left){const u=g.right;
        if(u.color===RED){p.color=BLACK;u.color=BLACK;g.color=RED;this.recolor++;this.log.push(`${z.key}: uncle red → recolor (p=${p.key},u=${u.key},g=${g.key})`);z=g}
        else{ if(z===p.right){this.log.push(`${z.key}: uncle black, triangle → rotateLeft(${p.key})`);z=p;this.rotateLeft(z)}
          z.parent.color=BLACK;z.parent.parent.color=RED;this.log.push(`${z.key}: uncle black, line → rotateRight(${z.parent.parent.key}), recolor`);this.rotateRight(z.parent.parent)}
      } else {const u=g.left;
        if(u.color===RED){p.color=BLACK;u.color=BLACK;g.color=RED;this.recolor++;this.log.push(`${z.key}: uncle red → recolor (p=${p.key},u=${u.key},g=${g.key})`);z=g}
        else{ if(z===p.left){this.log.push(`${z.key}: uncle black, triangle → rotateRight(${p.key})`);z=p;this.rotateRight(z)}
          z.parent.color=BLACK;z.parent.parent.color=RED;this.log.push(`${z.key}: uncle black, line → rotateLeft(${z.parent.parent.key}), recolor`);this.rotateLeft(z.parent.parent)}
      }
    }
    this.root.color=BLACK;
  }
  transplant(u,v){if(u.parent===this.NIL)this.root=v;else if(u===u.parent.left)u.parent.left=v;else u.parent.right=v;v.parent=u.parent}
  minimum(x){while(x.left!==this.NIL)x=x.left;return x}
  find(k){let x=this.root;while(x!==this.NIL&&x.key!==k)x=k<x.key?x.left:x.right;return x}
  delete(key){
    const z=this.find(key);if(z===this.NIL)return false;
    let y=z,yc=y.color,x;
    if(z.left===this.NIL){x=z.right;this.transplant(z,z.right)}
    else if(z.right===this.NIL){x=z.left;this.transplant(z,z.left)}
    else{y=this.minimum(z.right);yc=y.color;x=y.right;
      if(y.parent===z)x.parent=y;else{this.transplant(y,y.right);y.right=z.right;y.right.parent=y}
      this.transplant(z,y);y.left=z.left;y.left.parent=y;y.color=z.color}
    if(yc===BLACK)this.fixDelete(x);
    return true;
  }
  fixDelete(x){
    while(x!==this.root&&x.color===BLACK){
      if(x===x.parent.left){let w=x.parent.right;
        if(w.color===RED){w.color=BLACK;x.parent.color=RED;this.log.push('case1: sibling red → rotateLeft(parent)');this.rotateLeft(x.parent);w=x.parent.right}
        if(w.left.color===BLACK&&w.right.color===BLACK){w.color=RED;this.log.push('case2: sibling black, both nephews black → sibling red, go up');x=x.parent}
        else{ if(w.right.color===BLACK){w.left.color=BLACK;w.color=RED;this.log.push('case3: near nephew red → rotateRight(sibling)');this.rotateRight(w);w=x.parent.right}
          w.color=x.parent.color;x.parent.color=BLACK;w.right.color=BLACK;this.log.push('case4: far nephew red → rotateLeft(parent), recolor, done');this.rotateLeft(x.parent);x=this.root}
      } else {let w=x.parent.left;
        if(w.color===RED){w.color=BLACK;x.parent.color=RED;this.log.push('case1: sibling red → rotateRight(parent)');this.rotateRight(x.parent);w=x.parent.left}
        if(w.right.color===BLACK&&w.left.color===BLACK){w.color=RED;this.log.push('case2: sibling black, both nephews black → sibling red, go up');x=x.parent}
        else{ if(w.left.color===BLACK){w.right.color=BLACK;w.color=RED;this.log.push('case3: near nephew red → rotateLeft(sibling)');this.rotateLeft(w);w=x.parent.left}
          w.color=x.parent.color;x.parent.color=BLACK;w.left.color=BLACK;this.log.push('case4: far nephew red → rotateRight(parent), recolor, done');this.rotateRight(x.parent);x=this.root}
      }
    }
    x.color=BLACK;
  }
  height(n=this.root){return n===this.NIL?0:1+Math.max(this.height(n.left),this.height(n.right))}
  size(n=this.root){return n===this.NIL?0:1+this.size(n.left)+this.size(n.right)}
  check(){ // returns black height or throws
    const NIL=this.NIL; if(this.root.color!==BLACK)throw Error('root red');
    const rec=(n)=>{ if(n===NIL)return 1; if(n.color===RED&&(n.left.color===RED||n.right.color===RED))throw Error('red-red at '+n.key);
      if(n.left!==NIL&&!(n.left.key<n.key))throw Error('bst');if(n.right!==NIL&&!(n.right.key>n.key))throw Error('bst');
      const a=rec(n.left),b=rec(n.right);if(a!==b)throw Error('black height at '+n.key);return a+(n.color===BLACK?1:0)};
    return rec(this.root)-1; // без NIL
  }
  show(n=this.root){return n===this.NIL?'·':`${n.key}${n.color===RED?'R':'B'}(${this.show(n.left)},${this.show(n.right)})`}
}

```

Використання:
```js
const t = new RBTree();
for (const k of [10, 20, 30, 15, 25, 5, 1]) t.insert(k);
t.show();     // "20B(10R(5B(1R(·,·),·),15B(·,·)),30B(25R(·,·),·))"
t.find(25);   // вузол або t.NIL
t.delete(10);
t.height();   // висота
t.check();    // перевіряє властивості 2, 4, 5 і порядок BST; повертає чорну висоту
```

## 9. Складність

| Операція | Час |
|---|---|
| пошук `find` | `O(log n)` |
| вставка | `O(log n)` (≤ 2 обертання) |
| видалення | `O(log n)` (≤ 3 обертання) |
| мінімум / максимум / наступник | `O(log n)` |
| обхід in-order | `O(n)` |
| пам'ять | `O(n)` (+ 1 біт кольору на вузол) |

Виміряно (200 000 випадкових ключів, ця машина): вставка в `RBTree` ≈ 77 мс, пошук ≈ 42 мс, вставка в `Map` ≈ 11 мс — хеш-таблиця швидша, але **не впорядкована**: червоно-чорне дерево дає ще й порядок, діапазони й «найближчий ключ».

## 10. Зв'язок з 2-3-4 деревом

Червоно-чорне дерево — це 2-3-4 дерево (B-дерево порядку 4), записане як бінарне: чорний вузол + його червоні діти зливаються в один вузол 2-3-4. Чорний вузол без червоних дітей = 2-вузол; з одним червоним = 3-вузол; з двома = 4-вузол. Обертання й перефарбування — це розщеплення й злиття вузлів 2-3-4 дерева. Звідси й рівність чорних висот: у B-дереві всі листки на одній глибині.

## 11. Типові помилки

1. Фарбувати новий вузол у **чорний** — зламає чорну висоту; новий вузол завжди червоний.
2. Забути пофарбувати **корінь** у чорний після fix-up.
3. Не оновити **батьків** (`parent`) при обертанні й `transplant`.
4. Використовувати `null` замість NIL-сторожа й забути, що NIL чорний — зламає перевірки кольору дядька/брата.
5. Забути, що перенесений наступник при видаленні **успадковує колір** видаленого вузла.
6. Плутати випадки 3 і 4 при видаленні (ближня/дальня дитина брата).
7. Очікувати ідеального балансу: висота може бути до 2× більшою за ідеал (37 проти 20 для 10⁶).
8. Тестувати лише на випадкових даних — перевір і відсортовані (`1…n`).

## 12. Алгоритм (коротко)

1. Вставка: як у BST, новий вузол **червоний**.
2. Дядько червоний → перефарбувати `p`, `u`, `g`, піднятися до діда.
3. Дядько чорний, «трикутник» → обертання навколо батька, далі як «лінія».
4. Дядько чорний, «лінія» → перефарбувати й обернути діда; кінець.
5. Корінь завжди чорний.
6. Видалення: якщо видалений чорний — виправити «подвійно чорний» випадками 1–4 з брата.
7. Висота ≤ 2·log₂(n+1) — тому всі операції `O(log n)`.
