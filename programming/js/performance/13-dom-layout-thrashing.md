# Браузер: layout thrashing та вимушений синхронний layout

> Це єдина нотатка в цій серії, що стосується не V8-рушія напряму, а того, як браузер рендерить сторінку. Причина та сама, що й у решти принципів: непередбачувані, «розкидані» операції змушують систему робити зайву, дорогу роботу — тут це перерахунок layout (розташування елементів на сторінці), а не деоптимізація V8. Приклади нижче потребують DOM (`document`, `window`) і не виконуються в Node.js — вони наведені як браузерний псевдокод, що синтаксично відповідає реальному коду.

Основне правило: не чергуй читання layout-властивостей (`offsetWidth`, `getBoundingClientRect` тощо) із записом стилів у циклі. Спочатку прочитай усе, що треба, потім запиши все, що треба.

## 1. Як браузер рендерить сторінку (спрощено)

Конвеєр рендерингу (rendering pipeline), спрощено:

```text
JavaScript → Style (обчислення CSS) → Layout (розташування,
"reflow") → Paint (малювання пікселів) → Composite (об'єднання шарів)
```

Layout — одна з найдорожчих стадій: браузер перераховує розміри й позиції кожного елемента, залежного від того, що ти змінив (а часто — і всієї сторінки, якщо зміна впливає на батьківські чи сусідні елементи).

За замовчуванням браузер намагається відкласти layout і зробити його один раз за кадр (перед Paint) — навіть якщо ти змінив сотню стилів підряд, layout перерахується один раз, у потрібний момент.

Але: якщо ти запитуєш (read) властивість, яка залежить від layout (`offsetWidth`, `offsetHeight`, `getBoundingClientRect()`, `scrollTop`, `getComputedStyle()` тощо) після того, як щойно змінив стиль (write) — браузер змушений негайно, синхронно перерахувати layout прямо зараз, щоб дати тобі актуальне значення. Це називається forced synchronous layout (або «layout thrashing», коли це повторюється в циклі).

## 2. Layout thrashing — чергування read/write у циклі

```js
// ❌ Класичний приклад layout thrashing (браузерний псевдокод):
function resizeBoxesBad(boxes) {
  for (const box of boxes) {
    const width = box.offsetWidth;   // READ — використовує layout
    box.style.width = width + 10 + "px"; // WRITE — інвалідує layout
    // ↑ наступна ітерація знову READ → браузер змушений перерахувати
    //   layout прямо тут, синхронно, для кожної ітерації!
  }
}
```

На N елементів — N вимушених синхронних layout-перерахунків замість одного. Кожен такий вимушений reflow коштує помітну частку мілісекунди; на великій кількості елементів це складається в затримку, яку користувач бачить як фриз інтерфейсу.

```js
// ✅ Правильно: спочатку усі READ, потім усі WRITE (batch read/write)
function resizeBoxesGood(boxes) {
  // фаза 1: зчитай усі потрібні значення заздалегідь
  const widths = boxes.map((box) => box.offsetWidth); // READ, READ, READ...
  // фаза 2: запиши всі зміни — жодного READ між ними
  boxes.forEach((box, i) => {
    box.style.width = widths[i] + 10 + "px"; // WRITE, WRITE, WRITE...
  });
  // браузер перерахує layout один раз, у потрібний момент
}
```

## 3. Які властивості «змушують» layout (read, що тригерить reflow)

Найпоширеніші «layout-залежні» read-властивості й методи:

- `offsetWidth`, `offsetHeight`, `offsetTop`, `offsetLeft`, `offsetParent`;
- `clientWidth`, `clientHeight`, `clientTop`, `clientLeft`;
- `scrollWidth`, `scrollHeight`, `scrollTop`, `scrollLeft`;
- `getBoundingClientRect()`;
- `getComputedStyle()` (для деяких властивостей);
- `window.getSelection()`.

Якщо одразу після зміни стилю викликати будь-який з них — це forced synchronous layout.

## Правила

### Правило 1: розділяй фази read і write (batching)

Показано в розділі 2 вище — читай усе спочатку, пиши все потім. Бібліотеки на кшталт fastdom автоматизують саме цей патерн: планують read-колбеки й write-колбеки в окремі черги й виконують їх батчами в правильному порядку.

### Правило 2: використовуй `requestAnimationFrame` для write-змін

`requestAnimationFrame(callback)` гарантує, що callback виконається прямо перед наступним repaint — ідеальний момент для write-операцій, синхронізованих з кадром:

```js
function animateWidth(element, targetWidth) {
  requestAnimationFrame(() => {
    element.style.width = targetWidth + "px"; // WRITE у правильний момент
  });
}
```

### Правило 3: змінюй класи (`className`/`classList`), а не окремі inline-стилі

```js
// ❌ Багато окремих WRITE у style — кожен потенційно інвалідує layout:
element.style.width = "100px";
element.style.height = "50px";
element.style.marginTop = "10px";
// (браузер може об'єднати ці WRITE в один reflow, якщо між ними
//  немає READ — але явний клас усе одно надійніший і читабельніший)
```

```js
// ✅ Один WRITE через клас — усі зміни стилю разом:
element.classList.add("resized-box"); // один DOM-запис, CSS робить решту
```

### Правило 4: використовуй `transform`/`opacity` замість властивостей, що впливають на layout

Не всі CSS-зміни однаково «дорогі». Зміна `position`/`width`/`height`/`margin`/`top`/`left` змушує layout. Зміна `transform` і `opacity` — ні, вони обробляються на етапі Composite (найлегший рівень конвеєра), часто навіть з апаратним прискоренням GPU:

```js
// ❌ дорого: змінює layout
element.style.left = x + "px";
element.style.top = y + "px";

// ✅ дешево: не змінює layout, лише composite
element.style.transform = `translate(${x}px, ${y}px)`;
```

### Правило 5: уникай layout-читання в обробниках подій, що спрацьовують часто

`scroll`/`resize`/`mousemove` спрацьовують десятки-сотні разів на секунду. Якщо в обробнику є layout-read+write без батчингу — thrashing відбувається на кожен виклик обробника. Комбінуй з debounce/throttle (концептуально той самий підхід, що й у нотатці про асинхронний код, розділ про debounce, але тут для синхронних DOM-подій):

```js
let ticking = false;
window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const scrollY = window.scrollY; // READ один раз за кадр
      header.style.transform = `translateY(${Math.min(scrollY, 100)}px)`; // WRITE
      ticking = false;
    });
    ticking = true;
  }
});
```

## Як побачити layout thrashing

Chrome DevTools → вкладка Performance → запиши профіль взаємодії зі сторінкою. Записи «Layout» (фіолетові смуги), що повторюються дуже часто підряд, і особливо попередження «Forced reflow» / «Layout was forced before the page was fully loaded» у консолі — прямий сигнал layout thrashing.

## Підсумок

- Layout (reflow) — одна з найдорожчих стадій рендерингу браузера; за замовчуванням браузер відкладає й батчить перерахунок layout до одного разу за кадр.
- Read layout-залежної властивості (`offsetWidth`, `getBoundingClientRect` тощо) одразу після write стилю змушує браузер перерахувати layout негайно й синхронно — forced synchronous layout.
- Повторення цього патерну в циклі = layout thrashing: N елементів → N синхронних reflow замість одного.
- Головне правило: розділяй фази read і write — спочатку зчитай усе, що треба, потім запиши все, що треба (batch read/write).
- `requestAnimationFrame` — правильний момент для write, синхронізований з кадром; для частих подій (`scroll`/`resize`/`mousemove`) — throttle через прапорець із `requestAnimationFrame`.
- Зміна `className`/`classList` замість купи окремих inline-стилів; `transform`/`opacity` замість властивостей, що впливають на layout (`left`/`top`/`width`/`height`/`margin`), коли можливо.
- Профілюй через Chrome DevTools Performance tab — шукай часті записи «Layout» і попередження про forced reflow в консолі.

Цей принцип — єдиний у серії, що стосується браузера, а не самого рушія V8, але логіка та сама: передбачувані, згруповані операції (batch) завжди дешевші за розкидані, чергування «читання-запис».
