# C++: `std` — простір імен і стандартна бібліотека

## 0. Що таке `std`

`std` — **простір імен** (namespace), у якому живе вся **стандартна бібліотека C++**: контейнери, рядки, алгоритми, введення/виведення, розумні вказівники, потоки тощо. Бібліотека — частина того самого стандарту ISO/IEC 14882, що й сама мова ([cpp.md](cpp.md)): кожен сумісний компілятор зобов'язаний її надати.

Стандарт описує лише **інтерфейс і гарантії** (що робить функція, яка складність, що інвалідує ітератори). Код пишуть окремі реалізації:

| Реалізація | Де використовується |
|---|---|
| **libstdc++** | GCC, більшість Linux-дистрибутивів |
| **libc++** | Clang/LLVM, macOS, Android |
| **MSVC STL** | Visual Studio, Windows |

Тому деталі, яких стандарт не фіксує (коефіцієнт зростання `vector`, розмір `std::string`, порядок обходу `unordered_map`), у різних реалізаціях різні.

Приклади цієї нотатки скомпільовані Apple clang 21 з libc++ у режимі `-std=c++23`. Короткі фрагменти без `main` — це тіло функції `main()` з потрібними `#include`.

## 1. Простір імен `std`

### 1.1. Навіщо простори імен

Простір імен відокремлює імена бібліотеки від імен твоєї програми. Функція `std::sort` і твоя власна `sort` не конфліктують, бо мають різні повні імена. Оператор `::` — оператор області видимості (scope resolution):

```cpp
#include <algorithm>
#include <print>
#include <vector>

namespace geometry {
int sort(int a) { return a * 2; } // власна функція з тим самим ім'ям — жодного конфлікту
}

int main() {
    std::vector<int> v{3, 1, 2};
    std::sort(v.begin(), v.end()); // стандартна
    std::println("{} {}", v, geometry::sort(21)); // [1, 2, 3] 42
}
```

`std::println` і форматування контейнера (`{}` для `vector`) — це C++23 (розділ 3).

### 1.2. `using namespace std;` — чому його уникають

`using namespace std;` робить **усі** імена з `std` (їх тисячі) видимими без префікса. У маленькій навчальній програмі це зручно, але в реальному коді веде до конфліктів імен:

```cpp
#include <algorithm>
using namespace std;

int count = 0; // власна глобальна змінна

int main() {
    // count++; // ❌ reference to 'count' is ambiguous — std::count теж став видимим
    ::count++; // явно: глобальна count
}
```

Небезпечніше, коли конфлікт **не** дає помилки, а тихо обирає іншу функцію: новий стандарт додає нове ім'я до `std`, і код, що компілювався роками, починає викликати не те. Особливо шкідливо писати `using namespace std;` у **заголовному файлі** — він «протікає» в кожен файл, що цей заголовок підключає.

Прийнятні альтернативи:

```cpp
#include <iostream>
#include <string>

using std::cout; // using-оголошення: лише одне конкретне ім'я
using std::string;

int main() {
    string name = "Ada";
    cout << "Hello, " << name << '\n'; // Hello, Ada
    {
        using namespace std; // using-директива в обмеженому блоці — діє лише тут
        cout << to_string(42) << '\n'; // 42
    }
}
```

### 1.3. Вкладені простори імен

Частина бібліотеки лежить у вкладених просторах: `std::chrono` (час), `std::ranges` і `std::views` (діапазони), `std::filesystem` (файлова система), `std::this_thread`, `std::literals` (суфікси літералів). Для суфіксів `using namespace` — нормальна практика, бо він підключає лише їх:

```cpp
using namespace std::literals; // "text"s, 10ms, "text"sv
auto s = "hello"s; // std::string, а не const char*
auto sv = "world"sv; // std::string_view
auto delay = 250ms; // std::chrono::milliseconds
std::println("{} {} {}", s.size(), sv.size(), delay); // 5 5 250ms
```

### 1.4. У `std` не можна додавати свої імена

Оголошувати власні функції чи класи всередині `namespace std` — **невизначена поведінка** (undefined behavior). Єдиний дозволений випадок — спеціалізації певних шаблонів для власних типів, наприклад `std::hash` (щоб тип можна було класти в `unordered_map`, розділ 5.4) чи `std::formatter` (розділ 3.2).

## 2. Заголовки

Кожна частина бібліотеки підключається своїм заголовком — без розширення `.h`:

| Заголовок | Що дає |
|---|---|
| `<iostream>`, `<fstream>`, `<sstream>` | потоки введення/виведення |
| `<format>`, `<print>` | форматування (C++20), `std::print`/`println` (C++23) |
| `<string>`, `<string_view>` | рядки |
| `<vector>`, `<array>`, `<map>`, `<unordered_map>`, … | контейнери — кожен у своєму заголовку |
| `<algorithm>`, `<numeric>`, `<ranges>` | алгоритми й діапазони |
| `<memory>` | розумні вказівники |
| `<optional>`, `<variant>`, `<expected>`, `<tuple>`, `<utility>` | «словникові» типи |
| `<chrono>`, `<thread>`, `<mutex>`, `<atomic>`, `<future>` | час і багатопотоковість |

Бібліотека C теж доступна — у двох формах: `<cstdio>`, `<cmath>`, `<cstring>` (імена в `std::`, рекомендовано для C++) і `<stdio.h>`, `<math.h>` (імена в глобальному просторі, для сумісності з [[c]]).

Правило: підключай заголовок для **кожного** використаного компонента. Якщо `<string>` випадково «приїхав» через `<iostream>` у твоїй реалізації, код може не скомпілюватися з іншою бібліотекою.

C++23 додав модуль `import std;`, що замінює всі ці `#include` одним рядком і компілюється швидше. Підтримка в компіляторах і системах збирання поки що неповна, тож у більшості проєктів досі `#include`.

## 3. Введення й виведення

### 3.1. iostream — класичний спосіб

`std::cout` — потік виведення, `std::cin` — введення, `std::cerr` — помилки. Оператор `<<` «вставляє» значення в потік, і його можна ланцюжити:

```cpp
#include <iomanip>
#include <iostream>

int main() {
    int apples = 3;
    double price = 12.5;
    std::cout << "apples: " << apples << ", price: " << price << '\n'; // apples: 3, price: 12.5
    std::cout << std::fixed << std::setprecision(2) << price << '\n'; // 12.50
    std::cout << price << '\n'; // 12.50 — маніпулятор «прилип» до потоку назавжди
}
```

Пастка: маніпулятори (`std::fixed`, `std::hex`, `std::setprecision`) змінюють **стан потоку** і діють на всі наступні виведення, а не лише на наступне значення. `std::endl` = `'\n'` + примусовий `flush` — у циклах це помітно повільніше, тому для переходу на новий рядок достатньо `'\n'`.

### 3.2. `std::format` і `std::println` — сучасний спосіб (C++20/23)

Форматування за шаблоном у стилі Python: типобезпечне (помилку в шаблоні знаходить компілятор), без стану, що «прилипає»:

```cpp
double price = 12.5;
std::string text = std::format("{:.2f} UAH", price); // C++20: повертає std::string
std::println("{}", text); // 12.50 UAH
std::println("[{:>6}] [{:<6}] [{:^6}]", 42, 42, 42); // [    42] [42    ] [  42  ]
std::println("{:#x} {:#b} {:08.3f}", 255, 5, 3.14159); // 0xff 0b101 0003.142
std::println("{1} before {0}", "second", "first"); // first before second
```

Щоб форматувати власний тип, спеціалізують `std::formatter` (найпростіше — успадкувати готовий форматер і перевизначити `format`):

```cpp
#include <format>
#include <print>

struct Point {
    int x, y;
};

template <>
struct std::formatter<Point> : std::formatter<std::string> {
    auto format(const Point& p, std::format_context& ctx) const {
        return std::formatter<std::string>::format(std::format("({}, {})", p.x, p.y), ctx);
    }
};

int main() {
    std::println("point = {}", Point{3, 4}); // point = (3, 4)
}
```

## 4. Рядки

### 4.1. `std::string`

`std::string` — рядок, що **володіє** своєю пам'яттю: сам її виділяє, розширює й звільняє (RAII — [cpp.md](cpp.md), розділ 4). На відміну від C-рядка (`char*`), знає свою довжину і копіюється за значенням:

```cpp
std::string greeting = "Hello";
greeting += ", world";
std::string copy = greeting; // повна копія, а не спільний вказівник
copy[0] = 'J';
std::println("{} | {}", greeting, copy); // Hello, world | Jello, world
std::println("{} {}", greeting.size(), greeting.find("world")); // 12 7
std::println("{}", greeting.substr(0, 5)); // Hello
std::println("{}", greeting.find("xyz") == std::string::npos); // true — npos означає «не знайдено»
std::println("{} {}", greeting.starts_with("Hell"), greeting.contains("lo, w")); // true true
```

`starts_with`/`ends_with` — C++20, `contains` — C++23.

Перетворення між рядками й числами:

```cpp
std::string s = std::to_string(42) + "!";
int n = std::stoi("123");
double d = std::stod("2.5");
std::println("{} {} {}", s, n + 1, d * 2); // 42! 124 5
try {
    std::println("{}", std::stoi("abc")); // не надрукується — stoi кине виняток
} catch (const std::invalid_argument&) {
    std::println("stoi failed: invalid_argument"); // stoi failed: invalid_argument
}
```

Для швидкого розбору без винятків і без виділення пам'яті є `std::from_chars` (`<charconv>`).

### 4.2. `std::string_view` — «вікно» в чужий рядок (C++17)

`string_view` — це лише вказівник + довжина: він **не володіє** даними і нічого не копіює. Ідеальний тип параметра для функцій, які лише читають рядок: приймає і `std::string`, і літерал без створення копії.

```cpp
#include <print>
#include <string>
#include <string_view>

std::size_t countVowels(std::string_view text) { // жодних копій для будь-якого рядка
    std::size_t n = 0;
    for (char c : text) {
        n += std::string_view("aeiou").contains(c);
    }
    return n;
}

int main() {
    std::string owned = "programming";
    std::println("{} {}", countVowels(owned), countVowels("literal text")); // 3 4
    std::string_view word = std::string_view(owned).substr(0, 7); // substr без копії
    std::println("{}", word); // program
}
```

Головна пастка: `string_view` не продовжує життя рядка. Якщо рядок знищено, view «висить» (dangling) — читання з нього є невизначеною поведінкою:

```cpp norun
std::string_view dangling() {
    std::string local = "temporary";
    return local; // ⚠️ компілюється, але local знищиться при виході — view вказує в нікуди
}
```

У такому простому випадку clang попереджає: `warning: address of stack memory associated with local variable 'local' returned` (`-Wreturn-stack-address`). У складніших — мовчить, тож на компілятор не покладайся.

Правило: `string_view` — для **параметрів**; зберігати в полях класу чи повертати з функції — лише якщо точно знаєш, хто володіє даними.

## 5. Контейнери

Контейнер — клас, що зберігає колекцію елементів і керує їхньою пам'яттю. Усі контейнери — шаблони: тип елемента вказують у кутових дужках (`std::vector<int>`).

### 5.1. `std::vector` — контейнер за замовчуванням

Динамічний масив: елементи лежать **поспіль** у пам'яті, доступ за індексом — O(1), додавання в кінець — амортизоване O(1). Через кеш-дружність він найчастіше виявляється найшвидшим на практиці навіть там, де теоретично кращий інший контейнер.

```cpp
std::vector<int> v{5, 3, 8};
v.push_back(1); // додати в кінець
v.insert(v.begin(), 0); // вставка на початок — O(n): зсуває всі елементи
std::println("{} size={} front={} back={}", v, v.size(), v.front(), v.back()); // [0, 5, 3, 8, 1] size=5 front=0 back=1
v.pop_back();
v.erase(v.begin() + 1); // видалити елемент з індексом 1
std::println("{}", v); // [0, 3, 8]
```

`size` vs `capacity`: vector виділяє пам'ять із запасом. Коли запас закінчується, він виділяє новий, більший блок і **переносить** усі елементи. Коефіцієнт зростання стандарт не фіксує: libc++ і libstdc++ подвоюють, MSVC множить на 1,5.

```cpp
std::vector<int> grow;
std::size_t lastCapacity = 0;
for (int i = 0; i < 20; ++i) {
    grow.push_back(i);
    if (grow.capacity() != lastCapacity) {
        lastCapacity = grow.capacity();
        std::print("{} ", lastCapacity);
    }
}
std::println(""); // 1 2 4 8 16 32 — libc++

std::vector<int> reserved;
reserved.reserve(1000); // якщо кількість відома — одне виділення замість багатьох
std::println("{} {}", reserved.size(), reserved.capacity()); // 0 1000
```

Головна пастка — **інвалідація**. Після переалокації старі ітератори, вказівники й посилання на елементи вказують на звільнену пам'ять:

```cpp norun
std::vector<int> v{1, 2, 3};
int& first = v[0];
v.push_back(4); // може спричинити переалокацію
std::println("{}", first); // ⚠️ невизначена поведінка — first може вказувати на звільнену пам'ять
```

`operator[]` не перевіряє межі (вихід за межі — невизначена поведінка), `at()` перевіряє і кидає виняток:

```cpp
std::vector<int> small{1, 2, 3};
try {
    std::println("{}", small.at(10)); // не надрукується
} catch (const std::out_of_range&) {
    std::println("at() threw out_of_range"); // at() threw out_of_range
}
```

### 5.2. Інші послідовні контейнери

```cpp
std::array<int, 3> fixed{1, 2, 3}; // розмір — частина типу, пам'ять на стеку, без виділень
std::deque<int> dq{2, 3};
dq.push_front(1); // deque: швидке додавання з обох кінців
dq.push_back(4);
std::list<int> linked{1, 3};
linked.insert(std::next(linked.begin()), 2); // list: вставка в середину O(1), якщо є ітератор
std::println("{} {} {}", fixed, dq, linked); // [1, 2, 3] [1, 2, 3, 4] [1, 2, 3]
```

`std::array` — заміна C-масиву `int a[3]`: знає свій розмір, копіюється, передається у функції без «розпаду» у вказівник. `std::list` виграє в теорії, але через розкидані по пам'яті вузли на практиці часто повільніший за `vector` навіть для вставок у середину.

### 5.3. Впорядковані асоціативні: `std::map`, `std::set`

Червоно-чорне дерево: ключі **завжди відсортовані**, пошук/вставка/видалення — O(log n).

```cpp
std::map<std::string, int> ages{{"Olena", 30}, {"Andrii", 25}};
ages["Ivan"] = 41; // вставка або перезапис
ages.insert({"Olena", 99}); // insert НЕ перезаписує існуючий ключ
for (const auto& [name, age] : ages) { // обхід — у порядку ключів
    std::print("{}={} ", name, age);
}
std::println(""); // Andrii=25 Ivan=41 Olena=30

std::set<int> unique{5, 1, 5, 3, 1};
std::println("{} {}", unique, unique.contains(3)); // {1, 3, 5} true
```

Пастка `operator[]`: звернення до **відсутнього** ключа тихо **вставляє** його зі значенням за замовчуванням. Для перевірки — `contains` (C++20) або `find`:

```cpp
std::map<std::string, int> scores{{"Ann", 10}};
if (scores["Bob"] == 0) { // перевірка «чи є Bob» насправді ДОДАЛА Bob
    std::println("size after lookup: {}", scores.size()); // size after lookup: 2
}
std::println("{}", scores.contains("Carl")); // false — і нічого не додано
if (auto it = scores.find("Ann"); it != scores.end()) {
    std::println("Ann -> {}", it->second); // Ann -> 10
}
```

Через цю поведінку `operator[]` не можна викликати для `const std::map` — лише `at()` або `find()`.

### 5.4. Невпорядковані: `std::unordered_map`, `std::unordered_set`

Хеш-таблиця: пошук/вставка в середньому O(1), але порядок обходу **не визначений** і може змінитися після вставок. Для власного типу ключа потрібні хеш-функція і `operator==`:

```cpp
#include <functional>
#include <print>
#include <string>
#include <unordered_map>

struct Coord {
    int x, y;
    bool operator==(const Coord&) const = default; // C++20: порівняння «за всіма полями»
};

template <>
struct std::hash<Coord> { // дозволена спеціалізація в namespace std (розділ 1.4)
    std::size_t operator()(const Coord& c) const noexcept {
        return std::hash<int>{}(c.x) ^ (std::hash<int>{}(c.y) << 1);
    }
};

int main() {
    std::unordered_map<std::string, int> wordCount;
    for (std::string w : {"a", "b", "a", "c", "a"}) {
        ++wordCount[w]; // тут вставка нуля за замовчуванням якраз зручна
    }
    std::println("a={} b={} size={}", wordCount["a"], wordCount["b"], wordCount.size()); // a=3 b=1 size=3

    std::unordered_map<Coord, std::string> map{{{0, 0}, "origin"}};
    std::println("{}", map.at({0, 0})); // origin
}
```

### 5.5. Адаптери: `stack`, `queue`, `priority_queue`

Адаптер — обгортка над іншим контейнером (за замовчуванням `deque` або `vector`), що відкриває лише потрібні операції:

```cpp
std::stack<int> st; // LIFO
std::queue<int> q; // FIFO
std::priority_queue<int> pq; // завжди віддає найбільший
for (int x : {3, 1, 4}) {
    st.push(x);
    q.push(x);
    pq.push(x);
}
std::println("stack top={} queue front={} pq top={}", st.top(), q.front(), pq.top()); // stack top=4 queue front=3 pq top=4

std::priority_queue<int, std::vector<int>, std::greater<>> minHeap; // min-heap: найменший зверху
for (int x : {3, 1, 4}) minHeap.push(x);
std::println("min={}", minHeap.top()); // min=1
```

`pop()` у всіх адаптерах нічого не повертає (`void`) — спершу читай `top()`/`front()`, потім `pop()`.

### 5.6. Шпаргалка: який контейнер обрати

| Потреба | Контейнер | Доступ | Вставка/видалення |
|---|---|---|---|
| За замовчуванням, послідовність | `vector` | O(1) за індексом | O(1) у кінці, O(n) у середині |
| Розмір відомий під час компіляції | `array` | O(1) | — |
| Черга з обох кінців | `deque` | O(1) | O(1) на кінцях |
| Словник з відсортованими ключами | `map` / `set` | O(log n) | O(log n) |
| Найшвидший словник, порядок не важливий | `unordered_map` / `unordered_set` | O(1) у середньому | O(1) у середньому |
| LIFO / FIFO / пріоритет | `stack` / `queue` / `priority_queue` | вершина O(1) | O(1) / O(1) / O(log n) |

## 6. Ітератори

Ітератор — узагальнений «вказівник» на елемент контейнера. Саме він з'єднує контейнери з алгоритмами: алгоритм не знає, що перед ним — `vector` чи `list`, він працює з парою ітераторів. Діапазон завжди **напіввідкритий**: `begin()` вказує на перший елемент, `end()` — на позицію **за** останнім (розіменовувати `end()` не можна).

```cpp
std::vector<int> v{10, 20, 30};
for (auto it = v.begin(); it != v.end(); ++it) {
    std::print("{} ", *it); // *it — розіменування: доступ до елемента
}
std::println(""); // 10 20 30
for (auto it = v.rbegin(); it != v.rend(); ++it) std::print("{} ", *it); // зворотний обхід
std::println(""); // 30 20 10
std::println("{}", std::distance(v.begin(), v.end())); // 3
for (int x : v) std::print("{} ", x * 2); // range-based for — синтаксис над begin()/end()
std::println(""); // 20 40 60
```

Категорії ітераторів визначають, які алгоритми доступні: `vector` має random-access ітератори (можна `it + 5`), `list` — лише bidirectional (`++`/`--`), тому `std::sort(list.begin(), list.end())` не скомпілюється — у `list` є власний метод `list.sort()`.

## 7. Алгоритми

`<algorithm>` і `<numeric>` — понад сотня готових функцій над діапазонами ітераторів: пошук, сортування, підрахунок, перетворення. Використовувати їх замість ручних циклів — рекомендація Core Guidelines: код коротший, намір очевидний, реалізація оптимізована.

```cpp
std::vector<int> v{5, 2, 8, 1, 9, 3};

std::sort(v.begin(), v.end());
std::println("{}", v); // [1, 2, 3, 5, 8, 9]
std::sort(v.begin(), v.end(), std::greater<>{}); // власний критерій порівняння
std::println("{}", v); // [9, 8, 5, 3, 2, 1]

auto it = std::find(v.begin(), v.end(), 5);
std::println("found 5 at index {}", std::distance(v.begin(), it)); // found 5 at index 2

auto evens = std::count_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
std::println("evens: {}", evens); // evens: 2

int sum = std::accumulate(v.begin(), v.end(), 0); // <numeric>
std::println("sum: {}", sum); // sum: 28

auto [minIt, maxIt] = std::minmax_element(v.begin(), v.end());
std::println("min {} max {}", *minIt, *maxIt); // min 1 max 9

std::vector<int> squares(v.size());
std::transform(v.begin(), v.end(), squares.begin(), [](int x) { return x * x; });
std::println("{}", squares); // [81, 64, 25, 9, 4, 1]
```

Третій аргумент у багатьох алгоритмах — **лямбда** `[](int x) { return ...; }`: анонімна функція, яку можна передати як значення. У квадратних дужках — що вона захоплює з оточення (`[&]` — усе за посиланням, `[=]` — за значенням, `[limit]` — одну змінну).

### 7.1. Пастка: `std::remove` нічого не видаляє

Алгоритми працюють з ітераторами й **не можуть** змінити розмір контейнера. `std::remove` лише зсуває «залишені» елементи на початок і повертає новий логічний кінець — розмір лишається старим:

```cpp
std::vector<int> v{1, 2, 3, 2, 4};
auto newEnd = std::remove(v.begin(), v.end(), 2);
std::println("size after remove: {}", v.size()); // size after remove: 5 — нічого не видалено!
v.erase(newEnd, v.end()); // класична ідіома erase-remove
std::println("{}", v); // [1, 3, 4]

std::vector<int> w{1, 2, 3, 2, 4};
std::erase(w, 2); // C++20: те саме одним викликом
std::erase_if(w, [](int x) { return x > 3; });
std::println("{}", w); // [1, 3]
```

## 8. Ranges — алгоритми над діапазонами (C++20)

`std::ranges` дозволяє передавати контейнер цілком замість пари ітераторів, а `std::views` — будувати **ліниві** ланцюжки перетворень через `|`. View нічого не обчислює і не копіює, доки його не обходять — той самий принцип, що в ледачих ітераторів JS ([iterator.md](../js/common/data-structures/iterator/iterator.md)).

```cpp
std::vector<int> v{5, 2, 8, 1, 9, 3};
std::ranges::sort(v); // без begin()/end()
std::println("{}", v); // [1, 2, 3, 5, 8, 9]

auto pipeline = v | std::views::filter([](int x) { return x % 2 == 1; }) // непарні
                  | std::views::transform([](int x) { return x * 10; }) // × 10
                  | std::views::take(2); // лише перші два
std::println("{}", pipeline); // [10, 30] — обчислено лише під час обходу

auto collected = pipeline | std::ranges::to<std::vector>(); // C++23: матеріалізувати у vector
std::println("{} {}", collected, collected.size()); // [10, 30] 2

for (int i : std::views::iota(1, 6)) std::print("{} ", i * i); // iota — лінива послідовність чисел
std::println(""); // 1 4 9 16 25

std::vector<std::string> names{"Ann", "Bob"};
for (auto [i, name] : std::views::zip(std::views::iota(0), names)) { // C++23: індекс + елемент
    std::print("{}:{} ", i, name);
}
std::println(""); // 0:Ann 1:Bob
```

Для «індекс + елемент» у C++23 є й спеціальний `std::views::enumerate(names)`, але libc++ 21 (Apple clang) його ще не реалізує — код не компілюється. Перевірити, чи бібліотека підтримує конкретну можливість, можна макросом з `<version>`: `#ifdef __cpp_lib_ranges_enumerate`. Стан підтримки по компіляторах — таблиці на cppreference.

Пастка: view зберігає посилання на вихідний контейнер. Якщо контейнер знищено або переалоковано, view «висить» — так само, як `string_view`.

## 9. Розумні вказівники — `<memory>`

Розумний вказівник — RAII-обгортка над динамічною пам'яттю: звільняє об'єкт сам, коли вказівник знищується. У сучасному C++ «голі» `new`/`delete` у прикладному коді майже не пишуть ([cpp.md](cpp.md), розділ 6).

### 9.1. `std::unique_ptr` — єдине володіння

Рівно один власник. Копіювати не можна, лише **переміщувати** (`std::move`) — власність переходить до іншого. Накладних витрат порівняно з сирим вказівником немає.

```cpp
#include <memory>
#include <print>
#include <string>
#include <utility>

struct Resource {
    std::string name;
    explicit Resource(std::string n) : name(std::move(n)) { std::println("acquire {}", name); }
    ~Resource() { std::println("release {}", name); }
};

int main() {
    auto a = std::make_unique<Resource>("file"); // acquire file
    // auto copy = a; // ❌ call to implicitly-deleted copy constructor
    auto b = std::move(a); // власність переходить до b
    std::println("a is {}", a ? "set" : "empty"); // a is empty
    {
        auto scoped = std::make_unique<Resource>("socket"); // acquire socket
    } // release socket — вихід з блоку
    std::println("end of main"); // end of main
} // release file — b знищується тут
```

Порядок виводу: `acquire file`, `a is empty`, `acquire socket`, `release socket`, `end of main`, `release file`.

### 9.2. `std::shared_ptr` — спільне володіння

Кілька власників; об'єкт живе, поки існує хоч один `shared_ptr`. Всередині — лічильник посилань (атомарний, тож копіювання дорожче за `unique_ptr`).

```cpp
auto first = std::make_shared<std::string>("shared config");
std::println("owners: {}", first.use_count()); // owners: 1
{
    auto second = first; // копія — ще один власник
    std::println("owners: {}", first.use_count()); // owners: 2
}
std::println("owners: {}", first.use_count()); // owners: 1
```

### 9.3. `std::weak_ptr` — розірвати цикл

Два об'єкти, що тримають `shared_ptr` один на одного, ніколи не звільняться: лічильники не впадуть до нуля — витік пам'яті. `weak_ptr` спостерігає за об'єктом, не володіючи ним:

```cpp
#include <memory>
#include <print>

struct Node {
    std::shared_ptr<Node> next; // володіє наступним
    std::weak_ptr<Node> prev; // лише спостерігає за попереднім — циклу володіння немає
    ~Node() { std::println("node destroyed"); }
};

int main() {
    {
        auto a = std::make_shared<Node>();
        auto b = std::make_shared<Node>();
        a->next = b;
        b->prev = a; // якби prev був shared_ptr — жоден вузол ніколи не знищився б
        if (auto p = b->prev.lock()) { // lock() — тимчасовий shared_ptr, якщо об'єкт ще живий
            std::println("prev alive, owners: {}", p.use_count()); // prev alive, owners: 2
        }
    }
    std::println("scope left"); // scope left
}
```

Вивід: `prev alive, owners: 2`, потім двічі `node destroyed`, потім `scope left`.

| Вказівник | Власників | Копіювання | Коли |
|---|---|---|---|
| `unique_ptr` | один | ні, лише `move` | за замовчуванням |
| `shared_ptr` | багато | так | спільне володіння справді потрібне |
| `weak_ptr` | не володіє | так | спостерігач, розрив циклів, кеші |

Завжди створюй через `std::make_unique`/`std::make_shared`, а не `new`: це безпечніше при винятках, а `make_shared` виділяє об'єкт і лічильник одним блоком.

## 10. Словникові типи: pair, tuple, optional, variant, expected

### 10.1. `std::pair`, `std::tuple` і structured bindings

```cpp
std::pair<std::string, int> entry{"apples", 3};
std::tuple<int, double, std::string> record{1, 2.5, "three"};
auto [label, amount] = entry; // structured bindings (C++17)
auto [id, weight, title] = record;
std::println("{} {} | {} {} {}", label, amount, id, weight, title); // apples 3 | 1 2.5 three
std::println("{}", std::get<2>(record)); // three — доступ за індексом
```

### 10.2. `std::optional` — «значення або нічого» (C++17)

Заміна «магічних» значень на кшталт `-1` чи `nullptr` для «не знайдено»:

```cpp
#include <optional>
#include <print>
#include <string>
#include <vector>

std::optional<std::size_t> findIndex(const std::vector<std::string>& items, const std::string& target) {
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (items[i] == target) return i;
    }
    return std::nullopt; // «значення немає»
}

int main() {
    std::vector<std::string> fruits{"apple", "pear"};
    if (auto idx = findIndex(fruits, "pear")) { // optional перетворюється на bool
        std::println("pear at {}", *idx); // pear at 1
    }
    std::println("{}", findIndex(fruits, "kiwi").value_or(999)); // 999
    std::println("{}", findIndex(fruits, "kiwi").has_value()); // false
}
```

`*opt` на порожньому optional — невизначена поведінка; `opt.value()` кидає `std::bad_optional_access`.

### 10.3. `std::variant` — одне з кількох типів (C++17)

Типобезпечний union: зберігає рівно одне значення з переліку типів і знає, яке саме. Аналог discriminated union у TypeScript ([union-and-intersection-types.md](../js/typescript/union-and-intersection-types.md)).

```cpp
#include <print>
#include <string>
#include <variant>
#include <vector>

template <class... Ts>
struct overloaded : Ts... { // поширений допоміжний шаблон: набір лямбд як одна функція
    using Ts::operator()...;
};

int main() {
    std::vector<std::variant<int, double, std::string>> values{42, 3.5, "text"};
    for (const auto& v : values) {
        std::visit(overloaded{
                       [](int i) { std::println("int {}", i); },
                       [](double d) { std::println("double {}", d); },
                       [](const std::string& s) { std::println("string {}", s); },
                   },
                   v);
    }
    // int 42
    // double 3.5
    // string text
    std::println("{}", std::holds_alternative<int>(values[0])); // true
}
```

Якщо забути гілку для одного з типів, `std::visit` не скомпілюється — перевірка повноти, як у TypeScript зі `switch` і `never`.

### 10.4. `std::expected` — результат або помилка (C++23)

Повертає **або** значення, **або** опис помилки — альтернатива винятками для очікуваних збоїв (некоректний ввід, файл не знайдено):

```cpp
#include <expected>
#include <print>
#include <string>

std::expected<int, std::string> parsePort(const std::string& text) {
    try {
        int port = std::stoi(text);
        if (port < 1 || port > 65535) return std::unexpected("port out of range");
        return port;
    } catch (const std::exception&) {
        return std::unexpected("not a number");
    }
}

int main() {
    for (std::string input : {"8080", "70000", "http"}) {
        auto result = parsePort(input);
        if (result) {
            std::println("{} -> port {}", input, *result);
        } else {
            std::println("{} -> error: {}", input, result.error());
        }
    }
    // 8080 -> port 8080
    // 70000 -> error: port out of range
    // http -> error: not a number
}
```

## 11. Час — `<chrono>`

`std::chrono` розрізняє **тривалості** (duration) і **моменти часу** (time_point) на рівні типів: додати секунди до мілісекунд можна, а переплутати одиниці — ні.

```cpp
using namespace std::chrono_literals;
auto total = 1h + 30min + 15s; // тип обирається автоматично — std::chrono::seconds
std::println("{} = {}", total, std::chrono::duration_cast<std::chrono::minutes>(total)); // 5415s = 90min

auto start = std::chrono::steady_clock::now(); // steady_clock — для вимірювання інтервалів
std::this_thread::sleep_for(20ms);
auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - start);
std::println("slept at least 20ms: {}", elapsed >= 20ms); // slept at least 20ms: true
```

`steady_clock` ніколи не йде назад — для вимірювання часу виконання; `system_clock` — «настінний» час, який можуть переводити, — для дат.

## 12. Багатопотоковість

З C++11 потоки — частина стандарту: `<thread>`, `<mutex>`, `<atomic>`, `<future>`.

```cpp
int counter = 0;
std::mutex m;
std::atomic<int> atomicCounter = 0;

{
    std::vector<std::jthread> workers; // jthread (C++20) сам чекає завершення в деструкторі
    for (int t = 0; t < 4; ++t) {
        workers.emplace_back([&] {
            for (int i = 0; i < 10000; ++i) {
                std::lock_guard lock(m); // RAII: м'ютекс звільниться при виході з ітерації
                ++counter;
                ++atomicCounter; // атомарна операція — м'ютекс не потрібен
            }
        });
    }
} // тут усі 4 потоки гарантовано завершені
std::println("{} {}", counter, atomicCounter.load()); // 40000 40000

auto future = std::async(std::launch::async, [] { return 6 * 7; }); // задача в іншому потоці
std::println("async result: {}", future.get()); // async result: 42 — get() чекає результат
```

Без `lock_guard` звичайний `++counter` з кількох потоків — **гонка даних** (data race), тобто невизначена поведінка, а на практиці — результат менший за 40000. `std::thread` (на відміну від `jthread`) треба явно `join()`, інакше його деструктор викличе `std::terminate`.

## 13. Винятки стандартної бібліотеки

Бібліотека повідомляє про помилки винятками, успадкованими від `std::exception` (`<stdexcept>`). Ловити їх прийнято за **константним посиланням**:

```cpp
try {
    std::println("{}", std::vector<int>{}.at(0));
} catch (const std::out_of_range&) { // конкретний тип
    std::println("out_of_range"); // out_of_range
} catch (const std::exception& e) { // базовий — усе інше зі стандартної бібліотеки
    std::println("other: {}", e.what());
}

try {
    throw std::runtime_error("disk is full");
} catch (const std::exception& e) {
    std::println("caught: {}", e.what()); // caught: disk is full
}
```

| Виняток | Коли |
|---|---|
| `std::out_of_range` | `at()` поза межами, `std::stoi` для завеликого числа |
| `std::invalid_argument` | `std::stoi("abc")` |
| `std::bad_alloc` | не вдалося виділити пам'ять |
| `std::bad_optional_access` | `value()` у порожнього `optional` |
| `std::bad_variant_access` | `std::get` не того типу з `variant` |
| `std::runtime_error`, `std::logic_error` | базові класи для власних винятків |

Важливо: більшість «швидких» операцій (`operator[]`, `*optional`, розіменування `end()`) **нічого не перевіряють** — їхнє неправильне використання дає невизначену поведінку, а не виняток. Режими налагодження бібліотек (`-D_GLIBCXX_DEBUG`, `_LIBCPP_HARDENING_MODE`) і санітайзери (`-fsanitize=address,undefined`) допомагають ловити такі помилки під час розробки.

## Підсумок

- `std` — простір імен стандартної бібліотеки C++; бібліотека — частина стандарту ISO, а реалізації (libstdc++, libc++, MSVC STL) відрізняються незафіксованими деталями.
- `using namespace std;` зручний лише в маленьких прикладах: у реальному коді — конфлікти імен, у заголовках — ніколи; альтернативи — повні імена, `using std::x;`, обмежений блок, `std::literals`.
- Додавати свої імена в `std` — невизначена поведінка; дозволені лише спеціалізації на кшталт `std::hash` і `std::formatter`.
- Введення/виведення: `iostream` зі станом, що «прилипає», або сучасні `std::format`/`std::println`.
- `std::string` володіє пам'яттю; `std::string_view` — дешеве вікно для параметрів, яке може «повиснути».
- Контейнер за замовчуванням — `vector`; `map`/`set` — відсортовані, `unordered_*` — хеш-таблиці без порядку; адаптери `stack`/`queue`/`priority_queue`.
- Пастки контейнерів: переалокація `vector` інвалідує ітератори й посилання; `map::operator[]` вставляє відсутній ключ; `operator[]` не перевіряє межі — `at()` перевіряє.
- Ітератори з напіввідкритим діапазоном `[begin, end)` поєднують контейнери з алгоритмами; `std::remove` не змінює розмір — `std::erase`/`erase_if`.
- Ranges і views (C++20/23) — алгоритми над цілими контейнерами і ліниві конвеєри через `|`, `ranges::to` матеріалізує результат.
- Розумні вказівники: `unique_ptr` за замовчуванням, `shared_ptr` для спільного володіння, `weak_ptr` проти циклів; створюй через `make_unique`/`make_shared`.
- Словникові типи: `pair`/`tuple` + structured bindings, `optional` (є або немає), `variant` + `visit` (одне з типів), `expected` (значення або помилка).
- `chrono` робить одиниці часу частиною типу; `steady_clock` — для вимірювань.
- Потоки: `jthread`, `mutex` + `lock_guard`, `atomic`, `async`/`future`; спільні дані без синхронізації — гонка даних.
- Бібліотека кидає винятки від `std::exception`, але «швидкі» операції нічого не перевіряють — там допомагають debug-режими й санітайзери.
