# Canvas — малювання пікселів у браузері

> Перевірено запуском у Chrome (вбудований браузер, `devicePixelRatio = 2`). Рядки з позначкою «✔ перевірено» дали саме такий результат; решта — зі специфікації HTML Living Standard і MDN. Поведінка деяких речей (ліміт розміру, `alpha: false`, `beginLayer`) залежить від браузера й версії.

## 1. Що таке canvas

`<canvas>` — HTML-елемент, усередині якого є **растрове зображення** (прямокутна сітка пікселів RGBA). Сам елемент нічого не малює: малюють через **контекст** (`getContext`). Головні наслідки:

- **Immediate mode (безпосередній режим)**: ви даєте команду «намалюй коло» — і пікселі змінюються. Canvas **не пам'ятає** фігур, лише результат. Щоб «посунути» коло, треба стерти й перемалювати.
- Це на відміну від **retained mode** — DOM і SVG, де кожна фігура є вузлом, який можна змінити, повісити подію, стилізувати CSS.
- Canvas добре підходить для: ігор, візуалізацій з тисячами елементів, обробки зображень, відео-ефектів, генеративної графіки. Погано: звичайний UI й текст (немає доступності, виділення, адаптивності «з коробки»).

```html
<canvas id="c" width="300" height="150">Запасний вміст, якщо canvas не підтримується</canvas>
<script>
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "tomato";
  ctx.fillRect(10, 10, 100, 50);
</script>
```

## 2. Розмір: атрибути проти CSS

Є **два розміри**:

1. **Розмір бітмапа** — атрибути `width` і `height` (властивості `canvas.width`, `canvas.height`). Це кількість пікселів. За замовчуванням **300 × 150** ✔ перевірено.
2. **Розмір на сторінці** — CSS `width`/`height`. Браузер **розтягує** бітмап під CSS-розмір.

```js
canvas.width = 200;  // бітмап 200 пікселів
canvas.style.width = "400px"; // але показується 400 CSS-пікселів → мильна картинка ×2
```

Типова помилка — задати розмір лише через CSS: бітмап лишається 300×150 і розтягується.

**Зміна `width`/`height` (навіть на те саме значення) очищає canvas і скидає стан контексту** ✔ перевірено:

```js
ctx.fillStyle = "#f00"; ctx.fillRect(0, 0, 10, 10);
canvas.width = 200;                // alpha пікселя став 0, fillStyle знову "#000000"
```

Це відомий трюк очищення, але краще `clearRect`, бо він не скидає стан.

**Ліміт розміру.** Браузери обмежують розмір і площу canvas (порядок: сторона до 32 767, площа 268 мільйонів пікселів у Chrome, у Safari/мобільних менше). Занадто великий canvas **мовчки не малює**: ✔ перевірено, canvas 20000×20000 після `fillRect` повернув alpha = 0, без винятку.

## 3. HiDPI (Retina)

На екрані з `devicePixelRatio = 2` один CSS-піксель = 4 фізичні. Без корекції картинка буде розмитою. Рецепт:

```js
function setupCanvas(canvas, cssWidth, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssWidth + "px";
  canvas.style.height = cssHeight + "px";
  canvas.width = Math.round(cssWidth * dpr);  // бітмап у фізичних пікселях
  canvas.height = Math.round(cssHeight * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);                        // далі малюємо в CSS-координатах
  return ctx;
}
```

✔ перевірено: після `scale(2, 2)` заливка `fillRect(0, 0, 100, 50)` покрила бітмап 200×100 повністю (піксель (199, 99) має alpha 255). `devicePixelRatio` змінюється при зумі та перенесенні вікна між екранами — слухайте `matchMedia("(resolution: 2dppx)")` або `ResizeObserver` з `devicePixelContentBoxSize`.

## 4. Контексти

`canvas.getContext(type, options)`:

| type | що це |
|---|---|
| `"2d"` | `CanvasRenderingContext2D` — основний, цей документ |
| `"webgl"`, `"webgl2"` | 3D на GPU (OpenGL ES 2.0 / 3.0) |
| `"webgpu"` | сучасне GPU API (`navigator.gpu`) |
| `"bitmaprenderer"` | лише показ готових `ImageBitmap` без малювання |

Правила:

- На одному canvas **один тип контексту**: після `getContext("2d")` виклик `getContext("webgl")` повертає `null` ✔ перевірено. Повторний `getContext("2d")` повертає **той самий** об'єкт ✔ перевірено.
- Опції 2d: `alpha` (прозорий фон; `false` — непрозорий чорний, швидше), `desynchronized` (менша затримка), `willReadFrequently` (часті `getImageData` → софтверний режим), `colorSpace: "srgb" | "display-p3"`.
- `ctx.getContextAttributes()` ✔ перевірено повернув `{alpha:true, colorSpace:"srgb", colorType:"unorm8", desynchronized:false, willReadFrequently:false, …}`.

## 5. Система координат

Початок (0, 0) — **лівий верхній** кут, `x` вправо, `y` **вниз** (як у DOM, не як у математиці). Одиниця — піксель бітмапа (з урахуванням поточної трансформації, розділ 12). Кути в радіанах, 0 — «на 3 годині», додатний напрямок — за годинниковою стрілкою (бо `y` вниз).

## 6. Прямокутники

Єдині фігури, які малюються без шляху:

```js
ctx.fillRect(x, y, w, h);     // залити
ctx.strokeRect(x, y, w, h);   // обвести
ctx.clearRect(x, y, w, h);    // зробити прозорими (rgba 0,0,0,0)
ctx.clearRect(0, 0, canvas.width, canvas.height); // очистити все (при scale — теж ок у межах бітмапа)
```

Від'ємні `w`/`h` малюють у протилежний бік.

## 7. Шляхи (paths)

Шлях — список підконтурів; спершу будуємо, потім `fill()` або `stroke()`.

```js
ctx.beginPath();            // новий шлях (скидає попередній!)
ctx.moveTo(50, 50);         // почати підконтур
ctx.lineTo(150, 50);
ctx.lineTo(100, 120);
ctx.closePath();            // замкнути лінією до початку
ctx.fill();                 // заливка (за fillRule)
ctx.stroke();               // обведення
```

Методи побудови:

| метод | що робить |
|---|---|
| `moveTo(x, y)` | нова точка без лінії |
| `lineTo(x, y)` | пряма |
| `rect(x, y, w, h)` | замкнений прямокутник у шляху |
| `roundRect(x, y, w, h, radii)` | прямокутник з округленими кутами; `radii` — число або масив до 4 значень ✔ є в Chrome |
| `arc(x, y, r, start, end, ccw?)` | дуга кола; `ccw = true` — проти годинникової |
| `arcTo(x1, y1, x2, y2, r)` | заокруглений кут між двома відрізками |
| `ellipse(x, y, rx, ry, rotation, start, end, ccw?)` | еліпс |
| `quadraticCurveTo(cx, cy, x, y)` | крива Без'є з однією контрольною точкою |
| `bezierCurveTo(c1x, c1y, c2x, c2y, x, y)` | кубічна крива Без'є |
| `closePath()` | замкнути підконтур |

Повне коло: `ctx.arc(x, y, r, 0, Math.PI * 2)`. ✔ перевірено: `isPointInPath` у центрі кола → `true`. Чверть кола з `lineTo` у центр дає сектор: точка всередині `(12,12)` → `true`, зовні `(8,8)` → `false`.

**Правило заливки (`fillRule`)**:

```js
ctx.rect(0, 0, 20, 20); ctx.rect(5, 5, 10, 10); // два вкладені квадрати
ctx.fill("nonzero");  // за замовчуванням: внутрішній залитий, якщо напрямки збігаються
ctx.fill("evenodd");  // «дірка» всередині
```

✔ перевірено на `Path2D`: центр внутрішнього квадрата — `nonzero: true`, `evenodd: false`.

**Забутий `beginPath()`** — найпоширеніша помилка: нові фігури додаються до старого шляху, і кожен `stroke()` перемальовує все попереднє (повільніше й з товстішими лініями через накладання). **Шлях не входить у `save()/restore()`** ✔ перевірено: після `save/restore` точка залишається в шляху.

### isPointInPath / isPointInStroke

```js
ctx.beginPath(); ctx.rect(10, 10, 50, 50);
ctx.isPointInPath(20, 20);  // true  ✔
ctx.isPointInPath(70, 20);  // false ✔
ctx.lineWidth = 10;
ctx.isPointInStroke(10, 30); // true — на межі (товщина враховується) ✔
```

Це основа hit-testing (розділ 19).

### Path2D

Об'єкт шляху, який можна зберегти й малювати повторно, а також створити з SVG-рядка:

```js
const p = new Path2D();
p.rect(0, 0, 10, 10);
p.addPath(new Path2D("M12 0 h5 v5 h-5 z"));  // SVG path data
ctx.fill(p);              // fill/stroke/clip приймають Path2D
ctx.isPointInPath(p, 5, 5); // true ✔; (14, 2) → true ✔; (11, 8) → false ✔
```

`Path2D` не залежить від контексту й трансформацій на момент створення — зручно для спрайтів і кешування геометрії.

## 8. Стилі ліній

```js
ctx.lineWidth = 8;            // товщина; 0, від'ємне, NaN, Infinity — ІГНОРУЮТЬСЯ ✔ (лишається 1)
ctx.lineCap = "butt" | "round" | "square";   // кінці
ctx.lineJoin = "miter" | "round" | "bevel";  // з'єднання
ctx.miterLimit = 10;          // межа "шпичаку" у miter
ctx.setLineDash([5, 3]);      // пунктир: 5 лінія, 3 пропуск
ctx.lineDashOffset = 2;       // зсув пунктиру (анімація "мурашок")
ctx.getLineDash();
```

Значення за замовчуванням ✔ перевірено: `lineWidth 1`, `lineCap "butt"`, `lineJoin "miter"`, `miterLimit 10`.

Непарний масив пунктиру дублюється: `[5, 3, 2]` → `[5, 3, 2, 5, 3, 2]` ✔. Масив з нечислом (`[5, 'x']`) **ігнорується**, залишається попередній ✔.

**Чіткість 1-піксельної лінії**: лінія завтовшки 1 по цілій координаті `y = 5` лягає на межу двох рядків пікселів і розмивається на два (alpha ≈ 128 + 128 ✔ перевірено). По `y = 5.5` — рівно один рядок пікселів (alpha 0 / 255 ✔). Для чітких ліній додавайте `0.5` до координат (при `lineWidth` непарному).

## 9. Кольори, градієнти, патерни

`fillStyle` і `strokeStyle` приймають: CSS-колір (рядок), `CanvasGradient`, `CanvasPattern`.

```js
ctx.fillStyle = "rgba(0, 0, 255, 0.5)";  // читається назад як "rgba(0, 0, 255, 0.5)" ✔
ctx.fillStyle = "red";                    // читається як "#ff0000" ✔ (нормалізується)
ctx.fillStyle = "nonsense";               // некоректне значення ІГНОРУЄТЬСЯ — лишається попереднє ✔
```

Значення за замовчуванням `"#000000"` ✔.

```js
const lin = ctx.createLinearGradient(x0, y0, x1, y1);     // лінійний
const rad = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1); // радіальний (два кола)
const con = ctx.createConicGradient(startAngle, x, y);    // конічний (кутовий)
lin.addColorStop(0, "red");     // позиція 0..1
lin.addColorStop(1, "blue");
ctx.fillStyle = lin;
```

Координати градієнта — **у системі координат canvas, а не фігури**: якщо градієнт від 0 до 100 по x, а фігура на x = 300, то заливка буде кольором останнього стопу. Зсувайте градієнт разом із фігурою (через `translate`).

Патерн (повторення зображення):

```js
const pat = ctx.createPattern(image, "repeat" | "repeat-x" | "repeat-y" | "no-repeat");
ctx.fillStyle = pat;   // pat — CanvasPattern ✔; плитка повторюється ✔
```

## 10. Текст

```js
ctx.font = "bold 20px serif";   // синтаксис CSS font; некоректний рядок ІГНОРУЄТЬСЯ ✔
ctx.textAlign = "left" | "right" | "center" | "start" | "end";   // за замовчуванням "start"
ctx.textBaseline = "alphabetic" | "top" | "hanging" | "middle" | "ideographic" | "bottom";
ctx.direction = "ltr" | "rtl" | "inherit";
ctx.fillText("Привіт", x, y, maxWidth?);    // maxWidth стискає текст по горизонталі
ctx.strokeText("Привіт", x, y);
```

Значення за замовчуванням ✔: `font "10px sans-serif"`, `textAlign "start"`, `textBaseline "alphabetic"`, `direction "ltr"`.

Некоректне значення (`textAlign = "middle"` — це baseline, не align) тихо ігнорується ✔: лишилось `"center"`.

**Вимірювання**:

```js
const m = ctx.measureText("Hello");
m.width;                        // ширина (60.2 при 20px monospace ✔)
m.actualBoundingBoxLeft/Right/Ascent/Descent;   // точна рамка чорнила
m.fontBoundingBoxAscent/Descent;                // за шрифтом, не залежить від тексту
```

✔ перевірено: ці поля є. Для багаторядкового тексту canvas **не робить перенесення** — треба різати рядки самостійно за `measureText`. Для моноширинного шрифту ширина лишається однаковою для `iiii` і `WWWW` ✔.

Нові (залежать від версії браузера) властивості: `letterSpacing`, `wordSpacing`, `fontKerning`, `fontStretch`, `fontVariantCaps`, `textRendering` — ✔ перевірено, що в Chrome є `letterSpacing`, `fontKerning = "auto"`, `textRendering = "auto"`.

**Шрифти ще не завантажені** — перший `fillText` намалює запасним шрифтом. Дочекайтесь:

```js
await document.fonts.load("20px MyFont");
// або await document.fonts.ready
```

## 11. Зображення

`drawImage` має три форми:

```js
ctx.drawImage(img, dx, dy);                       // як є
ctx.drawImage(img, dx, dy, dw, dh);               // з масштабуванням
ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh); // вирізати з джерела (спрайт-лист)
```

Джерелом може бути: `HTMLImageElement`, `HTMLVideoElement` (поточний кадр), `HTMLCanvasElement` (інший canvas ✔), `ImageBitmap`, `OffscreenCanvas`, `VideoFrame`, SVG-зображення.

✔ перевірено: `drawImage(src, 0, 0, 4, 4)` з `imageSmoothingEnabled = false` дає чіткі блоки (піксель-арт), форма з вирізанням `(1,0,1,1 → 0,0,2,2)` взяла саме зелений піксель.

Згладжування: `ctx.imageSmoothingEnabled` (за замовчуванням `true` ✔), `ctx.imageSmoothingQuality = "low" | "medium" | "high"` (за замовчуванням `"low"` ✔). Для піксель-арту вимикайте.

**Дочекайтесь завантаження**:

```js
const img = new Image();
img.src = "sprite.png";
await img.decode();            // або img.onload
ctx.drawImage(img, 0, 0);
```

`drawImage` з ще не завантаженим зображенням нічого не малює, помилки немає.

### Taint (заборона читання чужих пікселів)

Якщо намалювати зображення з **іншого походження без CORS**, canvas стає «забрудненим» (tainted): `getImageData`, `toDataURL`, `toBlob` кидають `SecurityError`. Рішення: `img.crossOrigin = "anonymous"` і сервер з заголовком `Access-Control-Allow-Origin`.

### createImageBitmap

```js
const bmp = await createImageBitmap(blobOrImgOrCanvas);   // ImageBitmap ✔
ctx.drawImage(bmp, 0, 0);
bmp.close();   // звільнити пам'ять
```

Декодує асинхронно, поза основним потоком, швидший для частого малювання; можна передавати у Worker.

## 12. Трансформації

Поточна матриця застосовується до **всього, що малюється далі** (не до вже намальованого).

```js
ctx.translate(x, y);
ctx.rotate(angle);          // радіани, навколо поточного початку координат
ctx.scale(sx, sy);
ctx.transform(a, b, c, d, e, f);     // помножити на матрицю
ctx.setTransform(a, b, c, d, e, f);  // замінити матрицю
ctx.setTransform(domMatrix);
ctx.resetTransform();                // = setTransform(1, 0, 0, 1, 0, 0)
ctx.getTransform();                  // DOMMatrix
```

✔ перевірено: `translate(10, 20)` потім `scale(2, 2)` → `{a:2, b:0, c:0, d:2, e:10, f:20}`.

**Порядок має значення.** Обертання навколо центру фігури:

```js
ctx.translate(cx, cy);        // 1. перенести початок у центр
ctx.rotate(angle);            // 2. обернути навколо нього
ctx.fillRect(-w / 2, -h / 2, w, h);  // 3. малювати відносно центру
```

Якщо спершу `rotate`, потім `translate` — зсув піде вздовж повернутих осей.

`putImageData` **ігнорує** трансформації ✔ перевірено (пікселі лягли на (0,0), попри `translate(2, 2)`).

## 13. Стан: save / restore / reset

`save()` кладе на стек **поточний стан малювання**, `restore()` знімає:

- трансформація, clip-область;
- `fillStyle`, `strokeStyle`, `globalAlpha`, `globalCompositeOperation`;
- `lineWidth`, `lineCap`, `lineJoin`, `miterLimit`, `lineDash`, `lineDashOffset`;
- `shadow*`, `filter`, `font`, `textAlign`, `textBaseline`, `direction`, `imageSmoothing*`.

**Не зберігається**: поточний шлях і растр (самі пікселі).

```js
ctx.fillStyle = "#00f";
ctx.save();
ctx.fillStyle = "#0f0";
ctx.restore();
ctx.fillStyle;   // "#0000ff" ✔
```

Зайвий `restore()` без `save()` — **нічого не робить, помилки немає** ✔. Забутий `restore()` — стек росте, стан «тече» у наступний кадр.

`ctx.reset()` (нове API) очищає бітмап **і** повністю скидає стан ✔ перевірено (`fillStyle` став `#000000`).

## 14. Обрізання (clip)

```js
ctx.beginPath();
ctx.rect(0, 0, 5, 5);
ctx.clip();                    // далі малювати можна лише всередині
ctx.fillRect(0, 0, 10, 10);    // вийде лише квадрат 5×5 ✔ (alpha 255 всередині, 0 зовні)
```

Clip **накопичується** (перетин) і знімається лише через `restore()`, тому загортайте в `save()`/`restore()`. Підтримує `fillRule` і `Path2D`: `ctx.clip(path, "evenodd")`.

## 15. Прозорість, режими змішування, фільтри, тіні

```js
ctx.globalAlpha = 0.5;               // 0..1; значення поза діапазоном ІГНОРУЮТЬСЯ ✔ (2 → лишилось 1)
ctx.globalCompositeOperation = "source-over";   // за замовчуванням ✔
```

`globalCompositeOperation` — як нова фігура («source») поєднується з уже намальованим («destination»):

- Porter–Duff: `source-over` (поверх), `source-in`, `source-out`, `source-atop`, `destination-over` (під існуюче), `destination-in`, `destination-out` (витирає ластиком), `destination-atop`, `lighter` (додавання кольорів, ефект світіння), `copy`, `xor`.
- Блендинг: `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`.

✔ перевірено: `destination-over` намалював синє **під** червоним (піксель лишився червоним); `source-in` із зеленим дав зелений тільки там, де вже щось було. Невідоме значення (`"nope"`) ігнорується ✔.

**Тіні**:

```js
ctx.shadowColor = "rgba(0,0,0,.5)";
ctx.shadowBlur = 10;           // розмиття (не залежить від трансформації)
ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;
```

Тінь малюється, лише якщо `shadowColor` непрозорий і є `blur` або зсув ✔ (зсув 5 px перемістив тінь).

**Фільтри** (CSS-функції): `ctx.filter = "blur(4px) grayscale(1) brightness(1.2)"`. ✔ перевірено: `grayscale(1)` для `#f00` дав `54,54,54`. Фільтри повільні на великих областях; не підтримуються в Safari (до недавнього часу) — перевіряйте.

## 16. Піксельний доступ: ImageData

```js
const img = ctx.getImageData(sx, sy, sw, sh);   // ImageData
img.width; img.height;
img.data;        // Uint8ClampedArray [r,g,b,a, r,g,b,a, …], довжина = w*h*4
ctx.putImageData(img, dx, dy);                  // ✔ повертає пікселі як є
ctx.putImageData(img, dx, dy, dirtyX, dirtyY, dirtyW, dirtyH);
const blank = ctx.createImageData(w, h);        // нулі (прозорий чорний)
```

Індекс піксела: `i = (y * width + x) * 4`. ✔ перевірено: `new ImageData(2, 1)` має `data.length = 8` і тип `Uint8ClampedArray`.

Особливості:

- `Uint8ClampedArray` обмежує значення до 0–255 (260 → 255, −5 → 0).
- `getImageData` **за межами** canvas дає `0,0,0,0` ✔; ширина або висота 0 → `IndexSizeError` ✔.
- Піксельна математика в canvas використовує **premultiplied alpha**, тому після `putImageData` з малою альфою колір **втрачає точність** ✔ перевірено: записали `[100,150,200,1]`, прочитали `[0,255,255,1]`.
- Напівпрозорий червоний `rgba(255,0,0,0.5)` читається як `[255,0,0,128]` ✔.
- `getImageData` дорогий (копія з GPU). Для частого читання — `getContext("2d", { willReadFrequently: true })`.
- Дані підпорядковані координатам **бітмапа**, не CSS (на Retina `getImageData(x, y)` з CSS-координат потрібно множити на `dpr`).

Приклад: інверсія кольорів.

```js
const im = ctx.getImageData(0, 0, canvas.width, canvas.height);
const d = im.data;
for (let i = 0; i < d.length; i += 4) {
  d[i] = 255 - d[i];       // R
  d[i + 1] = 255 - d[i + 1]; // G
  d[i + 2] = 255 - d[i + 2]; // B
}                           // альфа d[i + 3] не чіпаємо
ctx.putImageData(im, 0, 0);
```

## 17. Експорт

```js
canvas.toDataURL();                       // "data:image/png;base64,iVBORw0K…" ✔
canvas.toDataURL("image/jpeg", 0.5);      // "data:image/jpeg;base64,/9…" ✔; якість 0..1
canvas.toBlob((blob) => { /* … */ }, "image/webp", 0.8);   // асинхронно, ефективніше ✔ (image/webp)
const stream = canvas.captureStream(30);  // MediaStream 30 к/с → MediaRecorder (запис відео)
```

Формат, який браузер не вміє, замінюється на PNG. JPEG не має прозорості (фон стає чорним). Для скачування:

```js
canvas.toBlob((blob) => {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob), download: "image.png",
  });
  a.click();
  URL.revokeObjectURL(a.href);
});
```

## 18. Анімація

```js
let last = 0;
function frame(time) {                    // time — DOMHighResTimeStamp, мс
  const dt = (time - last) / 1000;        // секунди між кадрами
  last = time;
  update(dt);                             // логіка залежить від dt, не від частоти кадрів
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- `requestAnimationFrame` викликається перед кожним перемальовуванням (зазвичай 60 разів/с, на 120 Гц екранах — 120) і ставиться на паузу у фонових вкладках. ✔ перевірено: колбек отримує число.
- Не користуйтесь `setInterval` для анімації: не синхронізований з екраном.
- Швидкість рухів множте на `dt`, інакше гра на 144 Гц буде вдвічі швидшою за 72 Гц.
- Для детермінованої фізики — фіксований крок (accumulator).
- Анімація «слід»: замість `clearRect` малюйте прозорий прямокутник `rgba(0,0,0,0.1)`.
- Зупинка: збережіть `id = requestAnimationFrame(...)` і викличте `cancelAnimationFrame(id)`.

## 19. Взаємодія

Canvas — один елемент, подій для фігур немає. Робіть hit-testing самі.

```js
function pos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),   // CSS → піксель бітмапа
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}
canvas.addEventListener("pointerdown", (e) => {
  const { x, y } = pos(e);
  for (const shape of shapes.slice().reverse()) {       // верхні першими
    if (ctx.isPointInPath(shape.path, x, y)) { select(shape); break; }
  }
});
```

Варіанти hit-testing: геометрія (коло — відстань, прямокутник — порівняння), `isPointInPath/isPointInStroke`, або кольоровий буфер (малюємо фігури унікальними кольорами у прихований canvas і читаємо піксель під курсором).

Використовуйте `pointer*` події (миша, дотик, перо), `touch-action: none` у CSS для жестів, `setPointerCapture` для перетягування.

**Доступність**: вміст canvas невидимий скрінрідерам. Додайте `aria-label`/`role="img"`, вкладений запасний вміст (`<canvas>…</canvas>`), паралельний DOM для інтерактивних елементів, `ctx.drawFocusIfNeeded(element)`.

## 20. OffscreenCanvas і Web Workers

`OffscreenCanvas` — canvas без елемента DOM; працює і в основному потоці, і у Worker.

```js
// Основний потік:
const off = canvas.transferControlToOffscreen();   // передати керування
worker.postMessage({ canvas: off }, [off]);

// worker.js:
onmessage = ({ data }) => {
  const ctx = data.canvas.getContext("2d");
  (function loop() { draw(ctx); requestAnimationFrame(loop); })();
};
```

✔ перевірено: `OffscreenCanvas` існує, `convertToBlob()` дав `image/png`, `transferToImageBitmap()` дав ширину 5.

Застосування: важкий рендер не блокує UI; пререндер спрайтів/фону в окремий буфер (`new OffscreenCanvas(w, h)` або звичайний `document.createElement("canvas")`) і потім швидкий `drawImage` у кожному кадрі.

## 21. Продуктивність

1. **Кешуйте статичне**: складний фон/спрайт намалюйте раз у прихований canvas, у кадрі робіть лише `drawImage`.
2. **Мінімум змін стану**: групуйте малювання за `fillStyle`/`font`; кожна зміна коштує.
3. **Один шлях на багато фігур**: один `beginPath()`, багато `rect/arc`, один `fill()` — швидше, ніж `fill` на кожну.
4. **Цілі координати** (`Math.round`) для спрайтів — менше згладжування й швидше. Дробові координати розмивають зображення.
5. **Перемальовуйте лише змінене** (dirty rectangles), якщо сцена переважно статична; або кілька canvas-шарів, складених CSS (фон, об'єкти, інтерфейс).
6. **Не робіть `getImageData` на кожен кадр**; `willReadFrequently: true`, якщо без цього не обійтись.
7. **Не створюйте об'єктів у циклі кадру** (GC-паузи): переюзайте масиви, `Path2D`, градієнти ([../performance/05-gc-patterns.md](../performance/05-gc-patterns.md)).
8. Тіні, `filter: blur`, великі градієнти й `globalCompositeOperation` — дорогі; тримайте їх на малих областях.
9. Менший бітмап — швидше: на 4K-екранах іноді варто навмисно знижувати внутрішню роздільність.
10. Для тисяч спрайтів або 3D — переходьте на WebGL/WebGPU (PixiJS, Three.js).

## 22. WebGL, WebGPU та бібліотеки

- **WebGL / WebGL2**: `canvas.getContext("webgl2")`; малювання через шейдери на GPU. ✔ перевірено: обидва контексти доступні, `navigator.gpu` існує. Прямий WebGL громіздкий — користуються бібліотеками.
- **WebGPU**: `const adapter = await navigator.gpu.requestAdapter(); const device = await adapter.requestDevice(); canvas.getContext("webgpu").configure({ device, format: navigator.gpu.getPreferredCanvasFormat() })`; сучасний API з compute-шейдерами.
- **Бібліотеки над 2D**: Konva, Fabric.js (об'єктна модель і події), p5.js (креативне кодування), Chart.js, ECharts (діаграми), Paper.js (векторна графіка), Rough.js (ескізний стиль).
- **Бібліотеки над WebGL/WebGPU**: PixiJS (швидкий 2D), Three.js, Babylon.js (3D), regl.
- **Motion Canvas** (цей проєкт) малює сцени на 2D canvas і рендерить їх у відео.

## 23. Canvas поза браузером

У Node.js немає DOM, але є реалізації того ж API: `@napi-rs/canvas`, `skia-canvas`, `canvas` (node-canvas). Використовуються для генерації зображень на сервері (графіки, OG-картинки), тестів візуалізацій. API те саме: `createCanvas(w, h).getContext("2d")`, `canvas.toBuffer("image/png")`.

## 24. Нові та експериментальні можливості

- `ctx.roundRect`, `ctx.reset`, `createConicGradient` — ✔ є в Chrome (`typeof … === "function"`).
- `ctx.letterSpacing`, `fontKerning`, `textRendering` — ✔ є.
- `ctx.beginLayer()/endLayer()` — складання «шару» з одним застосуванням alpha/filter; ✔ у цьому Chrome `typeof ctx.beginLayer` = `"undefined"` (ще не стабільно).
- `colorSpace: "display-p3"` — ширший колірний діапазон.
- `ctx.getContextAttributes()`.
- `canvas.getContext("2d", { alpha: false })` — непрозорий canvas (швидше, чорний фон). У цьому Chrome (вбудований браузер) `getImageData` повернув `0,0,0,0` для нового canvas із `alpha: false` — не покладайтеся на значення «порожніх» пікселів, заповнюйте фон явно.
- Пропозиція `HTML-in-Canvas` / formatted text — поки лише чернетки.

## 25. Типові помилки

- Розмір через CSS без `width`/`height` → розмита картинка.
- Забули HiDPI → розмито на Retina.
- Змінили `canvas.width` для очищення і втратили стан (стиль, трансформацію).
- Не викликали `beginPath()` → фігури накопичуються, повільно і з артефактами.
- Не повернули `restore()` → стан «тече».
- Малюємо картинку до завантаження → порожньо.
- Чужа картинка без CORS → `SecurityError` у `getImageData`/`toBlob`.
- Градієнт у глобальних координатах, фігура поза ним → один колір.
- Лінія 1 px по цілій координаті розмита (треба `+0.5`).
- Анімація через `setInterval`, швидкість без `dt`.
- Дуже великий canvas → мовчки порожній.
- Очікуємо події на фігурах (їх нема): потрібен hit-testing.
- Шрифт ще не завантажений → запасний шрифт.
- Припускаємо, що `putImageData` повертає ті самі байти при малій альфі (premultiplied).

## 26. Повний довідник API CanvasRenderingContext2D

Список складено програмно з прототипу `CanvasRenderingContext2D` у Chrome (✔ перевірено): усі методи й властивості нижче існують; значення за замовчуванням зчитано з нового контексту. Скорочення: «поточний» — у системі координат з урахуванням трансформації.

### 26.1. Прямокутники

| метод | параметри | примітка |
|---|---|---|
| `fillRect` | `x, y, w, h` | залити; `w`/`h` < 0 — у протилежний бік |
| `strokeRect` | `x, y, w, h` | обвести (лінія по центру межі) |
| `clearRect` | `x, y, w, h` | зробити прозорим `rgba(0,0,0,0)` |

### 26.2. Шлях

| метод | параметри | примітка |
|---|---|---|
| `beginPath` | — | новий шлях; старий забувається |
| `closePath` | — | пряма до початку підконтуру |
| `moveTo` | `x, y` | новий підконтур |
| `lineTo` | `x, y` | пряма |
| `rect` | `x, y, w, h` | замкнений прямокутник |
| `roundRect` | `x, y, w, h, radii` | `radii`: число / [1–4] / `{x, y}` / DOMPoint |
| `arc` | `x, y, r, startAngle, endAngle, counterclockwise = false` | ✔ `r < 0` → `IndexSizeError` |
| `arcTo` | `x1, y1, x2, y2, r` | кут у (x1, y1) заокруглюється радіусом `r` |
| `ellipse` | `x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise = false` | |
| `quadraticCurveTo` | `cpx, cpy, x, y` | одна контрольна точка |
| `bezierCurveTo` | `cp1x, cp1y, cp2x, cp2y, x, y` | дві контрольні точки |
| `fill` | `[path], [fillRule]` | `"nonzero"` (за замовч.) або `"evenodd"` |
| `stroke` | `[path]` | |
| `clip` | `[path], [fillRule]` | область малювання; знімається `restore()` |
| `isPointInPath` | `[path], x, y, [fillRule]` | `x, y` — пікселі canvas, трансформація НЕ застосовується до точки |
| `isPointInStroke` | `[path], x, y` | враховує `lineWidth`, `lineCap`, `lineJoin` |

Перевірено: при `scale(2, 2)` `isPointInPath(15, 15)` для `rect(10,10,20,20)` дає `false`, а `isPointInPath(30, 30)` — `true`: точка задається у фізичних пікселях бітмапа, фігура — у координатах після трансформації. Пам'ятайте про це при HiDPI.

### 26.3. Стилі заливки й ліній

| властивість | значення | за замовчуванням |
|---|---|---|
| `fillStyle` | колір / `CanvasGradient` / `CanvasPattern` | `"#000000"` |
| `strokeStyle` | те саме | `"#000000"` |
| `lineWidth` | число > 0 | `1` |
| `lineCap` | `"butt"`, `"round"`, `"square"` | `"butt"` |
| `lineJoin` | `"miter"`, `"round"`, `"bevel"` | `"miter"` |
| `miterLimit` | число > 0 | `10` |
| `lineDashOffset` | число | `0` |

| метод | параметри |
|---|---|
| `setLineDash` | `segments: number[]` (непарний масив дублюється; нечислові/від'ємні — ігноруються) |
| `getLineDash` | — → `number[]` |
| `createLinearGradient` | `x0, y0, x1, y1` |
| `createRadialGradient` | `x0, y0, r0, x1, y1, r1` |
| `createConicGradient` | `startAngle, x, y` |
| `createPattern` | `image, repetition` (`"repeat"`, `"repeat-x"`, `"repeat-y"`, `"no-repeat"`) → `CanvasPattern` (✔ canvas нульового розміру як джерело → `InvalidStateError`) |

`CanvasGradient.addColorStop(offset, color)` — `offset` 0…1, інакше ✔ `IndexSizeError`; `CanvasPattern.setTransform(matrix)`.

### 26.4. Текст

| властивість | значення | за замовчуванням |
|---|---|---|
| `font` | CSS font | `"10px sans-serif"` |
| `textAlign` | `"start"`, `"end"`, `"left"`, `"right"`, `"center"` | `"start"` |
| `textBaseline` | `"alphabetic"`, `"top"`, `"hanging"`, `"middle"`, `"ideographic"`, `"bottom"` | `"alphabetic"` |
| `direction` | `"ltr"`, `"rtl"`, `"inherit"` | `"ltr"` |
| `letterSpacing` | CSS length | `"0px"` |
| `wordSpacing` | CSS length | `"0px"` |
| `fontKerning` | `"auto"`, `"normal"`, `"none"` | `"auto"` |
| `fontStretch` | `"normal"`, `"condensed"`, `"expanded"`, … | `"normal"` |
| `fontVariantCaps` | `"normal"`, `"small-caps"`, `"all-small-caps"`, … | `"normal"` |
| `textRendering` | `"auto"`, `"optimizeSpeed"`, `"optimizeLegibility"`, `"geometricPrecision"` | `"auto"` |
| `lang` | BCP 47 | `"inherit"` |

| метод | параметри |
|---|---|
| `fillText` | `text, x, y, [maxWidth]` |
| `strokeText` | `text, x, y, [maxWidth]` |
| `measureText` | `text` → `TextMetrics` |

`TextMetrics`: `width`, `actualBoundingBoxLeft`, `actualBoundingBoxRight`, `actualBoundingBoxAscent`, `actualBoundingBoxDescent`, `fontBoundingBoxAscent`, `fontBoundingBoxDescent`, `hangingBaseline`, `alphabeticBaseline`, `ideographicBaseline` (✔ усі є в цьому Chrome; `emHeightAscent/Descent` — у цьому Chrome відсутні).

### 26.5. Зображення

| метод | параметри |
|---|---|
| `drawImage` | `(image, dx, dy)`, `(image, dx, dy, dw, dh)`, `(image, sx, sy, sw, sh, dx, dy, dw, dh)` |
| `createImageData` | `(w, h, [settings])` або `(imageData)` |
| `getImageData` | `sx, sy, sw, sh, [settings]` → `ImageData` |
| `putImageData` | `imageData, dx, dy, [dirtyX, dirtyY, dirtyWidth, dirtyHeight]` |
| `imageSmoothingEnabled` | `true` за замовч.; `imageSmoothingQuality`: `"low"` (за замовч.), `"medium"`, `"high"` |

`ImageData`: `width`, `height`, `data`, `colorSpace`, `pixelFormat` (✔ є в Chrome: `"rgba-unorm8"` за замовчуванням). `new ImageData(w, h)` або `new ImageData(data, w, [h])`.

### 26.6. Трансформації

| метод | параметри |
|---|---|
| `translate` | `x, y` |
| `rotate` | `angle` (радіани, за годинниковою) |
| `scale` | `x, y` |
| `transform` | `a, b, c, d, e, f` — помножити |
| `setTransform` | `a, b, c, d, e, f` або `DOMMatrix` — замінити |
| `resetTransform` | — |
| `getTransform` | — → `DOMMatrix` |

Матриця: `x′ = a·x + c·y + e`, `y′ = b·x + d·y + f`.

### 26.6.1. Стан контексту

| метод | що робить |
|---|---|
| `save()` | покласти стан у стек |
| `restore()` | зняти зі стеку (порожній стек — нічого не робить) |
| `reset()` | очистити canvas і скинути стан і стек |
| `isContextLost()` | чи втрачено контекст |
| `getContextAttributes()` | фактичні опції контексту |
| `canvas` | (властивість) елемент-власник |

### 26.7. Змішування, тіні, фільтри

| властивість | значення | за замовчуванням |
|---|---|---|
| `globalAlpha` | 0…1 | `1` |
| `globalCompositeOperation` | `source-over`, `source-in`, `source-out`, `source-atop`, `destination-over`, `destination-in`, `destination-out`, `destination-atop`, `lighter`, `copy`, `xor`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity` | `"source-over"` |
| `shadowColor` | колір | `"rgba(0, 0, 0, 0)"` |
| `shadowBlur` | ≥ 0 | `0` |
| `shadowOffsetX`, `shadowOffsetY` | число | `0` |
| `filter` | CSS filter list | `"none"` |

### 26.8. Інше

- `drawFocusIfNeeded(element)` або `(path, element)` — кільце фокуса для елемента, що в фокусі.
- `ctx.beginLayer()` / `ctx.endLayer()` — не реалізовано в цьому Chrome (`typeof` → `undefined`).

## 27. Довідник суміжних об'єктів

**`HTMLCanvasElement`** (властивості прототипу, ✔): `width`, `height`, `getContext(type, options)`, `toDataURL(type, quality)`, `toBlob(callback, type, quality)`, `captureStream(frameRate)`, `transferControlToOffscreen()`. Події: `contextlost`, `contextrestored` (для відновлення ресурсів після скидання GPU).

**`OffscreenCanvas`** (✔): `width`, `height`, `getContext(type, options)`, `convertToBlob({ type, quality })` → `Promise<Blob>`, `transferToImageBitmap()`, події `contextlost` / `contextrestored`. Не має `toDataURL`.

**`Path2D`** (✔): конструктор `new Path2D([pathOrSvgString])`; методи `addPath(path, [matrix])`, `moveTo`, `lineTo`, `rect`, `roundRect`, `arc`, `arcTo`, `ellipse`, `quadraticCurveTo`, `bezierCurveTo`, `closePath`.

**`CanvasGradient`**: `addColorStop(offset, color)`. **`CanvasPattern`**: `setTransform(matrix)`.

**`ImageBitmap`**: `width`, `height`, `close()`; створюється `createImageBitmap(source, [sx, sy, sw, sh], [options])`.

**`DOMMatrix`**: `a…f`, `translate`, `rotate`, `scale`, `multiply`, `inverse`, `transformPoint`.

## 28. Скільки коду видно у відео

Відео `canvas/cv-01-canvas` виконує код кожного кадру на справжньому canvas (760 × 460) і показує результат поруч із кодом: те, що на екрані — це не малюнок, а реальний вивід `CanvasRenderingContext2D`. Усі фрагменти виконано в Chrome без помилок, а картинки переглянуто.

## Підсумок

- Canvas — растр + контекст; режим безпосереднього малювання, фігури не зберігаються.
- Розмір бітмапа (`width`/`height`) ≠ CSS-розмір; за замовчуванням 300×150; зміна розміру очищає й скидає стан.
- HiDPI: бітмап × `devicePixelRatio`, потім `ctx.scale(dpr, dpr)`.
- Один canvas — один тип контексту (`2d`, `webgl`, `webgl2`, `webgpu`, `bitmaprenderer`).
- Фігури: `fillRect/strokeRect/clearRect` і шляхи (`beginPath … fill/stroke`, `arc`, `arcTo`, `bezier`, `roundRect`, `Path2D`).
- Стилі: `fillStyle/strokeStyle` (колір, градієнт, патерн), `lineWidth/Cap/Join/Dash`, тіні, `filter`, `globalAlpha`, `globalCompositeOperation`.
- Текст: `font`, `textAlign`, `textBaseline`, `fillText`, `measureText`; перенесення рядків — вручну.
- Зображення: `drawImage` (3 форми), `createImageBitmap`, `imageSmoothingEnabled`, taint/CORS.
- Піксели: `getImageData/putImageData`, `Uint8ClampedArray` RGBA, premultiplied alpha.
- Трансформації: `translate/rotate/scale/transform/setTransform`; порядок важливий; `save/restore` зберігають стан, але не шлях; `reset()` скидає все.
- Експорт: `toDataURL`, `toBlob`, `captureStream`.
- Анімація: `requestAnimationFrame` + `dt` + `clearRect`.
- Інтерактив: власний hit-testing (`isPointInPath`, геометрія, кольоровий буфер), `pointer*` події, доступність окремо.
- Продуктивність: кеш у `OffscreenCanvas`, мінімум змін стану, один шлях на багато фігур, цілі координати, `willReadFrequently`.
- Для 3D й масових спрайтів — WebGL/WebGPU та бібліотеки (PixiJS, Three.js).
