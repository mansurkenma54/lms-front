// problems.js — ACMP problems dataset (client-side)
window.PROBLEMS = [
  {
    id: 1, title: "Айнымалы мәнді енгізу/шығару", difficulty:"easy", points:5,
    statement: "Бір бүтін санды енгізіп, оны шығарыңыз.",
    input_format: "Бір бүтін n саны",
    output_format: "n санының өзі",
    examples: [{ input:"5", output:"5" }],
    test_cases: [{ input:"5", expected_output:"5" }, { input:"-3", expected_output:"-3" }, { input:"0", expected_output:"0" }],
    hint_small: "Есепті шығару үшін алдымен санды оқып алу қажет. Ол үшін енгізу функциясын (input) қолданып, оны бүтін санға (int) айналдырыңыз.",
    hint_big: "Мысалы, `n = int(input())` деп жазу арқылы сіз енгізілген мәнді n айнымалысына сақтайсыз. Содан кейін `print(n)` көмегімен сол санды экранға шығара аласыз."
  },
  {
    id: 2, title: "Екі санның қосындысы", difficulty:"easy", points:5,
    statement: "Екі бүтін санның қосындысын табыңыз.",
    input_format: "Бір жолда екі бүтін a және b",
    output_format: "a + b мәні",
    examples: [{ input:"3 5", output:"8" }, { input:"-2 7", output:"5" }],
    test_cases: [
      { input:"3 5", expected_output:"8" }, { input:"-2 7", expected_output:"5" },
      { input:"0 0", expected_output:"0" }, { input:"100 200", expected_output:"300" }
    ],
    hint_small: "Бір жолдағы екі санды бос орын арқылы бөліп оқу үшін .split() әдісін және оларды бүтін санға айналдыру үшін map() функциясын қолданыңыз.",
    hint_big: "Кодты осылай жазу ыңғайлы: `a, b = map(int, input().split())`. Осыдан кейін олардың қосындысын `print(a + b)` деп экранға шығарамыз."
  },
  {
    id: 3, title: "Максимум екі санның ішінен", difficulty:"easy", points:5,
    statement: "Екі санның ең үлкенін шығарыңыз.",
    input_format: "Бір жолда a және b",
    output_format: "max(a, b)",
    examples: [{ input:"3 7", output:"7" }],
    test_cases: [{ input:"3 7", expected_output:"7" }, { input:"10 5", expected_output:"10" }, { input:"-1 -5", expected_output:"-1" }],
    hint_small: "Екі санның үлкенін табу үшін кіріктірілген Python-ның max() функциясын немесе шартты if-else операторын қолдануға болады.",
    hint_big: "Алдымен сандарды оқыңыз: `a, b = map(int, input().split())`. Ал нәтижені шығару үшін қиын код жазбай-ақ `print(max(a, b))` жазсаңыз жеткілікті."
  },
  {
    id: 4, title: "1-ден N-ге дейін қосынды", difficulty:"easy", points:8,
    statement: "1-ден N-ге дейінгі (N қосылады) барлық натурал сандардың қосындысын табыңыз.",
    input_format: "Бір бүтін N (1 ≤ N ≤ 10000)",
    output_format: "1 + 2 + ... + N мәні",
    examples: [{ input:"5", output:"15" }, { input:"10", output:"55" }],
    test_cases: [{ input:"5", expected_output:"15" }, { input:"10", expected_output:"55" }, { input:"1", expected_output:"1" }, { input:"100", expected_output:"5050" }],
    hint_small: "Бұл есепті екі жолмен шығаруға болады: for циклы арқылы әр санды қосып шығу немесе арифметикалық прогрессияның қосынды формуласын қолдану.",
    hint_big: "Ең жылдам шешім формуламен шығару: N санын оқып алғаннан кейін, `print(N * (N + 1) // 2)` арқылы бірден жауапты табу немесе Python-да `print(sum(range(1, N + 1)))`."
  },
  {
    id: 5, title: "Жұп/Тақ сан", difficulty:"easy", points:5,
    statement: "Санның жұп не тақ екенін анықтаңыз. Жұп болса 'even', тақ болса 'odd' шығарыңыз.",
    input_format: "Бір бүтін n",
    output_format: "'even' немесе 'odd'",
    examples: [{ input:"4", output:"even" }, { input:"7", output:"odd" }],
    test_cases: [{ input:"4", expected_output:"even" }, { input:"7", expected_output:"odd" }, { input:"0", expected_output:"even" }, { input:"-3", expected_output:"odd" }],
    hint_small: "Қандай да бір санның жұп не тақ екенін анықтау үшін сол санды 2-ге бөлгендегі қалдықты (%) тексеру қажет.",
    hint_big: "n айнымалысын алған соң, модульмен бөлу `%` көмегімен тексеріңіз: егер `n % 2 == 0` болса, жұп (even). Кодтың қысқаша нұсқасы: `print('even' if n % 2 == 0 else 'odd')`."
  },
  {
    id: 6, title: "Прости сан тексеру", difficulty:"medium", points:12,
    statement: "Берілген натурал санның жай (прости) сан екенін тексеріңіз. Жай сан болса 'YES', болмаса 'NO' шығарыңыз.",
    input_format: "Бір натурал n (2 ≤ n ≤ 10^6)",
    output_format: "'YES' немесе 'NO'",
    examples: [{ input:"7", output:"YES" }, { input:"12", output:"NO" }, { input:"2", output:"YES" }],
    test_cases: [{ input:"7", expected_output:"YES" }, { input:"12", expected_output:"NO" }, { input:"2", expected_output:"YES" }, { input:"1000003", expected_output:"YES" }],
    hint_small: "Жай сан — тек 1-ге және өзіне ғана бөлінетін сан. Кодты оңтайландыру (тайм лимит алмау) үшін 2-ден бастап сол санның квадрат түбіріне (sqrt) дейін ғана тексеріңіз.",
    hint_big: "`import math` арқылы `for i in range(2, int(math.sqrt(n)) + 1):` циклін құрыңыз. Егер тексерілетін n саны `i`-ге қалдықсыз бөлiнсе, онда 'NO' шығарып тоқтатыңыз. Бүкіл циклдан өтсе 'YES' шығарыңыз."
  },
  {
    id: 7, title: "Матрицаны шығару", difficulty:"medium", points:15,
    statement: "N×M матрицасын (кірістен) оқып, транспозициясын шығарыңыз.",
    input_format: "Бірінші жолда N M. Келесі N жолда M бүтін сан.",
    output_format: "M×N матрица (транспоз)",
    examples: [{ input:"2 3\n1 2 3\n4 5 6", output:"1 4\n2 5\n3 6" }],
    test_cases: [{ input:"2 3\n1 2 3\n4 5 6", expected_output:"1 4\n2 5\n3 6" }],
    hint_small: "Матрицаны тізім ішіндегі тізім (list of lists) ретінде оқып алу қажет. Оны транспозициялау (жолдарды бағанға ауыстыру) үшін zip функциясы көмекке келеді.",
    hint_big: "N мен M санын алып, матрицаны циклмен оқыңыз: `matrix = [list(map(int, input().split())) for _ in range(N)]`. Транспозиция жасап, басып шығарудың тамаша жолы: `for col in zip(*matrix): print(*col)`."
  },
  {
    id: 8, title: "Фибоначчи сандары", difficulty:"medium", points:10,
    statement: "N-ші Фибоначчи санын шығарыңыз. F(1)=1, F(2)=1, F(n)=F(n-1)+F(n-2)",
    input_format: "Бір бүтін N (1 ≤ N ≤ 40)",
    output_format: "N-ші Фибоначчи саны",
    examples: [{ input:"7", output:"13" }, { input:"1", output:"1" }],
    test_cases: [{ input:"7", expected_output:"13" }, { input:"1", expected_output:"1" }, { input:"10", expected_output:"55" }, { input:"20", expected_output:"6765" }],
    hint_small: "Үлкен N сандары кезінде әдеттегі рекурсия уақыттан ұтылып (Time Limit) қалуы мүмкін. Сондықтан цикл арқылы (динамикалық программалау) сандарды жинақтаған жөн.",
    hint_big: "Бастапқы ұяшықтар `a = 0`, `b = 1` болсын. Осыларды N рет қайталанатын цикл ішінде жаңартыңыз: `a, b = b, a + b`. Ал цикл біткен соң `a` мәнін нәтиже ретінде шығарыңыз."
  },
  {
    id: 9, title: "Сандарды сұрыптау", difficulty:"medium", points:12,
    statement: "N санды өсу ретімен сұрыптап шығарыңыз.",
    input_format: "Бірінші жолда N. Екінші жолда N бүтін сан.",
    output_format: "Өсу ретімен орналасқан сандар, бір жолда бос кеш арқылы",
    examples: [{ input:"5\n3 1 4 1 5", output:"1 1 3 4 5" }],
    test_cases: [{ input:"5\n3 1 4 1 5", expected_output:"1 1 3 4 5" }, { input:"3\n9 2 7", expected_output:"2 7 9" }],
    hint_small: "Кірістегі N сандарды оқып, оларды тізім қатарына (list) сақтағаннан кейін Python-ның кіріктірілген `sorted()` функциясын немесе `.sort()` әдісін қолданыңыз.",
    hint_big: "Алдымен тізімге оқыңыз: `nums = list(map(int, input().split()))`. Сұрыптау мен бос орын арқылы экранға шығаруды бір жолда орындауға болады: `print(*sorted(nums))`."
  },
  {
    id: 10, title: "Ең үлкен жалпы бөлгіш (ЕЖБ)", difficulty:"medium", points:12,
    statement: "Екі натурал санның ең үлкен жалпы бөлгішін табыңыз.",
    input_format: "Бір жолда a және b",
    output_format: "gcd(a, b)",
    examples: [{ input:"48 18", output:"6" }, { input:"100 75", output:"25" }],
    test_cases: [{ input:"48 18", expected_output:"6" }, { input:"100 75", expected_output:"25" }, { input:"7 13", expected_output:"1" }],
    hint_small: "ЕЖБ табудың жылдам жолы — `math` модульінде дайын тұрған `gcd` функциясын шақыру немесе Евклидтің классикалық алгоритмін қолдану (q = a % b).",
    hint_big: "Дайын модульді қолданамыз: `import math`, одан кейін енгізілген екі `a` мен `b` сандары үшін тікелей `print(math.gcd(a, b))` шығара салыңыз."
  },
  {
    id: 11, title: "Сандар үшбұрышы", difficulty:"medium", points:15,
    statement: "N жолдан тұратын үшбұрышты шығарыңыз (1-ші жолда 1 жұлдыз, 2-ші жолда 2 жұлдыз, т.б.)",
    input_format: "N (1 ≤ N ≤ 50)",
    output_format: "N жолда тиісті '*' саны",
    examples: [{ input:"4", output:"*\n**\n***\n****" }],
    test_cases: [{ input:"4", expected_output:"*\n**\n***\n****" }, { input:"1", expected_output:"*" }],
    hint_small: "N саны берілгеннен кейін, 1-ден N-ге дейін for циклін құрыңыз. Әрбір циклде (қадамда) i санына тең жұлдызша '*' экранға шығуы тиіс.",
    hint_big: "`for i in range(1, N + 1):` деп бастап, жұлдызшаны жол санына көбейтіп шығарамыз: `print('*' * i)`. Бұл Python-дағы барынша қысқа әрі тиімді тәсіл."
  },
  {
    id: 12, title: "Палиндром тексеру", difficulty:"medium", points:10,
    statement: "Берілген сөздің палиндром екенін тексеріңіз. 'YES' немесе 'NO' шығарыңыз.",
    input_format: "Бір сөз (бос кеш жоқ, тек кіші латын әріптер)",
    output_format: "'YES' немесе 'NO'",
    examples: [{ input:"racecar", output:"YES" }, { input:"hello", output:"NO" }],
    test_cases: [{ input:"racecar", output:"YES" }, { input:"hello", expected_output:"NO" }, { input:"a", expected_output:"YES" }, { input:"abba", expected_output:"YES" }],
    hint_small: "Сөзді кері оқығанда да сол қалпындағыдай оқылатын сөздерді палиндром дейді. Жолды (string) кері аудару мүмкіндігін тілім [::-1] көмегімен жасаңыз.",
    hint_big: "Егер `s == s[::-1]` болса, онда оңнан солға, солдан оңға қарай бірдей оқылғаны. Мұндай кезде 'YES' шығарыңыз. Шарттық экспрессия: `print('YES' if s == s[::-1] else 'NO')`."
  },
  {
    id: 13, title: "Цезарь шифрі", difficulty:"hard", points:20,
    statement: "Цезарь шифрі бойынша мәтінді шифрлаңыз. Әр кіші латын әрпін k орынға алға жылжытыңыз. Басқа таңбалар өзгермейді.",
    input_format: "Бірінші жолда k (0 ≤ k ≤ 25). Екінші жолда мәтін.",
    output_format: "Шифрланған мәтін",
    examples: [{ input:"3\nhello world", output:"khoor zruog" }],
    test_cases: [{ input:"3\nhello world", expected_output:"khoor zruog" }, { input:"0\nabc", expected_output:"abc" }],
    hint_small: "Әріптердің (a-z) ASCII нөмірін алу үшін `ord()` функциясын орталықтандырыңыз, ал жаңа кодтан әріп жасау үшін `chr()` қолданылады.",
    hint_big: "Әрбір символ үшін: алдымен 0-ден 25-ке дейінгі диапазонға келтіреміз: `index = ord(c) - ord('a')`. Оған k-ны қосып (% 26 бөлеміз). Ол әріп болса: `result += chr((орд(c) - ord('a') + k) % 26 + ord('a'))`."
  },
  {
    id: 14, title: "Арифметикалық орта", difficulty:"easy", points:8,
    statement: "N санның арифметикалық ортасын 2 ондықпен шығарыңыз.",
    input_format: "N, одан кейін N бүтін сан",
    output_format: "Орта, 2 ондық",
    examples: [{ input:"4\n1 2 3 4", output:"2.50" }],
    test_cases: [{ input:"4\n1 2 3 4", expected_output:"2.50" }, { input:"2\n5 7", expected_output:"6.00" }],
    hint_small: "Барлық сандардың қосындысын олардың жалпы санына бөлу – арифметикалық орта. Нәтижені дөңгелектеп көрсету үшін f-strings пайдаланған жөн.",
    hint_big: "Жалпы тізімнің қосындысын `sum(nums)` арқылы, ал элемент санын `len(nums)` арқылы аласыз. Көрсету барысында нүктеден кейін 2 таңба алу үшін `print(f'{ans:.2f}')` қолданыңыз."
  },
  {
    id: 15, title: "Каскад санар", difficulty:"hard", points:25,
    statement: "N×N матрицасын сипалдық (спираль) ретте шығарыңыз. 1-ден N² дейін сандармен толтырыңыз.",
    input_format: "N (1 ≤ N ≤ 10)",
    output_format: "N жол, N баған, бос кеш аражыңдар",
    examples: [{ input:"3", output:"1 2 3\n8 9 4\n7 6 5" }],
    test_cases: [{ input:"3", expected_output:"1 2 3\n8 9 4\n7 6 5" }],
    hint_small: "Алдымен барлық элементі 0 болатын N×N матрицасын дайындап алыңыз. Сосын оңға, төмен, солға және жоғарыға қозғалу шекараларын анықтап алып жүріп өту алгоритмін жазыңыз.",
    hint_big: "`left`, `right`, `top`, `bottom` 4 шекара аласыз. 1-ден N*N дейінгі айнымалымен сол шекаралар арасын кезек-кезек `for` не `while` циклі арқылы толтырып отырасыз. Әр қабырғаны толтырған соң шекараны ішке қарай 1 қадам көшіріп (мысалы top += 1) жалғастырасыз."
  },
  {
    id: 514, title: "Лестница (Баспалдақ)", difficulty: "medium", points: 20,
    statement: "Мальчик Петя строит из кубиков лестницу. Лестница представляет собой несколько строящихся рядом башенок из кубиков, каждая из которых ровно на один кубик выше предыдущей. Требуется по имеющемуся у мальчика Пети числу кубиков определить, какой в кубиках будет высота последней ступеньки.",
    input_format: "Входной файл содержит число K – количество кубиков у мальчика Пети (1 ≤ K ≤ 10^9).",
    output_format: "Выведите количество кубиков в последней ступеньке у максимально высокой лестницы.",
    examples: [{ input: "1", output: "1" }, { input: "4", output: "2" }, { input: "6", output: "3" }],
    test_cases: [
      { input: "1", expected_output: "1" },
      { input: "4", expected_output: "2" },
      { input: "6", expected_output: "3" },
      { input: "10", expected_output: "4" },
      { input: "100", expected_output: "13" },
      { input: "1000000", expected_output: "1413" },
      { input: "1000000000", expected_output: "44720" }
    ],
    hint_small: "Әр баған алдыңғысынан 1 кубикке артық болуы керек. Яғни биіктігі h болатын баспалдақ сау үшін жалпы 1 + 2 + ... + h = h * (h + 1) / 2 кубик қажет.",
    hint_big: "Математикалық жолмен `h * (h + 1) / 2 <= k` теңсіздігін шешіп, h-ты табуға болады, немесе жай ғана while циклі арқылы кубиктер санын көбейтіп отырып, K-дан асып кеткенде тоқтатуға болады."
  },
  {
    id: 21, title: "Зарплата (Жалақы)", difficulty: "easy", points: 10,
    statement: "В отделе работают 3 сотрудника, которые получают заработную плату в рублях. Требуется определить, на сколько зарплата самого высокооплачиваемого из них отличается от самого низкооплачиваемого.",
    input_format: "В единственной строке через пробел записаны зарплаты 3 сотрудников.",
    output_format: "Вывести одно целое число — разницу между максимальной и минимальной зарплатой.",
    examples: [{ input: "100 500 200", output: "400" }],
    test_cases: [
      { input: "100 500 200", expected_output: "400" },
      { input: "10 20 30", expected_output: "20" },
      { input: "50 50 50", expected_output: "0" }
    ],
    hint_small: "Үш санды тізімге оқып алып, содан кейін тізімнің ең үлкен (max) және ең кіші (min) мәндерін табыңыз.",
    hint_big: "Код мысалы: `a = list(map(int, input().split()))`. Содан кейін `print(max(a) - min(a))` деп оңай шығарасыз."
  },
  {
    id: 25, title: "Больше-меньше (<, >, =)", difficulty: "easy", points: 10,
    statement: "Заданы два целых числа A и B. Требуется вывести символ '<', '>', или '=', в зависимости от того, какое из чисел больше.",
    input_format: "Два целых числа A и B через пробел (|A|, |B| ≤ 2*10^9).",
    output_format: "Один из символов '<', '>', или '='.",
    examples: [{ input: "5 7", output: "<" }, { input: "-7 -12", output: ">" }, { input: "13 13", output: "=" }],
    test_cases: [
      { input: "5 7", expected_output: "<" },
      { input: "-7 -12", expected_output: ">" },
      { input: "13 13", expected_output: "=" },
      { input: "0 -1", expected_output: ">" }
    ],
    hint_small: "Кірістегі екі санды a және b айнымалыларына оқып алыңыз да, if, elif, else арқылы тексеріңіз.",
    hint_big: "if a > b: print('>')\\nelif a < b: print('<')\\nelse: print('=')"
  },
  {
    id: 43, title: "Нөлдер (Zeros)", difficulty: "easy", points: 10,
    statement: "Нөлдер мен бірлерден тұратын тізбектегі үздіксіз нөлдер тізбегін (ең ұзын нөлдер қатарын) табу керек.",
    input_format: "Кіріс жалғыз қатарында нөлдер мен бірлерден тұратын тізбек жазылған (бос орынсыз). Цифрлардың жалпы саны 1-ден 100-ге дейін.",
    output_format: "Шығыс файлының жалғыз қатарына ізделінетін нөлдер тізбегінің ұзындығын шығарыңыз.",
    examples: [{ input: "00101110000110", output: "4" }],
    test_cases: [
      { input: "00101110000110", expected_output: "4" },
      { input: "111", expected_output: "0" },
      { input: "00000", expected_output: "5" },
      { input: "10101", expected_output: "1" },
      { input: "00100010000", expected_output: "4" }
    ],
    hint_small: "Ең қысқа жол: жолды алып, оны '1' арқылы бөліктерге бөліп (split), сол бөліктердің ішінен ең ұзынын табуға болады.",
    hint_big: "Код мысалы (бір жолмен):\n```python\nprint(max(map(len, input().strip().split('1'))))\n```"
  }
];
