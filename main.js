/* ============================================================
   Portfolio — main.js
   Hero WebGL, галерея проектов, drawer, медиа, контакты
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     0. Утилиты
     ---------------------------------------------------------- */

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Перезаписывается в initHeroCanvas(); безопасный no-op по умолчанию */
  var resumeHeroCanvas = function () {};

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function announce(message) {
    var live = $('#liveRegion');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = message;
    }, 40);
  }

  /* ----------------------------------------------------------
     1. WebGL-сфера героя
     ---------------------------------------------------------- */

  function initHeroCanvas() {
    var canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    var gl = canvas.getContext('webgl', { alpha: false, depth: false, antialias: false, powerPreference: 'high-performance' });
    if (!gl) return;

    var vs = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
    var fs = [
      'precision highp float;',
      'uniform vec2 u_res;',
      'uniform float u_time;',
      'uniform vec2 u_mouse;',
      '',
      'float hash(vec2 p) {',
      '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
      '}',
      '',
      'float noise(vec2 p) {',
      '  vec2 i = floor(p);',
      '  vec2 f = fract(p);',
      '  f = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),',
      '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);',
      '}',
      '',
      'float fbm(vec2 p) {',
      '  float v = 0.0;',
      '  float a = 0.5;',
      '  for (int i = 0; i < 2; i++) {',
      '    v += a * noise(p);',
      '    p = p * 2.03 + vec2(1.7, 9.2);',
      '    a *= 0.5;',
      '  }',
      '  return v;',
      '}',
      '',
      'void main() {',
      '  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;',
      '  float t = u_time * 0.38;',
      '  vec2 m = (u_mouse - 0.5) * 0.04;',
      '',
      '  /* 1. ГЕОМЕТРИЯ ГОРИЗОНТА СОБЫТИЙ (единая гигантская чёрная дыра, текст внутри тёмного ядра) */',
      '  vec2 bhCenter = vec2(-0.26, 0.58) + m;',
      '  vec2 q = p - bhCenter;',
      '  /* Лёгкий релятивистский S-изгиб гравитационной линзы как в Interstellar */',
      '  q.y += 0.045 * sin(q.x * 2.4 - 0.5);',
      '  vec2 scaledQ = vec2(q.x * 0.66, q.y);',
      '  float r = length(scaledQ);',
      '  float angle = atan(scaledQ.y, scaledQ.x);',
      '',
      '  /* Радиус горизонта событий: проходит под центральным текстом и уходит вверх справа */',
      '  float R = 0.77;',
      '  /* dr > 0 — снаружи горизонта событий (кольца света), dr < 0 — внутри чёрной дыры */',
      '  float dr = r - R;',
      '',
      '  /* Базовые цвета: глубокий космос снаружи и абсолютная тень внутри горизонта событий */',
      '  vec3 outerSpace = vec3(0.095, 0.102, 0.125);',
      '  vec3 voidBlack  = vec3(0.032, 0.035, 0.044);',
      '  float insideMask = smoothstep(0.008, -0.012, dr);',
      '  vec3 col = mix(outerSpace, voidBlack, insideMask);',
      '',
      '  /* 2. ЧЁТКИЕ СВЕТОВЫЕ НИТИ АККРЕЦИОННОГО ДИСКА И ФОТОННОЕ КОЛЬЦО */',
      '  if (dr > -0.025 && dr < 0.46) {',
      '    float outsideCut = smoothstep(-0.006, 0.004, dr);',
      '    float d = max(0.0, dr);',
      '',
      '    /* Нелинейное сжатие нитей у самого края горизонта событий (гравитационное линзирование) */',
      '    float warpedD = pow(d, 0.62);',
      '',
      '    /* Движение плазменных потоков вдоль дуги со временем */',
      '    float stream1 = fbm(vec2(angle * 3.2 - t * 0.55, warpedD * 16.0));',
      '    float stream2 = fbm(vec2(angle * 6.5 - t * 0.85, warpedD * 34.0 + stream1 * 1.4));',
      '',
      '    /* Концентрические тонкие линии-волокна как на постере Interstellar */',
      '    float linesFine   = 0.5 + 0.5 * sin(warpedD * 210.0 + stream1 * 5.0 - angle * 2.0);',
      '    float linesMedium = 0.5 + 0.5 * sin(warpedD * 95.0  - stream2 * 4.0 + angle);',
      '    float linesBroad  = 0.5 + 0.5 * sin(warpedD * 38.0  + stream1 * 3.0);',
      '    float filaments = pow(linesFine, 2.6) * 0.55 + pow(linesMedium, 2.0) * 0.45 + linesBroad * 0.25;',
      '    filaments *= (0.45 + 0.75 * stream2);',
      '',
      '    /* 1) Острое раскалённое внутреннее фотонное кольцо на самом краю чёрной дыры */',
      '    float photonRing = exp(-d * 85.0) * 1.35;',
      '    /* 2) Основной плотный пояс световых нитей */',
      '    float innerDisk  = exp(-pow((d - 0.032) * 24.0, 2.0)) * (0.45 + 0.85 * filaments);',
      '    /* 3) Широкий шлейф расходящихся колец и нитей наружу */',
      '    float outerDisk  = exp(-d * 7.2) * smoothstep(0.0, 0.025, d) * filaments * 0.95;',
      '',
      '    /* Эффект Доплера: дуга ярче и горячее в центральной и правой нижней части */',
      '    float doppler = smoothstep(-2.6, -0.5, angle) * smoothstep(0.35, -0.8, angle);',
      '    doppler = 0.55 + 0.65 * doppler;',
      '',
      '    /* Цветовая температура: белое золото у горизонта -> расплавленный янтарь -> тёмная медь и оливка */',
      '    vec3 cHotCore = vec3(1.00, 0.95, 0.84);',
      '    vec3 cGold    = vec3(1.00, 0.72, 0.30);',
      '    vec3 cCopper  = vec3(0.76, 0.32, 0.14);',
      '    vec3 cSage    = vec3(0.48, 0.62, 0.52);',
      '',
      '    vec3 diskColor = mix(cGold, cCopper, smoothstep(0.02, 0.22, d + (stream1 - 0.5) * 0.05));',
      '    diskColor = mix(diskColor, cSage, smoothstep(0.14, 0.34, d) * 0.45);',
      '',
      '    vec3 light = cHotCore * photonRing;',
      '    light += mix(cHotCore, cGold, 0.55) * innerDisk;',
      '    light += diskColor * outerDisk;',
      '',
      '    col += light * outsideCut * doppler;',
      '  }',
      '',
      '  /* Мягкое золотистое свечение (bloom) вокруг фотонного кольца */',
      '  float bloom = exp(-abs(dr - 0.015) * 14.0) * smoothstep(-0.04, 0.02, dr);',
      '  col += vec3(0.92, 0.56, 0.20) * bloom * 0.22;',
      '',
      '  /* Плавный переход в графитовый цвет сайта #1c1e24 у самой нижней кромки экрана */',
      '  float bottomBlend = smoothstep(-0.36, -0.50, p.y);',
      '  col = mix(col, vec3(0.110, 0.118, 0.141), bottomBlend);',
      '',
      '  /* Тонкая микро-зернистость киноплёнки */',
      '  col += (hash(gl_FragCoord.xy + fract(t) * 100.0) - 0.5) * 0.016;',
      '',
      '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
      '}'
    ].join('\n');

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'u_res');
    var uTime = gl.getUniformLocation(prog, 'u_time');
    var uMouse = gl.getUniformLocation(prog, 'u_mouse');

    var mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, raf = 0, visible = true, startTime = performance.now();
    var pausedAt = 0;

    function render(now) {
      /* Пока открыт drawer / modal / lightbox — WebGL не тратит ресурсы GPU */
      if (isAnyOverlayOpen()) {
        pausedAt = now;
        raf = 0;
        return;
      }
      var elapsed = (now - startTime) * 0.001;
      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (visible) raf = requestAnimationFrame(render);
    }

    function resize() {
      /* Разумный предел разрешения: нити остаются чёткими, но нагрузка на GPU ниже */
      var scale = Math.min(window.devicePixelRatio || 1, 1.25) * 0.85;
      var w = Math.max(1, Math.round(canvas.clientWidth * scale));
      var h = Math.max(1, Math.round(canvas.clientHeight * scale));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
    resize();
    window.addEventListener('resize', resize);

    /* Перезапуск цикла рендера после закрытия оверлеев (см. closeDrawer / closeVideoModal / closeLightbox) */
    resumeHeroCanvas = function () {
      if (!visible) return;
      if (pausedAt) {
        /* Компенсируем время простоя, чтобы перелив не «прыгал» при возврате */
        startTime += performance.now() - pausedAt;
        pausedAt = 0;
      }
      if (!raf) raf = requestAnimationFrame(render);
    };

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX / window.innerWidth;
      ty = 1.0 - (e.clientY / window.innerHeight);
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) raf = requestAnimationFrame(render);
      }).observe(canvas);
    }
    raf = requestAnimationFrame(render);
  }

  /* ----------------------------------------------------------
     2. Данные проектов
     ---------------------------------------------------------- */

  var PROJECTS = [
    {
      id: 'scanpro',
      title: 'ScanPro',
      kind: 'app',
      index: '01',
      category: 'Приложение · Windows',
      image: 'assets/projects/scanpro.png',
      role: 'Документы, распознавание текста и экспорт',
      task: 'Собирает снимки чеков и накладных, распознаёт текст и позволяет проверить данные перед сохранением или отправкой во внешний сервис.',
      features: [
        'Выбор снимка из галереи и камера',
        'OCR на русском и английском',
        'Поля: тип документа, поставщик, ИНН, номер, дата, сумма',
        'Ручная корректировка распознанного текста',
        'Сохранение оригинала, архив, повторное OCR',
        'HTTP-экспорт структурированных данных'
      ],
      solution: 'Показана связь мобильного интерфейса с Python API, обработка изображений, OCR, серверная SQLite и передача структурированных данных.',
      metrics: [],
      stack: ['React Native / Expo', 'FastAPI', 'Python', 'Tesseract OCR', 'SQLite', 'REST / HTTP'],
      materials: 'Исходники: Проекты/ScanPro · установщик ScanPro-Setup.exe.'
    },
    {
      id: 'tradecore',
      title: 'TradeCore',
      kind: 'app',
      index: '02',
      category: 'Приложение · Windows',
      image: 'assets/projects/tradecore.png',
      role: 'Магазин, склад, обмен и отчёты',
      task: 'Объединить упрощённый интернет-магазин, учёт остатков, обработку заказов, обмен с внешним сервисом и отчётность в одном приложении.',
      features: [
        'Каталог и архив товаров, штрихкоды',
        'Корзина и заказы: резерв, завершение, отмена',
        'Склад: приход и списание',
        'Очередь обмена и повторные попытки',
        'Excel / CSV-отчёты',
        'Локальная проверка команд Telegram, настройки и резервная копия'
      ],
      solution: 'Пользователь создаёт заказ — приложение проверяет доступный остаток и резервирует товар, задание поступает в очередь обмена, а складские операции и продажи видны в отчётах. Показаны SQL и транзакции, фоновый обработчик очереди и Python-отчёты.',
      metrics: [],
      stack: ['Next.js', 'Express', 'PostgreSQL', 'RabbitMQ', 'Python / Pandas', 'aiogram', 'SQL'],
      materials: 'Исходники: Проекты/TradeCore · установщик TradeCore-Setup.exe.'
    },
    {
      id: 'geminihub',
      title: 'Gemini Hub',
      kind: 'desktop',
      index: '03',
      category: 'Desktop-приложение · Network & Proxy Manager',
      image: 'assets/projects/gemini-hub.png',
      role: 'Центр маршрутизации трафика для AI-инструментов',
      task: 'Дать единую панель, через которую AI-инструменты и рабочие среды (Antigravity, Gemini Chrome, DeepSeek Harness) выходят в сеть через нужный прокси-узел, а остальной трафик ПК идёт напрямую.',
      features: [
        'Режимы маршрутизации Direct, Cascade и SSH Direct (через VPS)',
        'Селективный Split Tunneling: через прокси идут только Gemini и Telegram',
        'BattlEye-туннелирование (порт 127.0.0.1:443)',
        'Список узлов ProxyLine (SOCKS5 / HTTP) с авто-пингом и выбором лучшего',
        'Системный прокси Windows и импорт учётных данных из .txt',
        'Быстрый запуск рабочих сред и открытие сайтов через прокси'
      ],
      solution: 'Локальный прокси-сервер принимает соединения приложений и маршрутизирует их напрямую, через SOCKS5 или SSH-туннель со счётчиками запросов в реальном времени.',
      metrics: [
        { value: '3', label: 'режима маршрутизации' },
        { value: 'Авто', label: 'выбор узла по пингу' }
      ],
      stack: ['Python', 'TypeScript', 'SOCKS5 / HTTP', 'SSH Tunneling', 'Split Tunneling', 'ProxyLine API', 'Windows Desktop'],
      materials: 'Демо и исходники — по запросу.'
    },
    {
      id: 'telegram-mailing',
      title: 'Telegram Auto-Mailing',
      kind: 'desktop',
      index: '04',
      category: 'Desktop-приложение · Автоматизация рассылок',
      image: 'assets/projects/telegram-bot.png',
      role: 'Панель автоматизированных рассылок по Telegram-чатам',
      task: 'Регулярно публиковать сообщения в целевых Telegram-чатах в нужные дни и часы с ротацией шаблонов и работой через прокси.',
      features: [
        'Проверка валидности Telegram-сессии при запуске',
        'Гибкий планировщик слотов по дням недели и времени для каждого чата',
        'Ротация шаблонов сообщений (со ссылками и без)',
        'Подключение через авторизованный SOCKS5-прокси',
        'Автозапуск рассылки при старте и запуск вместе с Windows',
        'Живая консоль логов и проверка состояния локальной БД'
      ],
      solution: 'Чаты, шаблоны и расписание хранятся в SQLite. Фоновый планировщик раз в 60 секунд сверяется с базой, находит ближайший слот и отправляет сообщение через Telethon.',
      metrics: [
        { value: '60 s', label: 'интервал проверки БД' },
        { value: '24/7', label: 'работа в фоне с автозапуском' }
      ],
      stack: ['Python', 'Telegram API / Telethon', 'SQLite', 'SOCKS5 Proxy', 'Scheduler', 'Windows Autostart'],
      materials: 'Демо и исходники — по запросу.'
    },
    {
      id: 'pulsescale',
      title: 'PulseScale',
      kind: 'web',
      index: '05',
      category: 'Кейс 01 · B2B SaaS / ML',
      image: 'assets/projects/pulsescale.png',
      role: 'Платформа Observability и мониторинга ИИ-кластеров',
      task: 'Упаковать DevOps- и дата-ориентированный продукт в премиальную форму с аппаратным рендерингом телеметрии без задержек.',
      features: [
        'Живая консоль кластера: спарклайны Latency P99, загрузка GPU Tensor Core, поток логов',
        'Bento-сетка: Edge-маршрутизация, трекер инференса LLM, прогноз OOM-Kill',
        'Интерактивный биллинг с переключателем «Месяц / Год» (−20%)',
        'Zero-CLS вёрстка без просадки FPS'
      ],
      solution: 'Единая страница продукта с аппаратно ускоренной отрисовкой телеметрии: данные графиков обновляются без пересчёта layout, биллинг переключается мгновенно, а Lighthouse фиксирует максимальные показатели производительности.',
      metrics: [
        { value: '14.2 ms', label: 'P99 визуализация задержки' },
        { value: '100 / 100', label: 'Lighthouse Performance' }
      ],
      stack: ['Next.js 16 (App Router)', 'TypeScript', 'Tailwind CSS', 'Lucide Icons', 'SVG Data Visuals'],
      materials: 'Демо и репозиторий — по запросу.'
    },
    {
      id: 'nordic-estate',
      title: 'Nordic Estate',
      kind: 'web',
      index: '06',
      category: 'Кейс 02 · Коммерческий лендинг',
      image: 'assets/projects/nordic-estate.png',
      role: 'Бюро загородных вилл с калькулятором сметы',
      task: 'Построить посадочную страницу с фокусом на визуале и интерактивном вовлечении заказчика через расчёт параметров объекта.',
      features: [
        'Интерактивный калькулятор сметы на клиентском стейте React (120–550 м²)',
        'Матрица технологий: фахверк, финский клееный брус, термомонолит',
        'Пакетные опции: панорамная SPA-зона, эксплуатируемая кровля, KNX «Умный дом»',
        'Каталог сданных резиденций с геолокацией и площадями'
      ],
      solution: 'Смета пересчитывается полностью на клиенте без сетевых запросов: изменение площади, технологии или пакета опций мгновенно отражается в итоговой стоимости, а визуальный ряд держит премиальную подачу объекта.',
      metrics: [
        { value: '120–550 м²', label: 'Диапазон динамического расчёта' },
        { value: '0.0 s', label: 'Мгновенный отклик сметы' }
      ],
      stack: ['React Client State', 'Dynamic Estimator', 'Responsive Grid', 'High-Ticket E-Commerce'],
      materials: 'Демо и репозиторий — по запросу.'
    },
    {
      id: 'red-ops',
      title: 'RED OPS',
      kind: 'web',
      index: '07',
      category: 'Кейс 03 · Enterprise / Game Ops',
      image: 'assets/projects/red-ops.png',
      role: 'Оперативно-управленческий комплекс подразделения',
      task: 'Оперативный учёт личного состава, контроль дисциплинарных нормативов и синхронизация с Discord-инфраструктурой при жёстких требованиях к отказоустойчивости.',
      features: [
        'Контроль норм и автопинг: кольцевой индикатор онлайна и графики динамики',
        'Безопасность продакшена: изоляция портов БД (127.0.0.1), Docker healthcheck',
        'Транзакционный аудит внутри транзакций PostgreSQL с фиксацией в bot_logs',
        'Фоновый планировщик Roles Monitor с защитой от 404/429 лимитов Discord API'
      ],
      solution: 'Все операции, затрагивающие состав и роли, выполняются внутри транзакций с записью в bot_logs, доступ к БД закрыт на уровне loopback-интерфейса, а фоновый монитор ролей корректно переживает лимиты Discord API.',
      metrics: [
        { value: '813 / 813', label: 'Успешных автотестов' },
        { value: '100%', label: 'Транзакционная целостность' }
      ],
      stack: ['PostgreSQL', 'Drizzle ORM', 'Docker', 'Strict TypeScript', 'RBAC Security'],
      materials: 'Демо и репозиторий — по запросу.'
    }
  ];

  /* ----------------------------------------------------------
     3. Рендер галереи проектов
     ---------------------------------------------------------- */

  var projectsGrid = $('#projectsGrid');

  function renderProjects() {
    if (!projectsGrid) return;
    var frag = document.createDocumentFragment();

    PROJECTS.forEach(function (project, i) {
      var card = el('article', 'project-card reveal');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-kind', project.kind);
      card.setAttribute('data-id', project.id);
      card.setAttribute('aria-label', 'Открыть подробности проекта ' + project.title);

      var media = el('div', 'project-media');
      var img = el('img');
      img.src = encodeURI(project.image);
      img.alt = project.title + ' — ' + project.role;
      img.loading = i < 2 ? 'eager' : 'lazy';
      img.decoding = 'async';
      if (i < 2) img.setAttribute('fetchpriority', 'high');
      media.appendChild(img);

      var open = el('span', 'project-open', 'Открыть ↗');
      media.appendChild(open);
      card.appendChild(media);

      var meta = el('div', 'project-meta');
      meta.appendChild(el('span', 'project-index', project.index));
      meta.appendChild(el('span', 'project-cat', project.category));
      card.appendChild(meta);

      card.appendChild(el('h3', 'project-title', project.title));
      card.appendChild(el('p', 'project-role', project.role));

      card.addEventListener('click', function () {
        openDrawer(project);
      });

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          openDrawer(project);
        }
      });

      frag.appendChild(card);
    });

    projectsGrid.appendChild(frag);
    refreshOffsets();
  }

  function visibleCards() {
    if (!projectsGrid) return [];
    return Array.prototype.filter.call(
      projectsGrid.querySelectorAll('.project-card'),
      function (card) { return !card.classList.contains('is-hidden'); }
    );
  }

  function refreshOffsets() {
    var cards = visibleCards();
    cards.forEach(function (card, i) {
      card.classList.toggle('is-offset', i % 2 === 1);
    });
  }

  /* Фильтр проектов */
  function initProjectFilters() {
    var buttons = document.querySelectorAll('[data-filter]');
    if (!buttons.length || !projectsGrid) return;

    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.getAttribute('data-filter');

        Array.prototype.forEach.call(buttons, function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        var cards = projectsGrid.querySelectorAll('.project-card');
        Array.prototype.forEach.call(cards, function (card) {
          var show = filter === 'all' || card.getAttribute('data-kind') === filter;
          card.classList.toggle('is-hidden', !show);
          if (show) {
            card.classList.add('is-visible');
          }
        });

        refreshOffsets();

        var shown = visibleCards().length;
        announce('Показано проектов: ' + shown);
      });
    });
  }

  /* ----------------------------------------------------------
     4. Drawer проекта
     ---------------------------------------------------------- */

  var drawer = $('#projectDrawer');
  var drawerBackdrop = $('#drawerBackdrop');
  var drawerBody = $('#drawerBody');
  var drawerKicker = $('#drawerKicker');
  var drawerClose = $('#drawerClose');
  var lastFocused = null;
  var activeProject = null;

  function block(title, contentNode) {
    var wrap = el('div', 'drawer-block');
    wrap.appendChild(el('p', 'drawer-block-title', title));
    if (contentNode) wrap.appendChild(contentNode);
    return wrap;
  }

  function renderDrawerContent(project) {
    if (!drawerBody) return;
    drawerBody.innerHTML = '';

    if (drawerKicker) {
      drawerKicker.textContent = project.index + ' / ' + project.category;
    }

    var hero = el('figure', 'drawer-hero');
    hero.setAttribute('role', 'button');
    hero.setAttribute('tabindex', '0');
    hero.setAttribute('aria-label', 'Открыть изображение проекта ' + project.title + ' на весь экран');
    var heroImg = el('img');
    heroImg.src = encodeURI(project.image);
    heroImg.alt = project.title + ' — ' + project.role;
    heroImg.decoding = 'async';
    hero.appendChild(heroImg);
    hero.appendChild(el('span', 'drawer-hero-hint', 'Зум ↗'));

    function zoomProjectImage() {
      openLightbox(encodeURI(project.image), project.title + ' — ' + project.role);
    }

    hero.addEventListener('click', zoomProjectImage);
    hero.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        zoomProjectImage();
      }
    });
    drawerBody.appendChild(hero);

    var meta = el('div', 'drawer-meta');
    meta.appendChild(el('span', 'drawer-index', project.index));
    meta.appendChild(el('span', 'drawer-cat', project.category));
    drawerBody.appendChild(meta);

    drawerBody.appendChild(el('h2', 'drawer-title', project.title)).id = 'drawerTitle';
    drawerBody.appendChild(el('p', 'drawer-role', project.role));

    drawerBody.appendChild(block('Задача', el('p', 'drawer-text', project.task)));

    var list = el('ul', 'drawer-list');
    project.features.forEach(function (feature) {
      list.appendChild(el('li', null, feature));
    });
    var solutionBlock = el('div', 'drawer-block');
    solutionBlock.appendChild(el('p', 'drawer-block-title', 'Решение и функциональность'));
    solutionBlock.appendChild(list);
    solutionBlock.appendChild(el('p', 'drawer-note', project.solution));
    drawerBody.appendChild(solutionBlock);

    if (project.metrics && project.metrics.length) {
      var metricsWrap = el('div', 'drawer-metrics');
      project.metrics.forEach(function (metric) {
        var cell = el('div', 'metric');
        cell.appendChild(el('p', 'metric-value', metric.value));
        cell.appendChild(el('p', 'metric-label', metric.label));
        metricsWrap.appendChild(cell);
      });
      var metricsBlock = el('div', 'drawer-block');
      metricsBlock.appendChild(el('p', 'drawer-block-title', 'Метрики'));
      metricsBlock.appendChild(metricsWrap);
      drawerBody.appendChild(metricsBlock);
    }

    var tags = el('div', 'drawer-tags');
    project.stack.forEach(function (tech) {
      tags.appendChild(el('span', 'drawer-tag', tech));
    });
    drawerBody.appendChild(block('Стек', tags));

    drawerBody.appendChild(block('Материалы', el('p', 'drawer-note', project.materials)));
  }

  function openDrawer(project) {
    if (!drawer) return;
    activeProject = project;
    lastFocused = document.activeElement;
    renderDrawerContent(project);
    if (drawerBody) drawerBody.scrollTop = 0;

    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (drawerBackdrop) drawerBackdrop.classList.add('is-open');
    document.body.classList.add('is-locked');

    window.setTimeout(function () {
      if (drawerClose) drawerClose.focus();
    }, 60);

    announce('Открыта панель проекта ' + project.title);
  }

  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (drawerBackdrop) drawerBackdrop.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    activeProject = null;

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }

    resumeHeroCanvas();
  }

  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  /* ----------------------------------------------------------
     5. Медиа: видео и изображения
     ---------------------------------------------------------- */

  var MEDIA_BASE = 'assets/media/';
  var VIDEO_DIR = {
    animation: 'animation/',
    light: 'light/',
    hard: 'hard/'
  };
  var VIDEOS = [
    { n: 1,  name: 'AQPN_Dc02ZjICWYUASBmkVwTsoC1QnaGJDQiUc1y1h1GvbhefuISuo1xMXSd97l.mp4', size: '5.7 МБ',  fmt: 'MP4', cat: 'animation', catLabel: 'Анимационный', title: 'Моушн-дизайн интерфейса',   sub: 'Анимированные переходы и микроанимации' },
    { n: 2,  name: 'AQPWfRtSLtitSwr6NghZ6I5sLFrtukYzjUPo89557wKCEbwMBwlzeY2WEoAyWoZ.mp4', size: '0.7 МБ',  fmt: 'MP4', cat: 'animation', catLabel: 'Анимационный', title: 'Анимированный логотип',     sub: 'Короткий логотип-стингер' },
    { n: 3,  name: 'AQPygyydKhK4n8zEJQKEVCm9RDLHJm2fQ1Y02lthWkCuTpy9ug_X_B1zZnDlQqk.mp4', size: '14.8 МБ', fmt: 'MP4', cat: 'animation', catLabel: 'Анимационный', title: 'Промо-ролик с 3D-графикой', sub: 'Объёмная сцена и динамичные титры' },
    { n: 4,  name: 'IMG_0927.mp4', size: '41.8 МБ', fmt: 'MP4', cat: 'animation', catLabel: 'Анимационный', title: 'Анимация промо-ролика',     sub: 'Динамичные переходы и титры' },
    { n: 5,  name: 'IMG_1211.mp4', size: '22.5 МБ', fmt: 'MP4', cat: 'animation', catLabel: 'Анимационный', title: 'Кинетическая типографика',  sub: 'Титры и ритмичный монтаж' },
    { n: 6,  name: 'IMG_2010.mp4', size: '94.7 МБ', fmt: 'MP4', cat: 'animation', catLabel: 'Анимационный', title: '3D-анимация логотипа',      sub: 'Объёмный логотип и работа со светом' },
    { n: 7,  name: 'IMG_2167.mp4', size: '80.9 МБ', fmt: 'MP4', cat: 'animation', catLabel: 'Анимационный', title: 'Открывающая заставка',      sub: 'Интро для видеоряда' },
    { n: 8,  name: 'lv_0_20240623224351.mp4', size: '10.4 МБ', fmt: 'MP4', cat: 'animation', catLabel: 'Анимационный', title: 'Анимация промо-ролика', sub: 'Сборка ролика с графикой' },
    { n: 9,  name: 'lv_0_20240716191631.mp4', size: '25.9 МБ', fmt: 'MP4', cat: 'animation', catLabel: 'Анимационный', title: 'Моушн-дизайн интерфейса', sub: 'Анимация элементов интерфейса' },
    { n: 10, name: 'lv_0_20240822190637.mp4', size: '54.4 МБ', fmt: 'MP4', cat: 'animation', catLabel: 'Анимационный', title: 'Рекламная анимация',    sub: 'Графика и титры под музыку' },
    { n: 11, name: 'IMG_2055.mp4', size: '5.8 МБ',  fmt: 'MP4', cat: 'light', catLabel: 'Монтаж', title: 'Динамичный монтаж для Reels', sub: 'Лёгкий монтаж под музыку' },
    { n: 12, name: 'IMG_2085.mp4', size: '13.5 МБ', fmt: 'MP4', cat: 'light', catLabel: 'Монтаж', title: 'Короткий монтаж для Reels',   sub: 'Ритмичная склейка кадров' },
    { n: 13, name: 'IMG_2100.mp4', size: '11.0 МБ', fmt: 'MP4', cat: 'light', catLabel: 'Монтаж', title: 'Ролик для соцсетей',          sub: 'Вертикальный формат для ленты' },
    { n: 14, name: 'IMG_2214.mp4', size: '20.3 МБ', fmt: 'MP4', cat: 'light', catLabel: 'Монтаж', title: 'Монтаж с титрами',            sub: 'Подписи и акценты по кадрам' },
    { n: 15, name: 'IMG_2250.mp4', size: '13.9 МБ', fmt: 'MP4', cat: 'light', catLabel: 'Монтаж', title: 'Динамичный монтаж для Reels', sub: 'Быстрая нарезка и переходы' },
    { n: 16, name: 'IMG_2300.mp4', size: '17.1 МБ', fmt: 'MP4', cat: 'light', catLabel: 'Монтаж', title: 'Атмосферный ролик',           sub: 'Плавный монтаж и цветокоррекция' },
    { n: 17, name: 'IMG_2683.mp4', size: '11.4 МБ', fmt: 'MP4', cat: 'light', catLabel: 'Монтаж', title: 'Короткий монтаж',             sub: 'Ролик для соцсетей' },
    { n: 18, name: 'IMG_8959.mp4', size: '42.3 МБ', fmt: 'MP4', cat: 'light', catLabel: 'Монтаж', title: 'Сюжетный ролик',              sub: 'Последовательный монтаж сцен' },
    { n: 19, name: 'IMG_8960.mp4', size: '34.1 МБ', fmt: 'MP4', cat: 'light', catLabel: 'Монтаж', title: 'Ролик с эффектами',           sub: 'Переходы и ускорение' },
    { n: 20, name: 'IMG_8967.mp4', size: '22.1 МБ', fmt: 'MP4', cat: 'light', catLabel: 'Монтаж', title: 'Монтаж для Reels',            sub: 'Вертикальный формат' },
    { n: 21, name: 'IMG_8982.mp4', size: '33.5 МБ', fmt: 'MP4', cat: 'light', catLabel: 'Монтаж', title: 'Монтаж с титрами',            sub: 'Текст и музыкальный ритм' },
    { n: 22, name: 'AQNmnsg1vfEQCPhxPoO0YMtd3GLzpYMB2chiys6joAGqfxoDyyjWDkpBSXuirBwu5VkV1rujnLM.mp4', size: '0.5 МБ', fmt: 'MP4', cat: 'hard', catLabel: 'Анимационный', title: 'Сложная композиция', sub: 'Многослойная анимация' },
    { n: 23, name: 'IMG_2393.mp4', size: '49.3 МБ', fmt: 'MP4', cat: 'hard', catLabel: 'Монтаж', title: 'Сложный монтаж',             sub: 'Многослойные эффекты и трекинг' },
    { n: 24, name: 'lv_0_20240630113506.mp4', size: '16.9 МБ', fmt: 'MP4', cat: 'hard', catLabel: 'Анимационный', title: 'Сложная анимация', sub: 'Глубокая композиция и эффекты' }
  ];

  var IMAGE_BASE = 'assets/media/ai/';
  var IMAGES = [
    'photo_2026-02-17_17-17-24.jpg', 'photo_2026-02-17_17-17-31.jpg',
    'photo_2026-02-17_17-17-39.jpg', 'photo_2026-02-17_17-17-44.jpg',
    'photo_2026-02-17_17-17-54.jpg', 'photo_2026-02-17_17-18-02.jpg',
    'photo_2026-02-17_17-18-13.jpg', 'photo_2026-02-17_17-18-21.jpg',
    'photo_2026-02-17_17-18-33.jpg', 'photo_2026-02-17_17-18-46.jpg'
  ];

  function videoSrc(video) {
    return encodeURI(MEDIA_BASE + VIDEO_DIR[video.cat] + video.name);
  }

  function pad(num) {
    return num < 10 ? '0' + num : String(num);
  }

  var videoGrid = $('#videoGrid');
  var imageGrid = $('#imageGrid');
  var videoCards = [];

  function renderVideos() {
    if (!videoGrid) return;
    var frag = document.createDocumentFragment();

    VIDEOS.forEach(function (video, i) {
      var card = el('article', 'video-card reveal');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-cat', video.cat);
      card.setAttribute('aria-label', 'Смотреть видео: ' + video.title);

      var frame = el('div', 'video-frame');
      var vid = document.createElement('video');
      vid.dataset.src = videoSrc(video);
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.setAttribute('muted', '');
      vid.setAttribute('playsinline', '');
      vid.setAttribute('webkit-playsinline', '');
      vid.setAttribute('preload', 'none');
      vid.setAttribute('tabindex', '-1');
      vid.setAttribute('aria-hidden', 'true');
      frame.appendChild(vid);

      frame.appendChild(el('span', 'video-badge', video.catLabel));

      var play = el('span', 'video-play');
      var playSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      playSvg.setAttribute('viewBox', '0 0 12 14');
      playSvg.setAttribute('aria-hidden', 'true');
      playSvg.setAttribute('focusable', 'false');
      var playPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      playPath.setAttribute('d', 'M0 0v14l12-7z');
      playSvg.appendChild(playPath);
      play.appendChild(playSvg);
      frame.appendChild(play);

      card.appendChild(frame);

      var info = el('div', 'video-info');
      info.appendChild(el('p', 'video-title', video.title));
      info.appendChild(el('p', 'video-sub', video.sub));
      var meta = el('div', 'video-meta');
      meta.appendChild(el('span', 'video-num', pad(video.n)));
      meta.appendChild(el('span', 'video-size', video.fmt + ' · ' + video.size));
      info.appendChild(meta);
      card.appendChild(info);

      card.addEventListener('click', function () {
        openVideoModal(video);
      });

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          openVideoModal(video);
        }
      });

      card.addEventListener('pointerenter', function () {
        if (prefersReduced) return;
        loadVideoSource(vid);
        var p = vid.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      });

      card.addEventListener('pointerleave', function () {
        vid.pause();
        try { vid.currentTime = 0; } catch (err) { /* noop */ }
      });

      videoCards.push({ card: card, video: vid });
      frag.appendChild(card);
    });

    videoGrid.appendChild(frag);
    initVideoLazyLoad();
  }

  /* Ленивая подгрузка: путь к ролику присваивается только при подходе карточки к экрану */
  function loadVideoSource(vid) {
    if (!vid || !vid.dataset || !vid.dataset.src) return;
    if (vid.getAttribute('src')) return;
    vid.src = vid.dataset.src;
    vid.setAttribute('preload', 'metadata');
    vid.removeAttribute('data-src');
  }

  function initVideoLazyLoad() {
    if (!videoGrid) return;
    var cards = videoGrid.querySelectorAll('.video-card');

    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(cards, function (card) {
        var v = card.querySelector('video');
        if (v) loadVideoSource(v);
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var v = entry.target.querySelector('video');
        if (v) loadVideoSource(v);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '250px 0px' });

    Array.prototype.forEach.call(cards, function (card) {
      observer.observe(card);
    });
  }

  function renderImages() {
    if (!imageGrid) return;
    var frag = document.createDocumentFragment();

    IMAGES.forEach(function (name, i) {
      var card = el('button', 'image-card reveal');
      card.type = 'button';
      card.setAttribute('aria-label', 'Открыть изображение ' + (i + 1));
      var img = el('img');
      img.src = encodeURI(IMAGE_BASE + name);
      img.alt = 'Нейровизуал — работа ' + (i + 1);
      img.loading = 'lazy';
      img.decoding = 'async';
      card.appendChild(img);

      card.addEventListener('click', function () {
        openLightbox(encodeURI(IMAGE_BASE + name), 'Нейровизуал · ' + pad(i + 1) + ' / ' + pad(IMAGES.length));
      });

      frag.appendChild(card);
    });

    imageGrid.appendChild(frag);
  }

  function initMediaTabs() {
    var buttons = document.querySelectorAll('.media-tabs [data-cat]');
    if (!buttons.length || !videoGrid) return;

    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-cat');

        Array.prototype.forEach.call(buttons, function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        var cards = videoGrid.querySelectorAll('.video-card');
        var shown = 0;
        Array.prototype.forEach.call(cards, function (card) {
          var show = cat === 'all' || card.getAttribute('data-cat') === cat;
          card.classList.toggle('is-hidden', !show);
          if (show) {
            card.classList.add('is-visible');
            shown += 1;
          } else {
            var v = card.querySelector('video');
            if (v) {
              v.pause();
              try { v.currentTime = 0; } catch (err) { /* noop */ }
            }
          }
        });

        var count = $('#mediaCount');
        if (count) count.textContent = shown + ' видео · ' + IMAGES.length + ' изображений';
        announce('Показано видео: ' + shown);
      });
    });
  }

  /* ----------------------------------------------------------
     6. Модальный видеоплеер
     ---------------------------------------------------------- */

  var mediaModal = $('#mediaModal');
  var mediaModalBody = $('#mediaModalBody');
  var mediaModalTitle = $('#mediaModalTitle');
  var modalLastFocus = null;

  function openVideoModal(video) {
    if (!mediaModal || !mediaModalBody) return;
    modalLastFocus = document.activeElement;
    mediaModalBody.innerHTML = '';

    var vid = document.createElement('video');
    vid.src = videoSrc(video);
    vid.controls = true;
    vid.autoplay = true;
    vid.loop = false;
    vid.playsInline = true;
    vid.setAttribute('controls', '');
    vid.setAttribute('playsinline', '');
    vid.setAttribute('preload', 'auto');
    vid.setAttribute('aria-label', video.title);
    mediaModalBody.appendChild(vid);

    var play = vid.play();
    if (play && typeof play.catch === 'function') play.catch(function () {});

    if (mediaModalTitle) {
      mediaModalTitle.textContent = pad(video.n) + ' / ' + video.title + ' · ' + video.fmt + ' · ' + video.size;
    }

    mediaModal.classList.add('is-open');
    mediaModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    announce('Открыт видеоплеер: ' + video.title);
  }

  function closeVideoModal() {
    if (!mediaModal) return;
    if (!mediaModal.classList.contains('is-open')) return;
    mediaModal.classList.remove('is-open');
    mediaModal.setAttribute('aria-hidden', 'true');
    if (mediaModalBody) {
      var vid = mediaModalBody.querySelector('video');
      if (vid) {
        vid.pause();
        vid.removeAttribute('src');
        vid.load();
      }
      mediaModalBody.innerHTML = '';
    }
    if (!isAnyOverlayOpen()) document.body.classList.remove('is-locked');
    if (modalLastFocus && typeof modalLastFocus.focus === 'function') modalLastFocus.focus();
    resumeHeroCanvas();
  }

  /* ----------------------------------------------------------
     7. Лайтбокс
     ---------------------------------------------------------- */

  var lightbox = $('#lightbox');
  var lightboxImg = $('#lightboxImg');
  var lightboxCaption = $('#lightboxCaption');
  var lightboxPrev = $('#lightboxPrev');
  var lightboxNext = $('#lightboxNext');
  var lightboxLastFocus = null;
  var lightboxItems = [];
  var lightboxIndex = 0;

  function buildLightboxItems() {
    var items = IMAGES.map(function (name, i) {
      return {
        src: encodeURI(IMAGE_BASE + name),
        caption: 'Нейровизуал · ' + pad(i + 1) + ' / ' + pad(IMAGES.length)
      };
    });
    PROJECTS.forEach(function (project) {
      items.push({
        src: encodeURI(project.image),
        caption: project.title + ' — ' + project.role
      });
    });
    return items;
  }

  function showLightboxItem(index) {
    if (!lightboxItems.length || !lightboxImg) return;
    var total = lightboxItems.length;
    lightboxIndex = ((index % total) + total) % total;
    var item = lightboxItems[lightboxIndex];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.caption;
    if (lightboxCaption) lightboxCaption.textContent = item.caption;
  }

  function openLightbox(src, caption) {
    if (!lightbox || !lightboxImg) return;
    if (!lightboxItems.length) lightboxItems = buildLightboxItems();

    var index = -1;
    for (var i = 0; i < lightboxItems.length; i += 1) {
      if (lightboxItems[i].src === src) {
        index = i;
        break;
      }
    }

    if (index === -1) {
      lightboxItems.push({ src: src, caption: caption || '' });
      index = lightboxItems.length - 1;
    }

    lightboxLastFocus = document.activeElement;
    showLightboxItem(index);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    announce('Открыто изображение: ' + (caption || ''));
  }

  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    if (!isAnyOverlayOpen()) document.body.classList.remove('is-locked');
    if (lightboxLastFocus && typeof lightboxLastFocus.focus === 'function') lightboxLastFocus.focus();
    resumeHeroCanvas();
  }

  function lightboxStep(delta) {
    showLightboxItem(lightboxIndex + delta);
  }

  if (lightboxPrev) lightboxPrev.addEventListener('click', function () { lightboxStep(-1); });
  if (lightboxNext) lightboxNext.addEventListener('click', function () { lightboxStep(1); });

  Array.prototype.forEach.call(document.querySelectorAll('[data-close="lightbox"]'), function (node) {
    node.addEventListener('click', closeLightbox);
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-close="modal"]'), function (node) {
    node.addEventListener('click', closeVideoModal);
  });

  /* ----------------------------------------------------------
     8. Общее состояние оверлеев
     ---------------------------------------------------------- */

  function isAnyOverlayOpen() {
    return Boolean(
      (drawer && drawer.classList.contains('is-open')) ||
      (mediaModal && mediaModal.classList.contains('is-open')) ||
      (lightbox && lightbox.classList.contains('is-open'))
    );
  }

  document.addEventListener('keydown', function (e) {
    var key = e.key;

    if (key === 'Escape') {
      if (lightbox && lightbox.classList.contains('is-open')) {
        closeLightbox();
        return;
      }
      if (mediaModal && mediaModal.classList.contains('is-open')) {
        closeVideoModal();
        return;
      }
      if (drawer && drawer.classList.contains('is-open')) {
        closeDrawer();
        return;
      }
    }

    if (lightbox && lightbox.classList.contains('is-open')) {
      if (key === 'ArrowLeft') {
        e.preventDefault();
        lightboxStep(-1);
      } else if (key === 'ArrowRight') {
        e.preventDefault();
        lightboxStep(1);
      }
    }
  });

  var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function trapFocus(container, e) {
    if (!container || e.key !== 'Tab') return;
    var nodes = Array.prototype.filter.call(
      container.querySelectorAll(FOCUSABLE),
      function (node) { return node.offsetParent !== null || node === document.activeElement; }
    );
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    if (lightbox && lightbox.classList.contains('is-open')) {
      trapFocus(lightbox, e);
    } else if (mediaModal && mediaModal.classList.contains('is-open')) {
      trapFocus(mediaModal, e);
    } else if (drawer && drawer.classList.contains('is-open')) {
      trapFocus(drawer, e);
    }
  });

  /* ----------------------------------------------------------
     9. Копирование адресов
     ---------------------------------------------------------- */

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function initCopyButtons() {
    var buttons = document.querySelectorAll('[data-copy]');
    Array.prototype.forEach.call(buttons, function (btn) {
      var original = btn.textContent;
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        if (!text) return;

        function done(ok) {
          btn.textContent = ok ? 'Скопировано ✓' : 'Не удалось';
          btn.classList.toggle('is-copied', ok);
          announce(ok ? 'Адрес скопирован: ' + text : 'Не удалось скопировать адрес');
          window.setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove('is-copied');
          }, 1800);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            done(true);
          }).catch(function () {
            done(fallbackCopy(text));
          });
        } else {
          done(fallbackCopy(text));
        }
      });
    });
  }

  /* ----------------------------------------------------------
     10. Хедер и reveal
     ---------------------------------------------------------- */

  function initHeaderState() {
    var header = $('#siteHeader');
    if (!header) return;

    var scrolled = null;

    function onScroll() {
      var next = window.scrollY > 40;
      /* DOM трогаем только в момент пересечения порога, а не на каждый тик скролла */
      if (next === scrolled) return;
      scrolled = next;
      header.classList.toggle('is-scrolled', next);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function initReveal() {
    var targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window) || prefersReduced) {
      Array.prototype.forEach.call(targets, function (t) { t.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    Array.prototype.forEach.call(targets, function (t) { observer.observe(t); });
  }

  /* ----------------------------------------------------------
     11. Год в футере
     ---------------------------------------------------------- */

  function initFooterYear() {
    var year = $('#footerYear');
    if (!year) return;
    year.textContent = String(new Date().getFullYear());
  }

  /* ----------------------------------------------------------
     12. Инициализация
     ---------------------------------------------------------- */

  function init() {
    initHeroCanvas();
    renderProjects();
    initProjectFilters();
    renderVideos();
    renderImages();
    initMediaTabs();
    initCopyButtons();
    initHeaderState();
    initFooterYear();

    Array.prototype.forEach.call(document.querySelectorAll('.about-lead, .about-cols, .skill-row'), function (node) {
      node.classList.add('reveal');
    });

    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
