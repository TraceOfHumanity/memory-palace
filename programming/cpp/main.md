# C++: функція `main` — точка входу програми

## 0. Що таке `main`

`main` — функція, з якої починається виконання **твого** коду в програмі на C++. Операційна система запускає процес, середовище виконання (C/C++ runtime) готує все необхідне — і викликає `main`. Коли `main` повертає значення, програма завершується, а це значення стає **кодом завершення** (exit code) процесу.

Найменша коректна програма на C++:

```cpp
int main() {}
```

Приклади нижче скомпільовані Apple clang 21 (`-std=c++23 -Wall -Wextra`) і запущені на macOS. Команди запуску й вивід показано в блоках `bash`.

## 1. Дозволені сигнатури

Стандарт гарантує дві форми:

```cpp
int main() { /* ... */ } // коли аргументи командного рядка не потрібні
```

```cpp
int main(int argc, char* argv[]) { /* ... */ } // те саме, що char** argv; розділ 3
```

Будь-які інші форми — на розсуд реалізації. Найпоширеніше розширення — третій параметр з оточенням: `int main(int argc, char* argv[], char* envp[])` (POSIX). На Windows є `wmain` (аргументи як `wchar_t*`) і `WinMain` для GUI-програм без консолі.

Тип повернення — **завжди `int`**. `void main()` — не C++, хоч і трапляється в старих підручниках:

```cpp
// void main() {} // ❌ 'main' must return 'int'
int main() {}
```

## 2. Значення, що повертає `main`, — код завершення

Повернене число отримує той, хто запустив програму: оболонка, скрипт, CI-система, інша програма. Домовленість: `0` — успіх, будь-що інше — помилка.

```cpp
#include <cstdlib>
#include <print>

int main() {
    bool configFound = false;
    if (!configFound) {
        std::println("config not found"); // config not found
        return EXIT_FAILURE; // 1 — макроси з <cstdlib> для читабельності
    }
    return EXIT_SUCCESS; // 0
}
```

```bash
./app; echo "exit code: $?"
# config not found
# exit code: 1
```

У shell це використовують у ланцюжках: `./build && ./test` запустить тести, лише якщо збирання повернуло `0`.

### 2.1. `main` — єдина функція, де `return` можна пропустити

Якщо виконання дійшло до кінця `main` без `return`, це рівнозначно `return 0;`. Для будь-якої іншої функції, що повертає значення, пропущений `return` — невизначена поведінка (компілятор попереджає `-Wreturn-type`).

```bash
echo 'int main() {}' > empty.cpp && clang++ empty.cpp -o empty && ./empty; echo $?
# 0
```

### 2.2. Код обрізається до 0–255

На POSIX-системах батьківський процес бачить лише **молодші 8 бітів** коду. Тому великі й від'ємні значення «загортаються» — не використовуй їх:

```bash
# int main() { return 259; }  →  exit code 3   (259 % 256)
# int main() { return -1; }   →  exit code 255
```

Коди понад 128 до того ж плутаються з «процес убито сигналом»: `128 + N`, де N — номер сигналу (розділ 5.3).

## 3. Аргументи командного рядка: `argc` і `argv`

- `argc` (argument count) — кількість аргументів, **включно** з назвою програми, тож `argc >= 1`;
- `argv` (argument vector) — масив C-рядків: `argv[0]` — як програму запустили, `argv[1]…argv[argc-1]` — аргументи, а `argv[argc]` гарантовано `nullptr`.

Оболонка сама розбиває рядок на аргументи: лапки об'єднують слова в один аргумент, а числа приходять **рядками** — перетворювати їх треба самому.

```cpp
#include <print>
#include <string_view>
#include <vector>

int main(int argc, char* argv[]) {
    std::println("argc = {}", argc);
    for (int i = 0; i < argc; ++i) {
        std::println("argv[{}] = \"{}\"", i, argv[i]);
    }
    std::println("argv[argc] is nullptr: {}", argv[argc] == nullptr);

    std::vector<std::string_view> args(argv + 1, argv + argc); // зручніше, ніж char**
    std::println("{}", args);
}
```

```bash
./args hello "two words" 42
# argc = 4
# argv[0] = "./args"
# argv[1] = "hello"
# argv[2] = "two words"
# argv[3] = "42"
# argv[argc] is nullptr: true
# ["hello", "two words", "42"]

./args
# argc = 1
# argv[0] = "./args"
# argv[argc] is nullptr: true
# []
```

`argv[0]` не обов'язково повний шлях — це рядок, яким програму запустили (`./args`, `args`, або взагалі довільний текст, якщо запускає інша програма). Для визначення розташування виконуваного файлу він ненадійний.

Перетворення в `std::vector<std::string_view>` — сучасна ідіома: з'являються `size()`, range-for, алгоритми ([std.md](std.md)), а копіювання рядків немає — `argv` живе до кінця програми, тож `string_view` тут не «повисне».

### 3.1. Типовий каркас консольної утиліти

```cpp
#include <charconv>
#include <cstdlib>
#include <print>
#include <string_view>
#include <vector>

int main(int argc, char* argv[]) {
    std::vector<std::string_view> args(argv + 1, argv + argc);

    if (args.empty() || args[0] == "--help") {
        std::println(stderr, "usage: {} <count>", argv[0]); // довідка й помилки — у stderr
        return args.empty() ? EXIT_FAILURE : EXIT_SUCCESS;
    }

    int count = 0;
    auto [ptr, ec] = std::from_chars(args[0].data(), args[0].data() + args[0].size(), count);
    if (ec != std::errc{} || ptr != args[0].data() + args[0].size()) {
        std::println(stderr, "error: '{}' is not a number", args[0]);
        return 2; // окремий код для «неправильні аргументи»
    }

    for (int i = 1; i <= count; ++i) std::print("{} ", i);
    std::println("");
    return EXIT_SUCCESS;
}
```

```bash
./count 5; echo "code $?"
# 1 2 3 4 5
# code 0

./count five; echo "code $?"
# error: 'five' is not a number
# code 2
```

`std::from_chars` (`<charconv>`) не кидає винятків і перевіряє, що розібрано **весь** рядок. `std::stoi("5abc")` мовчки повернув би `5`. Для складних інтерфейсів (прапорці, підкоманди) беруть бібліотеки — CLI11, cxxopts.

### 3.2. Змінні оточення

Портабельний спосіб — `std::getenv` з `<cstdlib>`; він повертає `nullptr`, якщо змінної немає:

```cpp
#include <cstdlib>
#include <print>

int main() {
    const char* home = std::getenv("HOME");
    std::println("HOME is set: {}", home != nullptr); // HOME is set: true
    const char* missing = std::getenv("SURELY_NOT_DEFINED_VAR");
    std::println("{}", missing ? missing : "(not set)"); // (not set)
}
```

## 4. Обмеження `main`

`main` — особлива функція, і стандарт забороняє з нею кілька звичних речей:

```cpp
// static int main() {} // ❌ 'main' is not allowed to be declared static
// inline int main() {} // ❌ 'main' is not allowed to be declared inline
int main() {}
```

- `main` не можна перевантажувати: у програмі лише одна глобальна `main`;
- її не можна оголосити `static`, `inline`, `constexpr`;
- її **не можна викликати** з програми (зокрема рекурсивно) і брати її адресу.

Остання заборона цікава тим, що clang за замовчуванням її **мовчки пропускає**: рекурсивний `return main();` компілюється навіть з `-Wall -Wextra` без жодного попередження. Лише з `-pedantic` з'являється `warning: referring to 'main' within an expression is a Clang extension [-Wmain]`, а з `-pedantic-errors` це стає помилкою. Тобто код працює, але це вже не стандартний C++ — ще одна причина додавати `-pedantic` до прапорців збирання.

Функція `main` в **іншому просторі імен** — уже не точка входу, а звичайна функція з таким ім'ям:

```cpp
#include <print>

namespace app {
int main() { return 7; } // просто функція app::main — її можна викликати
}

int main() {
    std::println("app::main returned {}", app::main()); // app::main returned 7
}
```

## 5. Що відбувається до `main` і після неї

`main` — не перший і не останній код програми.

**До `main`** runtime ініціалізує всі об'єкти зі статичним часом життя (глобальні змінні, `static`-члени класів): їхні конструктори виконуються **раніше** за перший рядок `main`.

**Після `return` з `main`** runtime:

1. знищує локальні об'єкти `main` (як у будь-якої функції);
2. викликає `std::exit(код)`, яка:
   - викликає обробники, зареєстровані через `std::atexit`, і деструктори статичних об'єктів — у зворотному порядку;
   - скидає (flush) буфери потоків виведення й закриває файли;
3. повертає код операційній системі.

```cpp
#include <cstdlib>
#include <print>
#include <stdexcept>
#include <string>
#include <string_view>

struct Tracer {
    std::string name;
    explicit Tracer(std::string n) : name(std::move(n)) { std::println("construct {}", name); }
    ~Tracer() { std::println("destroy {}", name); }
};

Tracer globalTracer{"global"}; // конструктор виконається ДО main

int main(int argc, char* argv[]) {
    std::println("main started");
    Tracer local{"local"};
    std::atexit([] { std::println("atexit handler"); });

    std::string_view mode = argc > 1 ? argv[1] : "return";
    if (mode == "exit") std::exit(4);
    if (mode == "abort") std::abort();
    if (mode == "throw") throw std::runtime_error("unhandled");
    return 0;
}
// construct global
// main started
// construct local
// destroy local
// atexit handler
// destroy global
```

Вище — вивід для звичайного `return`. Та сама програма з різними способами завершення:

```bash
./life exit; echo "code $?"
# construct global
# main started
# construct local
# atexit handler        ← немає "destroy local"!
# destroy global
# code 4

./life abort; echo "code $?"
# construct global
# main started
# construct local
# code 134              ← ні деструкторів, ні atexit

./life throw; echo "code $?"
# libc++abi: terminating due to uncaught exception of type std::runtime_error: unhandled
# construct global
# main started
# construct local
# code 134
```

### 5.1. `return` vs `std::exit()` — різниця в локальних об'єктах

`std::exit()` **не повертається** у функцію, що її викликала, тож стек не розмотується: деструктори **локальних** об'єктів (`local`) не викликаються. Статичні знищуються, `atexit`-обробники спрацьовують. Якщо локальний об'єкт тримав ресурс, що потребує завершальних дій (незаписаний файл, транзакція), `exit()` цю роботу пропустить. Тому з `main` виходять через `return`, а з глибини програми — через виняток, який ловлять у `main` (розділ 5.4).

### 5.2. Способи завершити програму

| Спосіб | Локальні деструктори | `atexit` і статичні деструктори | Flush потоків | Коли |
|---|---|---|---|---|
| `return` з `main` | так | так | так | звичайний шлях |
| `std::exit(code)` | **ні** | так | так | вихід з глибини програми |
| `std::quick_exit(code)` | ні | лише `at_quick_exit` | ні | швидкий вихід без очищення |
| `std::abort()` | ні | ні | не гарантовано | аварійна зупинка (сигнал `SIGABRT`) |
| необроблений виняток | не гарантовано | ні | не гарантовано | викликає `std::terminate` → `abort` |

### 5.3. Код 134 і порядок рядків

`abort()` посилає процесу сигнал `SIGABRT` (номер 6), а оболонка повідомляє про смерть від сигналу кодом `128 + 6 = 134`.

Зверни увагу: у прикладі з `throw` повідомлення `libc++abi` надруковано **раніше** за рядки, які програма вивела до винятку. `stderr` не буферизується, а `stdout`, спрямований у pipe або файл, накопичує вивід у буфері, тож він з'явився пізніше. Чи з'явиться він узагалі при аварійному завершенні, стандарт не гарантує — не покладайся на `stdout` для діагностики збою, пиши в `stderr`.

### 5.4. Необроблений виняток: ловити в `main`

Якщо виняток вилетів з `main`, викликається `std::terminate`. Чи розмотається перед цим стек (чи викличуться деструктори локальних об'єктів) — визначає реалізація; у прикладі вище `destroy local` не надруковано. Тому поширений патерн — «останній рубіж» у `main`:

```cpp
#include <cstdlib>
#include <exception>
#include <print>
#include <stdexcept>

void run() {
    throw std::runtime_error("database unavailable"); // помилка десь глибоко в програмі
}

int main() {
    try {
        run();
    } catch (const std::exception& e) {
        std::println(stderr, "fatal: {}", e.what()); // у stderr — зрозуміле повідомлення
        std::println("handled, exiting with failure"); // handled, exiting with failure
        return EXIT_FAILURE; // керований вихід: деструктори й flush відпрацюють
    }
}
```

### 5.5. Порядок ініціалізації глобальних об'єктів (static initialization order fiasco)

У межах **одного** файлу глобальні об'єкти ініціалізуються в порядку оголошення. Між **різними** файлами (одиницями трансляції) порядок не визначений. Якщо конструктор глобального об'єкта в `a.cpp` використовує глобальний об'єкт з `b.cpp`, той може бути ще не створений — класична важковловима помилка. Рішення — «функція з локальною статичною змінною»: об'єкт створюється при першому виклику, до того ж потокобезпечно (з C++11):

```cpp
#include <print>
#include <string>

const std::string& appName() {
    static const std::string name = "memory-palace"; // створюється при першому виклику
    return name;
}

int main() {
    std::println("{}", appName()); // memory-palace
}
```

## 6. Компіляція й запуск

```bash
clang++ -std=c++23 -Wall -Wextra -o app main.cpp   # компіляція: main.cpp → виконуваний файл app
./app arg1 arg2                                     # запуск з аргументами
echo $?                                             # код завершення останньої команди
```

У програмі може бути багато `.cpp`-файлів, але `main` — рівно в одному. Якщо її немає, помилку дасть не компілятор, а **лінкер**: `Undefined symbols ... _main` (macOS) чи `undefined reference to 'main'` (Linux). Бібліотеки (`.a`, `.so`, `.dylib`) `main` не мають — її надає програма, що їх використовує.

## 7. `main` у C і в C++

| | C ([[c]]) | C++ |
|---|---|---|
| Функція без параметрів | `int main(void)` — `int main()` у старих стандартах означало «невідомі параметри» | `int main()` — `()` завжди означає «без параметрів» |
| Неявний `return 0` | з C99 | завжди |
| Виклик `main` з програми | дозволено | заборонено |
| Що виконується до `main` | майже нічого | конструктори глобальних об'єктів |

## Підсумок

- `main` — точка входу програми, тип повернення — завжди `int`; стандартні форми — `int main()` і `int main(int argc, char* argv[])`.
- Повернене значення — код завершення: `0` (`EXIT_SUCCESS`) — успіх, решта — помилка; на POSIX видно лише 0–255.
- Лише в `main` пропущений `return` означає `return 0`.
- `argc` включає назву програми, `argv[argc] == nullptr`, аргументи — завжди рядки; зручно загорнути у `std::vector<std::string_view>`, числа розбирати через `std::from_chars`.
- `main` не можна перевантажувати, робити `static`/`inline`/`constexpr`, викликати чи брати її адресу (clang лише попереджає — це розширення).
- Глобальні об'єкти створюються до `main` і знищуються після неї; між файлами порядок ініціалізації не визначений — використовуй локальні `static`.
- `return` з `main` прибирає все; `std::exit` пропускає локальні деструктори; `abort` і необроблений виняток (код 134) не прибирають нічого.
- Виняток краще ловити в `main` (`catch (const std::exception&)`) і завершуватися керовано, з повідомленням у `stderr`.
