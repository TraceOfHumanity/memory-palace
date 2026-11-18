# Bash — командний рядок і скрипти: що це, як працює, команди

> Усі виводи нижче отримано справжнім запуском на macOS у `/bin/bash` версії 3.2.57 (на macOS це системний bash; інтерактивна оболонка за замовчуванням тут — zsh). Відмінності від Linux (bash 5.x) позначено. Рядок, що починається з `$`, — команда; решта — її вивід; `#` — коментар. Деякі виводи скорочено (`head`) або прибрано шлях користувача.

## 1. Термінал, оболонка, bash

Три різні речі, які часто плутають:

| поняття | що це |
|---|---|
| **термінал** (terminal emulator) | вікно, що показує текст і приймає натискання клавіш: Terminal.app, iTerm2, GNOME Terminal, VS Code terminal |
| **оболонка** (shell) | програма всередині терміналу, що читає ваші команди й запускає інші програми: bash, zsh, fish, sh |
| **Bash** (Bourne Again SHell) | найпоширеніша оболонка, GNU (1989, Браян Фокс); сумісна з `sh` (Bourne shell) і значною мірою з POSIX |

```bash
echo $SHELL            # ваша оболонка за замовчуванням: /bin/zsh (macOS), /bin/bash (більшість Linux)
bash --version         # GNU bash, version 3.2.57(1)-release (macOS); на Linux зазвичай 5.x
echo $0                # ім'я поточної оболонки або скрипта
```

- **zsh** — стандарт macOS з 2019 року; схожий синтаксис, але є відмінності (масиви з 1, інші glob-и).
- **sh/dash** — мінімальна POSIX-оболонка (Debian `/bin/sh`), у скриптах не можна покладатись на специфічне для bash.
- Скрипти для bash пишуть із `#!/bin/bash` (або `#!/usr/bin/env bash`).

**Що відбувається, коли ви натискаєте Enter:**

1. оболонка **розбирає** рядок на слова й оператори (`|`, `>`, `&&`, `;`);
2. виконує **розширення** (змінні, `$(...)`, `{a,b}`, `*`, `~`);
3. знаходить команду: **alias → функція → builtin → програма з `$PATH`**;
4. створює процес (`fork` + `exec`), з'єднує потоки, чекає завершення;
5. зберігає **код завершення** в `$?` (0 — успіх).

## 2. Анатомія команди й довідка

```
команда  [опції]  [аргументи]
ls       -l -a    project
```

- **Опції**: короткі `-l`, злиті `-la`, довгі `--all`; значення: `-n 5`, `--lines=5`.
- `--` означає «кінець опцій»: `rm -- -file` (файл із ім'ям `-file`).
- Слова розділяються пробілами; щоб пробіл був частиною аргументу — лапки.

```bash
type cd; type ls; type -t if
# cd is a shell builtin
# ls is hashed (/bin/ls)
# keyword
which bash              # /bin/bash — шлях до програми
help cd                 # довідка по builtin
man ls                  # повний посібник (q — вихід, / — пошук)
ls --help               # коротка довідка (GNU); на macOS: ls -h немає, дивіться man
```

`type` показує, чим саме є команда: **builtin** (вбудована в оболонку: `cd`, `echo`, `export`), **keyword** (`if`, `for`), **alias**, **function** чи **файл**.

### Гарячі клавіші й історія

| клавіші | дія |
|---|---|
| `Tab` | автодоповнення (двічі — варіанти) |
| `Ctrl+C` | перервати поточну команду (SIGINT) |
| `Ctrl+D` | кінець вводу / вийти з оболонки (EOF) |
| `Ctrl+Z` | призупинити в фон (SIGTSTP), потім `bg`/`fg` |
| `Ctrl+L` | очистити екран (як `clear`) |
| `Ctrl+A` / `Ctrl+E` | початок / кінець рядка |
| `Ctrl+W` / `Ctrl+U` / `Ctrl+K` | видалити слово / до початку / до кінця |
| `Ctrl+R` | пошук по історії команд |
| `↑` / `↓` | попередні команди |

```bash
history | tail -3       # список введених команд
!!                      # повторити останню команду
sudo !!                 # повторити з sudo
!$                      # останній аргумент попередньої команди
!ls                     # остання команда, що починається з ls
```

## 3. Файлова система й навігація

Єдине дерево з коренем `/`. Типові каталоги: `/home` або `/Users` (домашні), `/etc` (конфігурація), `/usr/bin` (програми), `/tmp` (тимчасове), `/var/log` (логи), `/dev` (пристрої).

```bash
pwd                     # де я: поточний каталог
cd /usr/local           # абсолютний шлях (від /)
cd project/src          # відносний шлях (від поточного)
cd ..                   # на рівень вгору
cd ~                    # домашній каталог (також просто cd)
cd -                    # попередній каталог
```

| запис | значення |
|---|---|
| `.` | поточний каталог |
| `..` | батьківський |
| `~` | домашній каталог користувача |
| `~user` | домашній каталог іншого користувача |
| `-` | у `cd -` — попередній каталог |
| `.name` | прихований файл (починається з крапки) |

### ls

```bash
$ ls project
README.md  docs  src
$ ls -l project
-rw-r--r--@ 1 alex  wheel    0 Oct 21 21:17 README.md
drwxr-xr-x@ 3 alex  wheel   96 Oct 21 21:17 docs
drwxr-xr-x@ 4 alex  wheel  128 Oct 21 21:17 src
$ ls -a project | head -5
.
..
README.md
docs
src
```

Читаємо `-rw-r--r--`: перший символ — тип (`-` файл, `d` каталог, `l` посилання), далі три трійки прав `rwx` для **власника**, **групи**, **інших**. Потім: кількість посилань, власник, група, розмір (байти), дата, ім'я. (`@` на macOS — позначка розширених атрибутів.)

| опція | дія |
|---|---|
| `-l` | довгий формат |
| `-a` | включно з прихованими |
| `-h` | розміри в KB/MB (з `-l`) |
| `-t` | за часом зміни (новіші першими) |
| `-S` | за розміром (великі першими) |
| `-r` | зворотний порядок |
| `-R` | рекурсивно |
| `-d */` | лише каталоги |
| `-1` | по одному в рядку |

```bash
$ ls -ld project
drwxr-xr-x@ 5 alex  wheel  160 Oct 21 21:17 project
```

## 4. Створення, копіювання, переміщення, видалення

```bash
mkdir project                     # створити каталог
mkdir -p project/src project/docs # -p: створити всі проміжні, не лаятись, якщо вже є
touch a.txt                       # створити порожній файл (або оновити час зміни)
cp a.txt b.txt                    # копіювати
cp -r project backup              # -r: каталог рекурсивно
mv b.txt c.txt                    # перейменувати або перемістити
mv c.txt ~/Documents/             # перемістити у каталог
rm c.txt                          # видалити файл (БЕЗ кошика!)
rm -r backup                      # видалити каталог з вмістом
rm -rf backup                     # -f: без питань і помилок — небезпечно
rmdir empty_dir                   # лише порожній каталог
```

`rm` **не має кошика** — видалене не повернути. Корисні запобіжники: `rm -i` (питати), спершу `ls` того ж шаблону, `echo rm ...` для перегляду розширення.

### Посилання

```bash
$ ln -s a.txt link.txt            # символьне (м'яке) посилання — як ярлик
$ ls -l link.txt
lrwxr-xr-x ... link.txt -> a.txt
$ ln a.txt hard.txt               # жорстке посилання: друге ім'я того ж файлу
$ readlink link.txt
a.txt
```

### Шаблони (glob) і фігурні дужки

Розширюються **оболонкою** до виклику команди:

| шаблон | значення |
|---|---|
| `*` | будь-яка кількість символів (не `/`) |
| `?` | рівно один символ |
| `[abc]`, `[a-z]` | один символ із набору / діапазону |
| `{a,b,c}` | перелік (brace expansion) |
| `{1..5}`, `{a..e}` | діапазон |
| `**` | рекурсивно (потрібен `shopt -s globstar`, bash 4+) |

```bash
$ echo {a,b,c}.txt; echo {1..5}; echo {a..e}; echo file{1,2}.{js,ts}
a.txt b.txt c.txt
1 2 3 4 5
a b c d e
file1.js file1.ts file2.js file2.ts
$ ls *.txt ?.txt [ab].txt
```

Якщо шаблон нічого не знайшов, bash **залишає його як є** (`echo *.nomatch` → `*.nomatch`); `shopt -s nullglob` робить його порожнім.

## 5. Перегляд файлів

```bash
cat a.txt               # вивести весь файл
cat -n a.txt            # з номерами рядків
less big.log            # листати (пробіл, b, /пошук, q)
head -n 3 file          # перші 3 рядки
tail -n 3 file          # останні 3
tail -n +2 data.csv     # з другого рядка (пропустити заголовок)
tail -f app.log         # стежити за додаванням (Ctrl+C — вихід)
wc a.txt                # рядки, слова, байти
wc -l < a.txt           # лише кількість рядків
file a.txt              # тип вмісту: ASCII text
stat a.txt              # метадані
du -sh project          # розмір каталогу
df -h                   # вільне місце на дисках
```

```
$ wc a.txt
       2       4      18 a.txt
```

## 6. Права доступу

Кожен файл має **власника**, **групу** і три набори прав (`r` читати = 4, `w` писати = 2, `x` виконувати/входити = 1):

```
-rwxr-xr--   =   u: rwx (7)   g: r-x (5)   o: r-- (4)   →  754
```

| для каталогу | значення |
|---|---|
| `r` | бачити список файлів |
| `w` | створювати/видаляти файли в ньому |
| `x` | заходити (`cd`) і звертатись до файлів |

```bash
$ chmod 755 a.txt            # числом
$ ls -l a.txt | cut -c1-10
-rwxr-xr-x
$ chmod u-x,go-rwx a.txt     # символьно: u/g/o/a, +/-/=, r/w/x
$ ls -l a.txt | cut -c1-10
-rw-------
$ chmod +x script.sh         # зробити виконуваним
$ umask
0022                          # маска за замовчуванням: нові файли 644, каталоги 755
chown user:group file        # змінити власника (потрібен sudo)
sudo command                 # виконати від root
```

Скрипт без `x`: `./script.sh` → `Permission denied` (код 126); можна `bash script.sh`.

## 7. Пошук: find і grep

### find

```bash
find . -name "*.js"                  # за ім'ям (регістр: -iname)
find . -type f                       # лише файли; -type d — каталоги
find . -maxdepth 1 -name "*.sh"      # не глибше 1 рівня
find . -size +1M                     # більші за 1 МБ
find . -mtime -7                     # змінені за останні 7 днів
find . -newer data.csv               # новіші за файл
find . -name "*.log" -delete         # видалити знайдене
find . -name "*.js" -exec wc -l {} \;        # виконати команду для кожного
find . -name "*.js" -print0 | xargs -0 cat   # безпечно для пробілів у іменах
```

```
$ find project -type f | sort
project/README.md
project/docs/guide.txt
project/src/app.js
project/src/util.js
```

### grep

```bash
$ grep ERROR log.txt
2026-01-10 ERROR db timeout
2026-01-11 ERROR disk full
$ grep -c ERROR log.txt              # скільки рядків
2
$ grep -n -i "error" log.txt         # з номерами, без урахування регістру
2:2026-01-10 ERROR db timeout
5:2026-01-11 ERROR disk full
$ grep -v INFO log.txt               # інвертувати: рядки БЕЗ INFO
$ grep -E "ERROR|WARN" log.txt       # розширений regex (| та +)
$ grep -rl "Kyiv" . --include="*.csv"   # рекурсивно, лише імена файлів
./data.csv
$ grep -w INFO log.txt | wc -l       # ціле слово
```

| опція | дія |
|---|---|
| `-i` | ігнорувати регістр |
| `-v` | інверсія |
| `-n` | номери рядків |
| `-c` | лише кількість |
| `-l` / `-L` | імена файлів з/без збігів |
| `-r` | рекурсивно |
| `-w` / `-x` | ціле слово / цілий рядок |
| `-E` | розширений regex |
| `-A 2 -B 2 -C 2` | рядки після/до/навколо збігу |
| `-o` | лише збіг |

## 8. Обробка тексту: конвеєр утиліт

Ідея Unix: маленькі програми, що роблять одне, з'єднані **конвеєром** `|`. Дані в `data.csv`:

```
name,city,age
Olha,Kyiv,34
Ivan,Lviv,28
Maria,Kyiv,41
Petro,Odesa,28
Olha,Kyiv,34
```

```bash
$ cut -d, -f1,3 data.csv                 # поля 1 і 3, роздільник ","
$ sort -t, -k3 -n data.csv               # за 3-м полем, числово
name,city,age
Ivan,Lviv,28
Petro,Odesa,28
Olha,Kyiv,34
Olha,Kyiv,34
Maria,Kyiv,41
$ tail -n +2 data.csv | sort | uniq      # унікальні (uniq працює лише по сусідніх рядках → спершу sort)
$ tail -n +2 data.csv | sort | uniq -c   # + кількість повторів
   1 Ivan,Lviv,28
   1 Maria,Kyiv,41
   2 Olha,Kyiv,34
   1 Petro,Odesa,28
$ tail -n +2 data.csv | cut -d, -f2 | sort | uniq -c | sort -rn   # частотний аналіз
   3 Kyiv
   1 Odesa
   1 Lviv
```

Останній рядок — типова «рейтингова» схема: **вибрати → відсортувати → порахувати → відсортувати за числом**.

### awk — обробка колонок

```bash
$ awk -F, 'NR>1 {print $1, $3}' data.csv         # NR — номер рядка, $1 — поле
Olha 34
Ivan 28
...
$ awk -F, 'NR>1 {sum+=$3} END {print sum/(NR-1)}' data.csv   # середнє
33
$ awk -F, '$3 > 30' data.csv                      # умова як фільтр
```

### sed — потоковий редактор

```bash
$ sed 's/Kyiv/Київ/' data.csv | head -3      # заміна (перше входження в рядку)
$ sed 's/a/b/g' file                          # усі входження
$ sed -n '2,3p' data.csv                      # надрукувати рядки 2–3
$ sed '/Olha/d' data.csv                      # видалити рядки з Olha
$ sed -i '' 's/old/new/' file                 # редагувати на місці (macOS: -i ''; GNU: -i)
```

### Інші інструменти

```bash
echo "Hello World" | tr 'a-z' 'A-Z'       # HELLO WORLD — заміна символів
echo "a  b   c" | tr -s ' '               # a b c — стиснути повтори
echo hello | tee out.txt | wc -c          # tee: і в файл, і далі
printf "a\nb\nc\n" | xargs -I{} echo item-{}   # xargs: рядки → аргументи
diff <(printf "a\nb\n") <(printf "a\nc\n")      # порівняння
paste -d, <(echo a; echo b) <(echo 1; echo 2)   # склеїти колонки: a,1 / b,2
sort -u / sort -r / sort -n / sort -k2          # унікально / назад / числово / за полем
rev, seq 1 5, yes ok | head -3                  # утиліти-помічники
```

## 9. Потоки, перенаправлення, конвеєри

Кожна програма має три стандартні потоки:

| fd | назва | за замовч. |
|---|---|---|
| 0 | stdin | клавіатура |
| 1 | stdout | екран |
| 2 | stderr | екран (помилки) |

| запис | дія |
|---|---|
| `cmd > file` | stdout у файл (перезаписує) |
| `cmd >> file` | дописати |
| `cmd < file` | stdin з файлу |
| `cmd 2> file` | stderr у файл |
| `cmd > file 2>&1` | stdout і stderr в один файл |
| `cmd &> file` | те саме (bash) |
| `cmd 2>/dev/null` | викинути помилки |
| `cmd1 \| cmd2` | stdout першої → stdin другої |
| `cmd1 \|& cmd2` | stdout+stderr у конвеєр (bash 4+) |

```bash
$ ls nofile
ls: nofile: No such file or directory
$ ls nofile 2>/dev/null; echo "exit=$?"
exit=1
$ ls nofile 2> err.txt; cat err.txt
ls: nofile: No such file or directory
$ echo out; ls nofile; echo done > both.txt 2>&1; cat both.txt
```

**Порядок має значення:** `cmd > f 2>&1` (спершу stdout у файл, потім stderr туди ж) ≠ `cmd 2>&1 > f`.

`/dev/null` — «чорна діра»: усе записане зникає.

### Here-document і here-string

```bash
$ cat <<EOT
Hello $USER_X
second line
EOT
Hello                     # $USER_X порожня змінна — підставляється!
second line

$ cat <<'EOT'             # лапки навколо EOT вимикають підстановку
literal $HOME
EOT
literal $HOME

$ grep -c a <<< "banana"  # here-string: рядок як stdin
1
```

### Підстановка процесу й групи команд

```bash
diff <(sort a.txt) <(sort b.txt)       # <(cmd): вивід команди як файл
while read -r l; do echo "> $l"; done < <(head -2 log.txt)
( cd /tmp && pwd )                      # підоболонка: cd не змінює ваш каталог
{ echo one; echo two; } | wc -l         # група в поточній оболонці
```

### Код завершення і керування потоком виконання

```bash
$ false; echo $?     # 1
$ true;  echo $?     # 0
cmd1 && cmd2         # cmd2 лише якщо cmd1 успішна (код 0)
cmd1 || cmd2         # cmd2 лише якщо cmd1 впала
cmd1 ; cmd2          # послідовно, незалежно
! cmd                # заперечити код
cd /nonexistent 2>/dev/null || echo "cd failed"
mkdir -p d1 && cd d1 # перейти лише якщо створили
cmd &                # у фоні
```

Коди: `0` успіх, `1` загальна помилка, `2` неправильне використання, `126` не виконується (немає прав), `127` команду не знайдено, `128+N` завершено сигналом N (`130` — Ctrl+C, `143` — SIGTERM).

## 10. Змінні й розширення

### 10.1. Змінні й лапки

```bash
$ name="Alex"; echo "Hi, $name"; echo 'Hi, $name'; echo "Hi, ${name}!"
Hi, Alex
Hi, $name              # одинарні лапки — усе буквально
Hi, Alex!
$ x = 5                # ❌ ПРОБІЛИ НАВКОЛО = заборонені (це була б команда x з аргументами)
x: command not found
x=5                    # ✅
```

| лапки | поведінка |
|---|---|
| `'...'` | усе буквально, без підстановок |
| `"..."` | підставляє `$var`, `$(cmd)`, `$((...))`, `` \ ``; **не розбиває на слова й не розкриває `*`** |
| без лапок | змінна розбивається на слова за пробілами й розкриває glob |
| `\x` | екранувати один символ |

**Золоте правило: завжди беріть змінні в подвійні лапки** `"$var"`, `"$@"`, `"$(cmd)"`.

```bash
$ f="my file.txt"; touch "$f"; rm $f      # ❌ без лапок розбилось на два слова
rm: my: No such file or directory
rm: file.txt: No such file or directory
$ rm "$f"                                  # ✅
$ v=" a  b "; echo $v; echo "$v"; echo "[$v]"
a b
 a  b 
[ a  b ]
```

### 10.2. Розширення параметрів

```bash
$ v="hello world"; echo ${#v}; echo ${v:0:5}; echo ${v:6}
11
hello
world
$ u=; echo "[${u:-default}]"; echo "[${u:=set}] [$u]"; echo "[${undefined-x}]"
[default]
[set] [set]
[x]
$ p="/path/to/file.tar.gz"
$ echo ${p##*/}     # прибрати найдовший префікс */  → ім'я файлу
file.tar.gz
$ echo ${p%/*}      # прибрати найкоротший суфікс /*  → каталог
/path/to
$ echo ${p%%.*}     # найдовший суфікс .*  → без усіх розширень
/path/to/file
$ echo ${p#*.}      # найкоротший префікс *.
tar.gz
$ echo ${p/file/DOC}; echo ${p//o/0}    # заміна: перша / усі
/path/to/DOC.tar.gz
/path/t0/file.tar.gz
```

| запис | значення |
|---|---|
| `${v:-x}` | `x`, якщо v порожня або не задана |
| `${v:=x}` | те саме + присвоїти |
| `${v:?msg}` | помилка `msg` і вихід, якщо порожня |
| `${v:+x}` | `x`, якщо v задана і не порожня |
| `${#v}` | довжина |
| `${v#p}` `${v##p}` | прибрати префікс (найкоротший / найдовший) |
| `${v%p}` `${v%%p}` | прибрати суфікс |
| `${v/a/b}` `${v//a/b}` | заміна (перша / усі) |
| `${v:2:3}` | підрядок (зсув, довжина) |
| `${v^^}` `${v,,}` | великі / малі літери — **bash 4+, на macOS 3.2: bad substitution** |

### 10.3. Масиви

```bash
$ arr=(apple banana cherry)
$ echo ${arr[0]} ${arr[1]}; echo ${arr[@]}; echo ${#arr[@]}
apple banana
apple banana cherry
3
$ arr+=(date); echo ${arr[3]}; echo ${!arr[@]}      # додати; індекси
date
0 1 2 3
$ for f in "${arr[@]}"; do echo "- $f"; done        # "${arr[@]}" — кожен елемент окремо
$ echo $a            # без індексу — лише перший елемент!
```

Асоціативні масиви (`declare -A m; m[key]=val`) — лише bash 4+.

### 10.4. Спеціальні змінні

| змінна | значення |
|---|---|
| `$0` | ім'я скрипта |
| `$1 … $9`, `${10}` | позиційні аргументи |
| `$#` | кількість аргументів |
| `$@` | усі аргументи (`"$@"` — кожен окремо, правильно) |
| `$*` | усі аргументи одним рядком |
| `$?` | код завершення останньої команди |
| `$$` | PID поточної оболонки |
| `$!` | PID останнього фонового процесу |
| `$_` | останній аргумент попередньої команди |
| `$RANDOM`, `$SECONDS`, `$LINENO` | випадкове число, секунди роботи, номер рядка |

```bash
$ set -- one "two words" three; echo $#; for a in "$@"; do echo "[$a]"; done
3
[one]
[two words]
[three]
```

### 10.5. Змінні середовища, export, PATH

Змінна оболонки видима лише їй; `export` робить її змінною **середовища**, яку успадковують дочірні процеси.

```bash
$ export FOO=bar; bash -c 'echo child sees: $FOO'
child sees: bar
$ BAR=baz; bash -c 'echo child sees: [$BAR]'     # без export — дитина не бачить
child sees: []
$ FOO=1 bash -c 'echo $FOO'                       # змінна лише для однієї команди
1
$ echo $PATH | tr ":" "\n" | head -3
/usr/local/bin
/System/Cryptexes/App/usr/bin
/usr/bin
```

`PATH` — список каталогів через `:`, де оболонка шукає команди. Додати свій: `export PATH="$HOME/bin:$PATH"`. `env` / `printenv` — усі змінні середовища.

### 10.6. Підстановка команд і арифметика

```bash
$ today=$(date +%F); echo "files: $(ls *.csv *.txt | wc -l)"   # $(...) — вивід команди
$ echo `echo old-style`      # зворотні лапки: застаріло, не вкладаються
$ echo $((2+3*4)); echo $((10/3)); echo $((10%3)); echo $((2**8))
14
3
1
256
$ x=5; ((x++)); echo $x; let y=x*2; echo $y
6
12
```

Арифметика bash — лише **цілі числа**. Для дробових — `bc` (`echo "scale=2; 10/3" | bc`) або `awk`. Число з нулем на початку — вісімкове: `$(( 08 + 1 ))` → `value too great for base`.

### 10.7. Порядок розширень

Brace `{a,b}` → tilde `~` → параметри `$x`, арифметика `$((...))`, підстановка команд `$(...)` → розбиття на слова → glob `*` → видалення лапок. Саме тому розширення в лапках не розбиваються, а `echo $x` після присвоєння з `*` може розкритись у список файлів.

## 11. Умови, цикли, функції

### 11.1. test, `[ ]`, `[[ ]]`

```bash
if [ -f a.txt ]; then echo "file exists"; fi
if [ ! -d nodir ]; then echo "no dir"; else echo dir; fi
n=7; if [ $n -gt 5 ] && [ $n -lt 10 ]; then echo "5<n<10"; fi
s="abc"; if [[ $s == a* ]]; then echo "starts with a"; fi
[[ $s =~ ^a.c$ ]] && echo regex-match
```

| перевірка файлів | значення |
|---|---|
| `-e f` / `-f f` / `-d f` | існує / звичайний файл / каталог |
| `-r f -w f -x f` | читається / записується / виконується |
| `-s f` | не порожній |
| `-L f` | символьне посилання |
| `f1 -nt f2` | f1 новіший |

| рядки | числа |
|---|---|
| `-z s` порожній, `-n s` не порожній | `-eq -ne -gt -ge -lt -le` |
| `s1 = s2`, `s1 != s2` | `a -gt b` |
| `[[ ]]`: `==` з шаблоном, `=~` regex, `<`, `>` | `(( a > b ))` — арифметичне порівняння |

**`[ ]` — звичайна команда** (потрібні пробіли всередині й лапки навколо змінних); **`[[ ]]`** — ключове слово bash: розумніше (шаблони, regex, змінні без лапок безпечні, `&&`/`||` всередині), але не є POSIX.

```bash
$ x=""; [ $x = "a" ] && echo y
[: =: unary operator expected          # ❌ змінна зникла → [ = "a" ]
$ x=""; [ "$x" = "a" ] && echo y || echo no     # ✅
no
$ if [ 5 > 3 ]; then echo yes; fi       # ❌ > — це ПЕРЕНАПРАВЛЕННЯ у файл "3"! Використовуйте -gt
```

### 11.2. if / case

```bash
n=3
if [ $n -eq 1 ]; then echo one
elif [ $n -eq 3 ]; then echo three
else echo other
fi

case "banana" in
  apple)  echo A ;;
  ban*)   echo B ;;           # шаблони, | для альтернатив
  *)      echo other ;;
esac                           # → B
```

### 11.3. Цикли

```bash
for i in 1 2 3; do echo "i=$i"; done
for i in {1..3}; do echo -n "$i "; done; echo        # 1 2 3
for ((i=0;i<3;i++)); do echo "c=$i"; done
for f in *.csv; do echo "file: $f"; done              # перебір файлів — ПРАВИЛЬНО
i=0; while [ $i -lt 3 ]; do echo "w=$i"; i=$((i+1)); done
i=3; until [ $i -eq 0 ]; do echo -n "$i "; i=$((i-1)); done
for i in 1 2 3 4 5; do [ $i -eq 2 ] && continue; [ $i -eq 4 ] && break; echo $i; done   # 1 3
```

Читання файлу построково:

```bash
while IFS=, read -r name city age; do echo "$name lives in $city"; done < data.csv
```

`IFS=,` — роздільник на час `read`; `-r` — не інтерпретувати `\`; **конвеєр у `while`** (`cmd | while read`) виконується в підоболонці — змінні, задані всередині, після циклу **втрачаються** (`echo "a b" | read x; echo $x` → порожньо); читайте через `< file` або `< <(cmd)`.

**Не перебирайте `$(ls)`** — розбиває імена за пробілами:

```bash
$ for f in $(ls); do echo "[$f]"; done          # ❌
[a.txt]
[my]
[file.txt]
$ for f in *; do echo "[$f]"; done              # ✅
[a.txt]
[my file.txt]
```

### 11.4. Функції

```bash
greet() { echo "Hello, $1!"; }
greet Alex                         # Hello, Alex!
add() { local s=$(( $1 + $2 )); echo $s; }
r=$(add 2 3); echo "sum=$r"        # sum=5   (результат — через stdout)
check() { [ "$1" -gt 0 ]; }        # код завершення функції = код останньої команди
check 5 && echo positive
f() { return 3; }; f; echo "code=$?"   # code=3 — return лише для кодів 0–255
```

`local` обмежує змінну функцією (без нього змінна глобальна). Аргументи функції — `$1…`, `$@` — свої.

### 11.5. read і printf

```bash
read -r var <<< "typed"; echo "got $var"
read -p "Name: " name              # з підказкою
read -s -p "Password: " pw         # без ехо
printf "%s is %d years old\n" Olha 34
printf "%5.2f|%-6s|%05d\n" 3.14159 ab 42        #  3.14|ab    |00042
echo -e "tab\there\nnewline"       # -e: інтерпретувати \n \t
echo -n "no newline"
```

`printf` передбачуваніший за `echo` (різниця між оболонками).

## 12. Скрипти

### 12.1. Перший скрипт

```bash
#!/bin/bash
# hello.sh
name="${1:-world}"
echo "Hello, $name!"
echo "args: $# first: $1 script: $(basename "$0")"
exit 3
```

```bash
$ chmod +x hello.sh
$ ./hello.sh; echo "exit=$?"
Hello, world!
args: 0 first:  script: hello.sh
exit=3
$ ./hello.sh Alex
Hello, Alex!
$ bash hello.sh Ann Bob          # можна і без +x
```

- **Shebang** `#!/bin/bash` (або `#!/usr/bin/env bash`) — перший рядок; каже ядру, чим виконувати файл.
- Скрипт запускається в **окремому процесі**: його `cd` і змінні не діють на вашу оболонку.
- **`source file`** (або `. file`) виконує файл у **поточній** оболонці: так підключають бібліотеки/конфіги. `exit` у sourced-скрипті **закриє вашу оболонку**.

### 12.2. Суворий режим

```bash
#!/bin/bash
set -euo pipefail
```

| прапорець | ефект |
|---|---|
| `-e` | вийти при першій помилці (ненульовий код) |
| `-u` | помилка при невизначеній змінній |
| `-o pipefail` | код конвеєра = код першої впалої команди |

```bash
$ ./strict.sh
start
exit=1                     # зупинився на false
$ ./loose.sh
start
still printed              # без -e скрипт іде далі
$ ./unset.sh
before
./unset.sh: line 4: UNDEFINED_VAR: unbound variable
$ ./pipe.sh
no pipefail: 0
pipefail: 1
```

`set -e` має нюанси (не діє всередині `if`, `&&`-ланцюгів, у лівій частині `||`) — не вважайте її абсолютною гарантією.

### 12.3. Аргументи й getopts

```bash
#!/bin/bash
verbose=0; out=""
while getopts "vo:h" opt; do
  case $opt in
    v) verbose=1 ;;
    o) out="$OPTARG" ;;
    h) echo "usage: $0 [-v] [-o file] args"; exit 0 ;;
    *) exit 1 ;;
  esac
done
shift $((OPTIND-1))
echo "verbose=$verbose out=$out rest=$*"
```

```
$ ./opts.sh -v -o out.txt a b c
verbose=1 out=out.txt rest=a b c
```

Рядок `"vo:h"`: літера — прапорець, літера з `:` — прапорець зі значенням.

### 12.4. trap і прибирання

```bash
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT          # виконається при будь-якому виході
trap 'echo interrupted; exit 130' INT TERM
```

`mktemp` створює безпечний тимчасовий файл (`mktemp -d` — каталог).

### 12.5. Налагодження

```bash
bash -n script.sh        # лише перевірка синтаксису (не виконує)
bash -x script.sh        # трасування: кожна команда з підставленими значеннями
# + name=Z
# + echo 'Hello, Z!'
set -x ... set +x        # трасування лише ділянки
shellcheck script.sh     # статичний аналізатор — знаходить типові помилки (brew install shellcheck)
```

### 12.6. Шаблон надійного скрипта

```bash
#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() { echo "usage: $0 <input>" >&2; exit 2; }
[ $# -eq 1 ] || usage

main() {
  local input="$1"
  [ -f "$input" ] || { echo "no such file: $input" >&2; exit 1; }
  # ... робота ...
}
main "$@"
```

Помилки пишіть у **stderr** (`>&2`), результат — у stdout; повертайте осмислені коди.

## 13. Процеси, сигнали, фонові задачі

```bash
ps aux                      # усі процеси (a — всіх користувачів, u — детально, x — без терміналу)
ps -o pid=,comm= -p $$      # поточна оболонка
top / htop                  # живий монітор
pgrep -f nginx              # PID за шаблоном
kill 1234                   # SIGTERM (ввічливо попросити завершитись)
kill -9 1234                # SIGKILL (силою, без прибирання — останній засіб)
killall name / pkill name
```

| сигнал | номер | значення |
|---|---|---|
| SIGINT | 2 | Ctrl+C |
| SIGTERM | 15 | стандартне завершення |
| SIGKILL | 9 | не перехоплюється |
| SIGHUP | 1 | закрито термінал / перечитати конфіг |
| SIGTSTP | 20 | Ctrl+Z (призупинити) |

```bash
$ sleep 30 &                # & — запуск у фоні
$ jobs
[1]+  Running                 sleep 30 &
$ kill %1                   # %1 — номер задачі
$ sleep 30 & pid=$!; kill $pid; wait $pid; echo "exit=$?"
exit=143                    # 128 + 15
fg %1 / bg %1               # повернути на передній план / продовжити у фоні
nohup cmd > out.log 2>&1 &  # не вмирати після закриття термінала
(sleep 0.2; echo bg-done) & echo foreground; wait     # wait — дочекатись фонових
time sleep 0.1              # real / user / sys
```

## 14. Архіви, мережа, система

```bash
tar -czf backup.tgz project        # c створити, z gzip, f файл
tar -tzf backup.tgz                # t — список вмісту
tar -xzf backup.tgz -C out         # x — розпакувати (у каталог out)
gzip -k a.txt; gunzip -c a.txt.gz  # k — зберегти оригінал
zip -r p.zip project; unzip -l p.zip

curl http://example.com                     # завантажити сторінку у stdout
curl -s -o /dev/null -w "%{http_code}\n" URL   # лише код відповіді (200)
curl -s -I URL | head -1                    # лише заголовки: HTTP/1.1 200 OK
curl -X POST -H "Content-Type: application/json" -d '{"a":1}' URL
wget URL                                    # завантажити файл
ping -c 1 host                              # доступність
ssh user@host "ls"                          # віддалений термінал / команда
scp file user@host:/path/                   # копіювати по ssh
rsync -av src/ user@host:dst/               # синхронізація

uname -s; uname -m           # Darwin / arm64; ОС і архітектура
whoami; id; hostname
date +%F; date +"%Y-%m-%d %H:%M:%S"        # формат дати
date -u -r 0                                # macOS: епоха; Linux: date -u -d @0
df -h; du -sh *; free -h (Linux)
which, whereis, basename /a/b/f.txt (f.txt), dirname /a/b/f.txt (/a/b), realpath .
seq 1 5; seq 2 2 10 | paste -sd+ - | bc     # 30 — сума парних
yes ok | head -3
```

**cron** — планувальник: `crontab -e`, рядок `хв год день міс день_тижня команда`, наприклад `0 3 * * * /home/me/backup.sh` — щодня о 3:00.

## 15. Налаштування оболонки

| файл | коли читається |
|---|---|
| `~/.bash_profile` (або `~/.profile`) | **login**-оболонка (вхід по ssh, macOS Terminal) |
| `~/.bashrc` | **інтерактивна не-login** оболонка (більшість вікон Linux) |
| `~/.bash_logout` | при виході |
| `~/.zshrc`, `~/.zprofile` | аналоги для zsh |

Типово `~/.bash_profile` містить `source ~/.bashrc`, щоб налаштування були єдині.

```bash
alias ll='ls -la'            # скорочення; тимчасово: unalias ll
alias gs='git status'
export EDITOR=vim
export PATH="$HOME/bin:$PATH"
PS1='\u@\h:\w\$ '            # вигляд запрошення: користувач@хост:каталог$
shopt -s histappend          # додавати історію, а не перезаписувати
HISTSIZE=10000
```

Alias діє лише в інтерактивній оболонці й не в скриптах; для складнішого — функція в `.bashrc`. Дотфайли зручно зберігати в git-репозиторії.

## 16. Типові помилки й безпека

| помилка | наслідок | як правильно |
|---|---|---|
| `x = 5` | `x: command not found` | `x=5` без пробілів |
| `rm $f` | розбиття за пробілами | `rm "$f"` |
| `for f in $(ls)` | ламається на пробілах | `for f in *` |
| `[ $x = a ]` при порожній `x` | `unary operator expected` | `[ "$x" = a ]` або `[[ ... ]]` |
| `[ 5 > 3 ]` | створює файл `3`, завжди true | `[ 5 -gt 3 ]` або `(( 5 > 3 ))` |
| `rm -rf "$DIR/"` при порожній `DIR` | `rm -rf /` | `${DIR:?}` або `set -u`; перевіряти змінну |
| `cd dir; rm *` | якщо cd не вдався — видалить не там | `cd dir && rm *` або `cd dir \|\| exit 1` |
| `cat f > f` | файл обнулено | окремий вихідний файл / `sponge` |
| `echo "a b" \| read x` | змінна втрачається (підоболонка) | `read x <<< "a b"` |
| `$(( 08 + 1 ))` | вісімкова помилка | `$(( 10#08 + 1 ))` |
| `cmd1 \| cmd2` падіння `cmd1` ігнорується | тихі помилки | `set -o pipefail` |
| `source script.sh` з `exit` | закрито вашу оболонку | запускати окремо |
| `sudo rm -rf` без перегляду | непоправно | спершу `echo rm ...` / `ls` |
| `echo $var` незабраний у лапки | glob-розкриття, втрата пробілів | `echo "$var"` |

Ще правила:

- **не парсьте вивід `ls`** — використовуйте glob або `find ... -print0 | xargs -0`;
- **секрети** (паролі, токени) не передавайте аргументами (видно в `ps`) і не пишіть у історію;
- перевіряйте скрипти `shellcheck`;
- перед небезпечною дією — `echo` або `-n` (dry run);
- не запускайте `curl ... | bash` з невідомих джерел.

## 17. Шпаргалка

| завдання | команда |
|---|---|
| де я / перейти | `pwd`, `cd dir`, `cd -`, `cd ~` |
| список | `ls -la`, `ls -lh`, `ls -t` |
| створити | `mkdir -p`, `touch` |
| копіювати/перемістити/видалити | `cp -r`, `mv`, `rm -r` |
| вміст | `cat`, `less`, `head`, `tail -f`, `wc -l` |
| знайти файл | `find . -name "*.js"` |
| знайти текст | `grep -rn "text" .` |
| колонки | `cut -d, -f1`, `awk -F, '{print $1}'` |
| сортування й підрахунок | `sort \| uniq -c \| sort -rn` |
| заміна | `sed 's/a/b/g'`, `tr` |
| права | `chmod +x`, `chmod 644`, `chown` |
| перенаправлення | `>`, `>>`, `<`, `2>`, `2>&1`, `\|` |
| змінні | `x=1`, `"$x"`, `${x:-d}`, `$(cmd)`, `$((a+b))` |
| умови | `[ -f f ]`, `[[ $s == a* ]]`, `case` |
| цикли | `for f in *; do ... done`, `while read -r l; do ... done < file` |
| процеси | `ps aux`, `kill`, `cmd &`, `jobs`, `wait` |
| скрипт | `#!/bin/bash`, `set -euo pipefail`, `chmod +x`, `trap` |
| архів | `tar -czf` / `tar -xzf` |
| мережа | `curl`, `ssh`, `scp` |

## Підсумок

- Термінал — вікно, оболонка (bash/zsh) — програма, що читає команди; bash виконує рядок так: розбір → розширення → пошук команди (alias, функція, builtin, `$PATH`) → процес → код завершення `$?`.
- Команда = ім'я + опції + аргументи; довідка: `man`, `--help`, `help`, `type`.
- Файлова система — одне дерево; `cd`, `ls`, `mkdir -p`, `cp -r`, `mv`, `rm` (без кошика!), символьні посилання `ln -s`.
- Права: `rwx` для власника/групи/інших, числа 4/2/1, `chmod`, `umask`; виконуваний скрипт потребує `x` і shebang.
- `find` шукає файли, `grep` — текст; конвеєр з `cut`, `sort`, `uniq`, `awk`, `sed`, `tr`, `xargs` розв'язує більшість задач обробки тексту.
- Потоки 0/1/2: `>`, `>>`, `<`, `2>`, `2>&1`, `|`, here-doc `<<`, here-string `<<<`, `<(cmd)`; `&&`, `||`, `;`; код 0 = успіх.
- Змінні без пробілів у `=`; **подвійні лапки навколо `"$var"`**; розширення параметрів `${v:-d}`, `${v%.*}`, `${v##*/}`; `$(cmd)`, `$((expr))`; `export` для дочірніх процесів.
- `[ ]` — це команда (пробіли й лапки!), `[[ ]]` — розумніше; `-gt` для чисел, `>` — перенаправлення; цикли `for … in *`, `while read -r`; не перебирайте `$(ls)`.
- Скрипти: shebang, `chmod +x`, `"$@"`, `getopts`, `set -euo pipefail`, `trap … EXIT`, `local`, помилки в stderr, `shellcheck`; `source` виконує в поточній оболонці.
- Процеси: `&`, `jobs`, `fg/bg`, `kill` (SIGTERM, потім SIGKILL), `wait`, `nohup`; архіви `tar`, мережа `curl/ssh/scp`.
- Макос має bash 3.2 (без `${v^^}`, асоціативних масивів, `globstar`) і zsh за замовчуванням: для переносимості пишіть POSIX або явно вказуйте версію.

## Задачі для закріплення

46 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Команди виконуйте в bash у порожній тимчасовій директорії; утиліти — BSD-варіанти з macOS.

### Рівень 1. Основи

**1.** Що виведе `echo` з лапками, без лапок та з `-n`?

```bash
echo "a   b"
echo a   b
echo -n x; echo y
```

**2.** Яка різниця між одинарними та подвійними лапками?

```bash
name=World
echo "Hi $name"
echo 'Hi $name'
```

**3.** Що виведе `pwd` після `cd` у підкаталог та `cd -`?

```bash
mkdir -p a/b
cd a/b
basename "$PWD"
cd ..
basename "$PWD"
```

**4.** Створіть вкладені директорії та виведіть дерево через `find`.

```bash
mkdir -p proj/src proj/docs
touch proj/src/a.js proj/src/b.js proj/docs/readme.md
find proj | sort
```

**5.** Що робить `cp -r` та `mv` (перейменування)?

```bash
mkdir d; echo data > d/f.txt
cp -r d d2
mv d2/f.txt d2/g.txt
ls d d2
```

**6.** `rm` безпечно: що станеться з `rm -i` у неінтерактивному режимі та з `rm -f`?

```bash
touch a b
rm -f a missing
ls
```

**7.** Виведіть перші та останні рядки файлу (`head`, `tail`).

```bash
seq 1 10 > n.txt
head -n 3 n.txt
tail -n 2 n.txt
```

**8.** Підрахунок рядків, слів і байтів через `wc`.

```bash
printf 'one two\nthree\n' > t.txt
wc -l < t.txt | tr -d ' '
wc -w < t.txt | tr -d ' '
wc -c < t.txt | tr -d ' '
```

**9.** Права доступу: `chmod 640` та перегляд у числовому вигляді.

```bash
touch f
chmod 640 f
stat -f '%Lp' f
chmod u+x f
stat -f '%Lp' f
```

**10.** Символічні права `ls -l` для щойно створеного файлу з `umask 022`.

```bash
umask 022
touch f
ls -l f | cut -c1-10
```

**11.** `grep`: пошук із номерами рядків та без урахування регістру.

```bash
printf 'Alpha\nbeta\nALPHA two\n' > f
grep -n -i alpha f
```

**12.** `grep -v` та `-c`.

```bash
printf 'a\nb\na\n' > f
grep -c a f
grep -v a f
```

### Рівень 2. Деталі й поведінка

**13.** `grep -E` розширені регулярні вирази та `-o`.

```bash
echo 'id=42 id=7 x=9' | grep -oE 'id=[0-9]+'
```

**14.** `find` за іменем і типом.

```bash
mkdir -p a/b; touch a/x.txt a/b/y.txt a/b/z.log
find . -type f -name '*.txt' | sort
```

**15.** `find` із `-exec`.

```bash
mkdir d; touch d/a.tmp d/b.tmp d/c.keep
find d -name '*.tmp' -exec rm {} \;
ls d
```

**16.** Конвеєр: `sort | uniq -c | sort -rn`.

```bash
printf 'b\na\nb\nc\nb\na\n' | sort | uniq -c | sort -rn | sed 's/^ *//'
```

**17.** `cut` та `awk` для стовпців.

```bash
printf 'ann 30 kyiv\nbob 25 lviv\n' > p.txt
cut -d' ' -f1,3 p.txt
awk '{ s += $2 } END { print s }' p.txt
```

**18.** `sed`: заміна та видалення рядків.

```bash
printf 'foo bar\nfoo baz\nkeep\n' | sed -e 's/foo/FOO/' -e '/keep/d'
```

**19.** `tr`: зміна регістру та видалення символів.

```bash
echo 'Hello, World' | tr 'a-z' 'A-Z'
echo 'a1b2c3' | tr -d '0-9'
```

**20.** Перенаправлення: `>` перезаписує, `>>` додає.

```bash
echo one > f
echo two >> f
echo three > f
cat f
```

**21.** Потоки: stdout та stderr окремо.

```bash
ls nonexistent 2>/dev/null; echo "exit=$?"
ls nonexistent 2>&1 | wc -l | tr -d ' '
```

**22.** `tee` та `here-doc`.

```bash
cat <<EOF | tee out.txt | wc -l | tr -d ' '
line1
line2
EOF
cat out.txt
```

**23.** Змінні: присвоєння, експорт та підоболонка.

```bash
x=1
export y=2
( x=10; y=20; echo $x $y )
echo $x $y
bash -c 'echo "[$x] [$y]"'
```

**24.** Розширення параметрів: значення за замовчуванням та обрізання.

```bash
unset v
echo "${v:-default}"
f=archive.tar.gz
echo "${f%.gz}" "${f%%.*}" "${f#*.}" "${#f}"
```

### Рівень 3. Нюанси та пастки

**25.** Арифметика: `$(( ))` та цілочисельне ділення.

```bash
echo $((7 / 2)) $((7 % 3)) $((2 ** 10)) $((-7 / 2))
```

**26.** Підстановка команд та вкладеність.

```bash
echo "count: $(printf 'a\nb\nc\n' | wc -l | tr -d ' ')"
echo "$(echo $(echo deep))"
```

**27.** Фігурні дужки (brace expansion) і glob.

```bash
touch a1 a2 b1
echo {x,y}{1,2}
echo a*
echo {1..5}
```

**28.** Умови: `[ ]`, `[[ ]]`, коди завершення.

```bash
[ -f nofile ]; echo $?
touch f; [ -f f ]; echo $?
[[ abc == a* ]] && echo match
test 5 -gt 3 && echo yes
```

**29.** Цикл `for` по файлах та по діапазону.

```bash
touch a.txt b.txt
for f in *.txt; do echo "file $f"; done
for i in 1 2 3; do printf "%s " $i; done; echo
```

**30.** Цикл `while read`.

```bash
printf 'a 1\nb 2\n' | while read name n; do echo "$name=$((n * 10))"; done
```

**31.** Функції та `return`.

```bash
add() { echo $(($1 + $2)); }
check() { [ "$1" -gt 0 ] && return 0 || return 3; }
add 2 3
check 5; echo $?
check -1; echo $?
```

**32.** `case`.

```bash
for x in apple kiwi pear; do
  case $x in
    a*) echo "$x: starts with a" ;;
    kiwi|pear) echo "$x: kiwi or pear" ;;
  esac
done
```

**33.** Позиційні параметри скрипта: `$#`, `$@`, `shift`.

```bash
cat > s.sh <<'EOF'
echo "n=$#"
echo "first=$1"
shift
echo "rest=$@"
EOF
bash s.sh a b c
```

**34.** `set -e` і `set -u`: що станеться при помилці?

```bash
bash -c 'set -e; false; echo not-reached'; echo "code=$?"
bash -c 'set -u; echo $undefined_var' 2>&1 | sed 's/^.*undefined_var/undefined_var/'
```

**35.** Код завершення конвеєра: `pipefail`.

```bash
false | true; echo $?
set -o pipefail
false | true; echo $?
```

**36.** `&&` та `||`: ланцюжки команд.

```bash
true && echo A
false && echo B
false || echo C
true || echo D
```

### Рівень 4. Практика

**37.** Фонові задачі: `&`, `wait`, `$!`.

```bash
sleep 0.1 &
pid=$!
wait $pid; echo "waited code=$?"
```

**38.** Сигнали: `trap` на EXIT.

```bash
trap 'echo cleanup' EXIT
echo working
```

**39.** Архіви: `tar` створення та перегляд, `gzip`.

```bash
mkdir d; echo hi > d/f
tar -czf a.tgz d
tar -tzf a.tgz | sort
rm -rf d
tar -xzf a.tgz
cat d/f
```

**40.** `xargs` та `printf`.

```bash
printf '1\n2\n3\n' | xargs -n1 echo item
printf 'a b c' | xargs -n2
```

**41.** `sort` числовий проти лексикографічного.

```bash
printf '10\n9\n100\n' | sort
printf '10\n9\n100\n' | sort -n
```

**42.** Небезпека: невдалий `rm -rf $dir/*` при порожній змінній — як захиститись `${dir:?}`?

```bash
unset dir
( rm -rf "${dir:?dir is empty}/"* ) 2>&1 | sed 's/^.*: dir:/bash: dir:/'; echo "code=${PIPESTATUS[0]}"
```

**43.** Пробіли в іменах файлів: ітерація без лапок та з лапками.

```bash
touch 'my file.txt'
for f in $(ls); do echo "[$f]"; done
for f in *; do echo "[$f]"; done
```

**44.** Що таке оболонка (shell) і чим вона відрізняється від термінала?

**45.** Що означає код завершення 0 і ненульові значення?

**46.** Чим `>` відрізняється від `|`?

### Відповіді

1. Вивід:

   ```text
   a   b
   a b
   xy
   ```

2. Вивід:

   ```text
   Hi World
   Hi $name
   ```

3. Вивід:

   ```text
   b
   a
   ```

4. Вивід:

   ```text
   proj
   proj/docs
   proj/docs/readme.md
   proj/src
   proj/src/a.js
   proj/src/b.js
   ```

5. Вивід:

   ```text
   d:
   f.txt
   
   d2:
   g.txt
   ```

6. `b`
7. Вивід:

   ```text
   1
   2
   3
   9
   10
   ```

8. Вивід:

   ```text
   2
   3
   14
   ```

9. Вивід:

   ```text
   640
   740
   ```

10. `-rw-r--r--`
11. Вивід:

   ```text
   1:Alpha
   3:ALPHA two
   ```

12. Вивід:

   ```text
   2
   b
   ```

13. Вивід:

   ```text
   id=42
   id=7
   ```

14. Вивід:

   ```text
   ./a/b/y.txt
   ./a/x.txt
   ```

15. `c.keep`
16. Вивід:

   ```text
   3 b
   2 a
   1 c
   ```

17. Вивід:

   ```text
   ann kyiv
   bob lviv
   55
   ```

18. Вивід:

   ```text
   FOO bar
   FOO baz
   ```

19. Вивід:

   ```text
   HELLO, WORLD
   abc
   ```

20. `three`
21. Вивід:

   ```text
   exit=1
   1
   ```

22. Вивід:

   ```text
   2
   line1
   line2
   ```

23. Вивід:

   ```text
   10 20
   1 2
   [] [2]
   ```

24. Вивід:

   ```text
   default
   archive.tar archive tar.gz 14
   ```

25. `3 1 1024 -3`
26. Вивід:

   ```text
   count: 3
   deep
   ```

27. Вивід:

   ```text
   x1 x2 y1 y2
   a1 a2
   1 2 3 4 5
   ```

28. Вивід:

   ```text
   1
   0
   match
   yes
   ```

29. Вивід:

   ```text
   file a.txt
   file b.txt
   1 2 3 
   ```

30. Вивід:

   ```text
   a=10
   b=20
   ```

31. Вивід:

   ```text
   5
   0
   3
   ```

32. Вивід:

   ```text
   apple: starts with a
   kiwi: kiwi or pear
   pear: kiwi or pear
   ```

33. Вивід:

   ```text
   n=3
   first=a
   rest=b c
   ```

34. Вивід:

   ```text
   code=1
   undefined_var: unbound variable
   ```

35. Вивід:

   ```text
   0
   1
   ```

36. Вивід:

   ```text
   A
   C
   ```

37. `waited code=0`
38. Вивід:

   ```text
   working
   cleanup
   ```

39. Вивід:

   ```text
   d/
   d/f
   hi
   ```

40. Вивід:

   ```text
   item 1
   item 2
   item 3
   a b
   c
   ```

41. Вивід:

   ```text
   10
   100
   9
   9
   10
   100
   ```

42. Вивід:

   ```text
   bash: dir: dir is empty
   code=1
   ```

43. Вивід:

   ```text
   [my]
   [file.txt]
   [my file.txt]
   ```

44. Термінал — вікно, що відображає текст і передає ввід; оболонка (bash, zsh) — програма, що інтерпретує команди й запускає процеси
45. 0 — успіх, будь-яке інше число — помилка; код останньої команди доступний у `$?`
46. `>` перенаправляє вивід у файл, `|` передає вивід однієї команди на ввід іншої
