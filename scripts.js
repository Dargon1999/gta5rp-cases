// Google Analytics Event Tracking
console.log('scripts.js loaded');
function trackEvent(eventName, parameters = {}) {
  gtag('event', eventName, parameters);
}

// Показать/скрыть формы
function showTaskForm() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) {
    alert('Авторизуйтесь, чтобы получить задание!');
    window.location.href = 'index.html';
    return;
  }
  if (currentUser.activeTask && !canTakeNewTask(currentUser)) {
    alert('Вы не можете взять новое задание, пока не истечёт таймер!');
    return;
  }
  document.getElementById('taskForm')?.classList.remove('hidden');
  document.getElementById('nickname').value = currentUser.nickname || 'Ошибка ника';
  document.getElementById('discord').value = currentUser.discord || '';
}
function closeTaskForm() {
  document.getElementById('taskForm')?.classList.add('hidden');
}
function showCasesModal() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) {
    alert('Авторизуйтесь, чтобы просмотреть кейсы!');
    window.location.href = 'index.html';
    return;
  }
  document.getElementById('casesModal')?.classList.remove('hidden');
  updateCasesModal();
}
function closeCasesModal() {
  document.getElementById('casesModal')?.classList.add('hidden');
}

// Проверка таймера задания
function canTakeNewTask(player) {
  if (!player.taskStartTime && !player.lastReportTime) return true;
  const now = new Date().getTime();
  const lastTime = player.lastReportTime || player.taskStartTime;
  const last = new Date(lastTime).getTime();
  const hoursPassed = (now - last) / (1000 * 60 * 60);
  return hoursPassed >= 24;
}

// Обновление таймеров
function updateTaskTimer() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const taskDiv = document.getElementById('currentTask');
  const taskTimer = document.getElementById('taskTimer');

  if (!currentUser || !currentUser.activeTask || !currentUser.taskStartTime || !taskDiv) {
    taskDiv?.classList.add('hidden');
    return;
  }

  taskDiv.classList.remove('hidden');
  document.getElementById('taskText').textContent = `Текущее задание: ${currentUser.activeTask} (${currentUser.taskPoints} очков)`;
  
  const now = new Date().getTime();
  const taskStart = new Date(currentUser.taskStartTime).getTime();
  const timeLeft = 24 * 60 * 60 * 1000 - (now - taskStart);
  
  if (timeLeft <= 0) {
    taskTimer.textContent = 'Таймер истёк! Можете взять новое задание.';
    return;
  }

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  taskTimer.textContent = `Осталось: ${hours}ч ${minutes}м ${seconds}с`;
}

function updateNextTaskTimer() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const nextTaskTimer = document.getElementById('nextTaskTimer');
  if (!currentUser || !currentUser.lastReportTime || currentUser.activeTask || !nextTaskTimer) {
    nextTaskTimer?.classList.add('hidden');
    return;
  }

  const now = new Date().getTime();
  const lastReport = new Date(currentUser.lastReportTime).getTime();
  const timeLeft = 24 * 60 * 60 * 1000 - (now - lastReport);

  if (timeLeft <= 0) {
    nextTaskTimer.classList.add('hidden');
    return;
  }

  nextTaskTimer.classList.remove('hidden');
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  nextTaskTimer.textContent = `Новое задание через: ${hours}ч ${minutes}м ${seconds}с`;
}

// Обновление активности пользователя
function updateUserActivity() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser) {
    currentUser.lastActive = new Date().toISOString();
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    let players = JSON.parse(localStorage.getItem('players')) || [];
    let player = players.find(p => p.nickname === currentUser.nickname);
    if (player) {
      player.lastActive = currentUser.lastActive;
      localStorage.setItem('players', JSON.stringify(players));
      localStorage.setItem('user_' + currentUser.nickname, JSON.stringify(player));
    }
    updateLeaderboard();
  }
}

// Запуск таймеров и активности
setInterval(updateTaskTimer, 1000);
setInterval(updateNextTaskTimer, 1000);
setInterval(updateUserActivity, 30000); // Обновлять активность каждые 30 секунд

// Загрузка заданий
async function loadTasks() {
  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const path = isLocal ? '/tasks.json' : '/gta5rp-cases/tasks.json';
    console.log('Попытка загрузки tasks.json по пути:', path);
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      console.error('Ошибка HTTP:', response.status, response.statusText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Задания загружены:', data);
    return data;
  } catch (error) {
    console.error('Ошибка загрузки заданий:', error);
    alert('Ошибка загрузки заданий! Проверьте наличие файла tasks.json в корне репозитория или правильность пути.');
    return [];
  }
}

// Выход
function logout() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser) {
    let players = JSON.parse(localStorage.getItem('players')) || [];
    let player = players.find(p => p.nickname === currentUser.nickname);
    if (player) {
      player.lastActive = null;
      localStorage.setItem('players', JSON.stringify(players));
      localStorage.setItem('user_' + currentUser.nickname, JSON.stringify(player));
    }
  }
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
  trackEvent('logout', {});
}

// Регистрация
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const discord = document.getElementById('registerDiscord').value.trim();
  const code = document.getElementById('registerCode').value.trim();
  const registerMessage = document.getElementById('registerMessage');

  console.log('Регистрация:', { username, discord, code });

  const validCodes = ['gta5rp2025', 'admin_gta5rp2025'];
  if (!validCodes.includes(code)) {
    registerMessage.textContent = 'Неверный регистрационный код';
    return;
  }

  let players = JSON.parse(localStorage.getItem('players')) || [];
  if (players.find(p => p.nickname === username)) {
    registerMessage.textContent = 'Пользователь с таким никнеймом уже существует';
    return;
  }

  const userData = {
    nickname: username,
    password,
    discord,
    points: 0,
    tasksCompleted: 0,
    activeTask: null,
    taskStartTime: null,
    taskId: null,
    taskPoints: 0,
    lastReportTime: null,
    isAdmin: code === 'admin_gta5rp2025',
    openedCases: [],
    mainPrize: null,
    lastActive: new Date().toISOString()
  };

  players.push(userData);
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('user_' + username, JSON.stringify(userData));

  const webhookUrl = 'https://discord.com/api/webhooks/1393915689617588294/vTZ5qjX1sHQnkzXz3kdi2uOVF3-89TfmG1H92vrUzGfgLglmHwV2eJ81NlHVkVWbQYb_';
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(webhookUrl);
  const embed = {
    embeds: [{
      title: 'Новый игрок зарегистрирован',
      fields: [
        { name: 'Никнейм', value: username || 'Не указан' },
        { name: 'Discord', value: discord || 'Не указан' },
        { name: 'Админ', value: userData.isAdmin ? 'Да' : 'Нет' }
      ],
      color: 3447003,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    console.log('Уведомление о регистрации отправлено в Discord');
  } catch (error) {
    console.error('Ошибка отправки в Discord:', error);
  }

  trackEvent('register', {
    nickname: username,
    is_admin: userData.isAdmin
  });

  registerMessage.style.color = '#8de8b3';
  registerMessage.textContent = 'Регистрация прошла успешно! Теперь войдите.';
  setTimeout(() => {
    document.getElementById('registerForm').reset();
    document.getElementById('toggleForms').click();
    registerMessage.textContent = '';
  }, 1500);
});

// Вход
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const loginMessage = document.getElementById('loginMessage');

  console.log('Вход:', { username });

  const userStr = localStorage.getItem('user_' + username);
  if (!userStr) {
    loginMessage.textContent = 'Пользователь не найден';
    return;
  }

  const userData = JSON.parse(userStr);
  if (password !== userData.password) {
    loginMessage.textContent = 'Неверный пароль';
    return;
  }

  userData.lastActive = new Date().toISOString();
  localStorage.setItem('currentUser', JSON.stringify(userData));
  let players = JSON.parse(localStorage.getItem('players')) || [];
  let player = players.find(p => p.nickname === username);
  if (player) {
    player.lastActive = userData.lastActive;
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem('user_' + username, JSON.stringify(player));
  }

  loginMessage.style.color = '#8de8b3';
  loginMessage.textContent = 'Вход выполнен! Перенаправление...';

  trackEvent('login', { nickname: username });
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 1000);
});

// Получение задания
document.getElementById('getTaskForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nickname = document.getElementById('nickname').value;
  const discord = document.getElementById('discord').value;

  const tasks = await loadTasks();
  if (tasks.length === 0) {
    alert('Задания не найдены! Проверьте tasks.json в репозитории.');
    return;
  }

  const availableTasks = tasks.filter(t => t.id !== JSON.parse(localStorage.getItem('currentUser')).taskId);
  if (availableTasks.length === 0) {
    alert('Нет доступных заданий!');
    return;
  }

  const randomTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];

  let players = JSON.parse(localStorage.getItem('players')) || [];
  let player = players.find(p => p.nickname === nickname);
  if (!player) {
    player = JSON.parse(localStorage.getItem('currentUser'));
    players.push(player);
  }
  player.activeTask = randomTask.task;
  player.taskId = randomTask.id;
  player.taskPoints = randomTask.points;
  player.taskStartTime = new Date().toISOString();
  player.lastReportTime = null;
  player.lastActive = new Date().toISOString();
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('currentUser', JSON.stringify(player));
  localStorage.setItem('user_' + nickname, JSON.stringify(player));

  trackEvent('generate_task', {
    nickname: nickname,
    task_name: randomTask.task,
    task_points: randomTask.points
  });

  closeTaskForm();
  updateTaskTimer();
  updateLeaderboard();
});

// Отправка отчёта
async function submitReport() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser || !currentUser.activeTask) {
    alert('Нет активного задания!');
    return;
  }

  const nickname = currentUser.nickname;
  const discord = currentUser.discord;
  const task = currentUser.activeTask;
  const points = currentUser.taskPoints;
  const proof = document.getElementById('reportProof').value.trim();

  const urlPattern = /^(https?:\/\/(?:i\.imgur\.com|cdn\.discordapp\.com\/attachments|media\.discordapp\.net\/attachments)\/[\w\-\/]+\.(png|jpg|jpeg|mp4))$/i;
  if (!proof || !urlPattern.test(proof)) {
    console.log('Введённая ссылка:', proof);
    alert('Введите валидную ссылку на доказательство (Imgur или Discord, формат: png/jpg/jpeg/mp4)! Примеры: https://i.imgur.com/xxx.png, https://cdn.discordapp.com/attachments/xxx/xxx.jpg');
    return;
  }

  const report = {
    id: Date.now().toString(),
    nickname,
    discord,
    task,
    points,
    proof,
    timestamp: new Date().toISOString()
  };

  let reports = JSON.parse(localStorage.getItem('reports')) || [];
  reports.push(report);
  localStorage.setItem('reports', JSON.stringify(reports));

  let players = JSON.parse(localStorage.getItem('players')) || [];
  let player = players.find(p => p.nickname === nickname);
  if (!player) {
    player = currentUser;
    players.push(player);
  }
  player.points = (player.points || 0) + points;
  player.tasksCompleted = (player.tasksCompleted || 0) + 1;
  player.activeTask = null;
  player.taskStartTime = null;
  player.taskId = null;
  player.taskPoints = 0;
  player.lastReportTime = new Date().toISOString();
  player.lastActive = new Date().toISOString();
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('currentUser', JSON.stringify(player));
  localStorage.setItem('user_' + nickname, JSON.stringify(player));

  const webhookUrl = 'https://discord.com/api/webhooks/1393915689617588294/vTZ5qjX1sHQnkzXz3kdi2uOVF3-89TfmG1H92vrUzGfgLglmHwV2eJ81NlHVkVWbQYb_';
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(webhookUrl);
  const embed = {
    embeds: [{
      title: 'Новый отчёт для проверки',
      fields: [
        { name: 'Никнейм', value: nickname || 'Не указан' },
        { name: 'Discord', value: discord || 'Не указан' },
        { name: 'Задание', value: task },
        { name: 'Очки', value: points.toString() },
        { name: 'Скриншот', value: proof }
      ],
      color: 65384,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    console.log('Отчёт отправлен в Discord:', embed);
  } catch (error) {
    console.error('Ошибка отправки в Discord:', error);
    alert('Ошибка отправки отчёта в Discord! Очки начислены, но проверьте Webhook.');
  }

  trackEvent('submit_report', {
    nickname: nickname,
    task_name: task,
    proof_url: proof,
    points: points
  });

  await checkCasesAndPrize(nickname, player.points, points);
  alert(`Отчёт отправлен на проверку! Начислено ${points} очков.`);
  document.getElementById('reportProof').value = '';
  updateTaskTimer();
  updateNextTaskTimer();
  updateAdminPanel();
  updateLeaderboard();
}

// Логика кейсов
const cases = [
  { name: 'Кейс Расходники', points: 30000, contents: ['Патроны', 'Броня', 'Аптечка'], image: 'https://i.imgur.com/7bX9z3k.png' },
  { name: 'Кейс Денежный', points: 50000, contents: ['5000$', '10000$', '15000$'], image: 'https://i.imgur.com/3kY8z2m.png' },
  { name: 'Кейс Расходники', points: 60000, contents: ['Патроны', 'Броня', 'Аптечка'], image: 'https://i.imgur.com/7bX9z3k.png' },
  { name: 'Кейс Денежный', points: 100000, contents: ['10000$', '20000$', '30000$'], image: 'https://i.imgur.com/3kY8z2m.png' },
  { name: 'Кейс Расходники', points: 90000, contents: ['Патроны', 'Броня', 'Аптечка'], image: 'https://i.imgur.com/7bX9z3k.png' },
  { name: 'Кейс Расходники', points: 120000, contents: ['Патроны', 'Броня', 'Аптечка'], image: 'https://i.imgur.com/7bX9z3k.png' },
  { name: 'Главный приз', points: 150000, contents: [
      'Lamborghini Urus 6x6', 'Lamborghini Countach 2022', 'Lamborghini Murcielago',
      'Lamborghini Centenario', 'Ferrari 296 GTB', 'G63 AMG 6x6', 'BMW M5 F90',
      'BMW X6M', 'Audi A7', 'Ford Transit 2011'
    ], image: 'https://i.imgur.com/9zK3x7m.png' }
];

async function openCase(casePoints) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) return;
  if ((currentUser.points || 0) < casePoints) {
    alert('Недостаточно очков для открытия кейса!');
    return;
  }

  let players = JSON.parse(localStorage.getItem('players')) || [];
  let player = players.find(p => p.nickname === currentUser.nickname);
  if (!player) {
    player = currentUser;
    players.push(player);
  }
  if (player.openedCases.includes(casePoints)) {
    alert('Этот кейс уже открыт!');
    return;
  }

  const caseData = cases.find(c => c.points === casePoints);
  const prize = casePoints === 150000 ? getMainPrize(player) : caseData.contents[Math.floor(Math.random() * caseData.contents.length)];
  if (!prize && casePoints === 150000) {
    alert('Главный приз уже занят!');
    return;
  }

  player.points -= casePoints;
  player.openedCases.push(casePoints);
  if (casePoints === 150000) player.mainPrize = prize;
  player.lastActive = new Date().toISOString();
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('currentUser', JSON.stringify(player));
  localStorage.setItem('user_' + player.nickname, JSON.stringify(player));

  const caseElement = document.getElementById(`case_${casePoints}`);
  const spinner = document.createElement('div');
  spinner.className = 'case-spinner';
  const contents = [...caseData.contents, ...caseData.contents, ...caseData.contents];
  contents.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'case-spinner-item';
    itemElement.textContent = item;
    spinner.appendChild(itemElement);
  });
  caseElement.innerHTML = '';
  caseElement.appendChild(spinner);
  spinner.classList.add('case-spinner-anim');

  setTimeout(() => {
    caseElement.innerHTML = `
      <img src="${caseData.image}" alt="${caseData.name}" class="case-image mb-2">
      <h3 class="text-lg font-bold">${caseData.name}</h3>
      <p>${caseData.points} очков</p>
      <p>Статус: Открыт</p>
      <p class="text-sm text-gray-400">Содержимое: ${caseData.contents.join(', ')}</p>
      <p class="text-green-400 font-bold">Приз: ${prize}</p>
    `;
    alert(`Вы открыли ${caseData.name}! Приз: ${prize}`);
  }, 3000);

  trackEvent('open_case', {
    nickname: currentUser.nickname,
    case_name: caseData.name,
    case_points: casePoints,
    prize: prize
  });

  const webhookUrl = 'https://discord.com/api/webhooks/1393915689617588294/vTZ5qjX1sHQnkzXz3kdi2uOVF3-89TfmG1H92vrUzGfgLglmHwV2eJ81NlHVkVWbQYb_';
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(webhookUrl);
  const embed = {
    embeds: [{
      title: 'Кейс открыт!',
      fields: [
        { name: 'Никнейм', value: currentUser.nickname || 'Не указан' },
        { name: 'Кейс', value: caseData.name },
        { name: 'Очки', value: casePoints.toString() },
        { name: 'Приз', value: prize }
      ],
      color: 16776960,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  } catch (error) {
    console.error('Ошибка отправки в Discord:', error);
  }

  updateCasesModal();
  updateLeaderboard();
}

function getMainPrize(player) {
  const players = JSON.parse(localStorage.getItem('players')) || [];
  const winner = players.find(p => p.points >= 150000 && p.mainPrize);
  if (winner) return null;
  const prizes = cases.find(c => c.points === 150000).contents;
  return prizes[Math.floor(Math.random() * prizes.length)];
}

function updateCasesModal() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) return;

  const currentPoints = currentUser.points || 0;
  document.getElementById('currentPoints').textContent = `Ваши очки: ${currentPoints}`;

  const casesList = document.getElementById('casesList');
  casesList.innerHTML = '';
  let nextCase = cases.find(c => !currentUser.openedCases.includes(c.points) && currentPoints < c.points);
  cases.forEach(c => {
    const isOpened = currentUser.openedCases.includes(c.points);
    const canOpen = currentPoints >= c.points && !isOpened;
    const progress = nextCase && c.points === nextCase.points ? ` (нужно ещё ${c.points - currentPoints} очков)` : '';
    casesList.innerHTML += `
      <div id="case_${c.points}" class="case-card bg-gray-700 p-4 rounded-lg text-center">
        <img src="${c.image}" alt="${c.name}" class="case-image mb-2">
        <h3 class="text-lg font-bold">${c.name}</h3>
        <p>${c.points} очков</p>
        <p>Статус: ${isOpened ? 'Открыт' : canOpen ? 'Можно открыть' : 'Закрыт'}${progress}</p>
        <p class="text-sm text-gray-400">Содержимое: ${c.contents.join(', ')}</p>
        ${canOpen ? `<button onclick="openCase(${c.points})" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2 button-neon">Открыть</button>` : ''}
      </div>
    `;
  });

  if (currentUser.mainPrize) {
    document.getElementById('mainPrize').classList.remove('hidden');
    document.getElementById('mainPrize').textContent = `Главный приз: ${currentUser.mainPrize}`;
  } else {
    document.getElementById('mainPrize').classList.add('hidden');
  }
}

// Админ-панель
async function updateAdminPanel() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser || !currentUser.isAdmin) {
    console.log('Админ-панель скрыта: пользователь не админ или не авторизован', currentUser);
    document.getElementById('adminPanel')?.classList.add('hidden');
    document.getElementById('adminPanelButton')?.classList.add('hidden');
    return;
  }

  console.log('Админ-панель отображается: пользователь админ', currentUser);
  document.getElementById('adminPanel')?.classList.remove('hidden');
  document.getElementById('adminPanelButton')?.classList.remove('hidden');

  const reports = JSON.parse(localStorage.getItem('reports')) || [];
  const reportsTable = document.getElementById('adminReports');
  reportsTable.innerHTML = '';
  reports.forEach(report => {
    reportsTable.innerHTML += `
      <tr>
        <td class="p-2">${report.nickname || 'Не указан'}</td>
        <td class="p-2">${report.task}</td>
        <td class="p-2"><a href="${report.proof}" target="_blank">Ссылка</a></td>
        <td class="p-2">
          <button onclick="approveReport('${report.id}', ${report.points}, '${report.nickname}')" class="bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded button-neon">Подтвердить</button>
          <button onclick="rejectReport('${report.id}', ${report.points}, '${report.nickname}')" class="bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded button-neon">Отклонить</button>
        </td>
      </tr>
    `;
  });

  const players = JSON.parse(localStorage.getItem('players')) || [];
  const playersTable = document.getElementById('adminPlayers');
  playersTable.innerHTML = '';
  players.forEach(player => {
    if (player.nickname) {
      playersTable.innerHTML += `
        <tr>
          <td class="p-2">${player.nickname || 'Не указан'}</td>
          <td class="p-2">${player.points || 0}</td>
          <td class="p-2">
            <input type="number" id="points_${player.nickname}" placeholder="Новое кол-во очков" class="p-1 bg-gray-700 rounded">
            <button onclick="updatePoints('${player.nickname}')" class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded button-neon">Изменить</button>
            <button onclick="deletePlayer('${player.nickname}')" class="bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded button-neon">Удалить</button>
          </td>
        </tr>
      `;
    }
  });

  const tasks = await loadTasks();
  const tasksTable = document.getElementById('adminTasks');
  tasksTable.innerHTML = '';
  tasks.forEach(task => {
    tasksTable.innerHTML += `
      <tr>
        <td class="p-2">${task.id}</td>
        <td class="p-2">${task.task}</td>
        <td class="p-2">${task.points}</td>
        <td class="p-2">
          <button onclick="removeTask('${task.id}')" class="bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded button-neon">Удалить</button>
        </td>
      </tr>
    `;
  });
}

// Добавление задания
async function addTask() {
  const taskName = document.getElementById('newTaskName').value.trim();
  const taskPoints = parseInt(document.getElementById('newTaskPoints').value);
  if (!taskName || isNaN(taskPoints) || taskPoints <= 0) {
    alert('Введите название задания и корректное количество очков!');
    return;
  }

  const tasks = await loadTasks();
  const newTask = {
    id: (tasks.length + 1).toString(),
    task: taskName,
    points: taskPoints
  };
  tasks.push(newTask);
  localStorage.setItem('tasks', JSON.stringify(tasks));

  const webhookUrl = 'https://discord.com/api/webhooks/1393915689617588294/vTZ5qjX1sHQnkzXz3kdi2uOVF3-89TfmG1H92vrUzGfgLglmHwV2eJ81NlHVkVWbQYb_';
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(webhookUrl);
  const embed = {
    embeds: [{
      title: 'Новое задание добавлено',
      fields: [
        { name: 'Задание', value: taskName },
        { name: 'Очки', value: taskPoints.toString() }
      ],
      color: 3447003,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  } catch (error) {
    console.error('Ошибка отправки в Discord:', error);
  }

  document.getElementById('newTaskName').value = '';
  document.getElementById('newTaskPoints').value = '';
  updateAdminPanel();
}

// Удаление задания
async function removeTask(taskId) {
  let tasks = await loadTasks();
  tasks = tasks.filter(t => t.id !== taskId);
  localStorage.setItem('tasks', JSON.stringify(tasks));

  const webhookUrl = 'https://discord.com/api/webhooks/1393915689617588294/vTZ5qjX1sHQnkzXz3kdi2uOVF3-89TfmG1H92vrUzGfgLglmHwV2eJ81NlHVkVWbQYb_';
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(webhookUrl);
  const embed = {
    embeds: [{
      title: 'Задание удалено',
      fields: [
        { name: 'ID задания', value: taskId }
      ],
      color: 16711680,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  } catch (error) {
    console.error('Ошибка отправки в Discord:', error);
  }

  updateAdminPanel();
}

// Подтверждение отчёта
async function approveReport(reportId, points, nickname) {
  let reports = JSON.parse(localStorage.getItem('reports')) || [];
  reports = reports.filter(r => r.id !== reportId);
  localStorage.setItem('reports', JSON.stringify(reports));

  const webhookUrl = 'https://discord.com/api/webhooks/1393915689617588294/vTZ5qjX1sHQnkzXz3kdi2uOVF3-89TfmG1H92vrUzGfgLglmHwV2eJ81NlHVkVWbQYb_';
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(webhookUrl);
  const embed = {
    embeds: [{
      title: 'Отчёт подтверждён',
      fields: [
        { name: 'Никнейм', value: nickname || 'Не указан' },
        { name: 'Очки', value: points.toString() }
      ],
      color: 3447003,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  } catch (error) {
    console.error('Ошибка отправки в Discord:', error);
  }

  trackEvent('approve_report', {
    report_id: reportId,
    points_added: points,
    nickname: nickname
  });

  alert('Отчёт подтверждён!');
  updateAdminPanel();
  updateLeaderboard();
}

// Отклонение отчёта
async function rejectReport(reportId, points, nickname) {
  let reports = JSON.parse(localStorage.getItem('reports')) || [];
  const report = reports.find(r => r.id === reportId);
  reports = reports.filter(r => r.id !== reportId);
  localStorage.setItem('reports', JSON.stringify(reports));

  let players = JSON.parse(localStorage.getItem('players')) || [];
  let player = players.find(p => p.nickname === nickname);
  if (player) {
    player.points = (player.points || 0) - points;
    if (player.points < 0) player.points = 0;
    player.tasksCompleted = (player.tasksCompleted || 0) - 1;
    if (player.tasksCompleted < 0) player.tasksCompleted = 0;
    player.lastActive = new Date().toISOString();
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem('user_' + nickname, JSON.stringify(player));
    if (JSON.parse(localStorage.getItem('currentUser')).nickname === nickname) {
      localStorage.setItem('currentUser', JSON.stringify(player));
    }
  }

  const webhookUrl = 'https://discord.com/api/webhooks/1393915689617588294/vTZ5qjX1sHQnkzXz3kdi2uOVF3-89TfmG1H92vrUzGfgLglmHwV2eJ81NlHVkVWbQYb_';
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(webhookUrl);
  const embed = {
    embeds: [{
      title: 'Отчёт отклонён',
      fields: [
        { name: 'Никнейм', value: nickname || 'Не указан' },
        { name: 'Задание', value: report.task || 'Не указано' },
        { name: 'Скриншот', value: report.proof || 'Не указан' },
        { name: 'Очки сняты', value: points.toString() }
      ],
      color: 16711680,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  } catch (error) {
    console.error('Ошибка отправки в Discord:', error);
  }

  trackEvent('reject_report', { report_id: reportId });
  alert('Отчёт отклонён! Снято ' + points + ' очков.');
  updateAdminPanel();
  updateLeaderboard();
}

// Изменение очков
async function updatePoints(nickname) {
  const newPoints = parseInt(document.getElementById(`points_${nickname}`).value);
  if (isNaN(newPoints) || newPoints < 0) {
    alert('Введите корректное количество очков!');
    return;
  }
  let players = JSON.parse(localStorage.getItem('players')) || [];
  let player = players.find(p => p.nickname === nickname);
  if (!player) {
    player = JSON.parse(localStorage.getItem('currentUser'));
    players.push(player);
  }
  const previousPoints = player.points || 0;
  player.points = newPoints;
  player.lastActive = new Date().toISOString();
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('currentUser', JSON.stringify(player));
  localStorage.setItem('user_' + nickname, JSON.stringify(player));

  trackEvent('update_points', {
    nickname: nickname,
    new_points: newPoints
  });

  const webhookUrl = 'https://discord.com/api/webhooks/1393915689617588294/vTZ5qjX1sHQnkzXz3kdi2uOVF3-89TfmG1H92vrUzGfgLglmHwV2eJ81NlHVkVWbQYb_';
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(webhookUrl);
  const embed = {
    embeds: [{
      title: 'Очки обновлены',
      fields: [
        { name: 'Никнейм', value: nickname || 'Не указан' },
        { name: 'Очки', value: newPoints.toString() }
      ],
      color: 3447003,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  } catch (error) {
    console.error('Ошибка отправки в Discord:', error);
  }

  await checkCasesAndPrize(nickname, newPoints, newPoints - previousPoints);
  alert('Очки обновлены!');
  updateAdminPanel();
  updateLeaderboard();
}

// Начисление дополнительных очков
async function awardExtraPoints() {
  const type = document.getElementById('extraPointsType').value;
  const nickname = document.getElementById('extraPointsNickname').value.trim();
  const points = parseInt(type.split('_')[0]);
  const typeName = type.split('_')[1] === 'judgement' ? 'Суд' : type.split('_')[1] === 'raid' ? 'Рейд' : 'Мат. благо';

  let players = JSON.parse(localStorage.getItem('players')) || [];
  let player = players.find(p => p.nickname === nickname);
  if (!player) {
    alert('Игрок не найден!');
    return;
  }

  const previousPoints = player.points || 0;
  player.points = (player.points || 0) + points;
  player.lastActive = new Date().toISOString();
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('currentUser', JSON.stringify(player));
  localStorage.setItem('user_' + nickname, JSON.stringify(player));

  const webhookUrl = 'https://discord.com/api/webhooks/1393915689617588294/vTZ5qjX1sHQnkzXz3kdi2uOVF3-89TfmG1H92vrUzGfgLglmHwV2eJ81NlHVkVWbQYb_';
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(webhookUrl);
  const embed = {
    embeds: [{
      title: 'Дополнительные очки начислены',
      fields: [
        { name: 'Никнейм', value: nickname || 'Не указан' },
        { name: 'Тип', value: typeName },
        { name: 'Очки', value: points.toString() },
        { name: 'Всего очков', value: player.points.toString() }
      ],
      color: 3447003,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  } catch (error) {
    console.error('Ошибка отправки в Discord:', error);
  }

  trackEvent('award_extra_points', {
    nickname: nickname,
    type: typeName,
    points: points
  });

  await checkCasesAndPrize(nickname, player.points, points);
  alert(`Начислено ${points} очков за ${typeName}!`);
  updateAdminPanel();
  updateLeaderboard();
}

// Проверка кейсов и приза
async function checkCasesAndPrize(nickname, points, addedPoints) {
  let players = JSON.parse(localStorage.getItem('players')) || [];
  let player = players.find(p => p.nickname === nickname);
  if (!player) {
    player = JSON.parse(localStorage.getItem('currentUser'));
    players.push(player);
  }
  const openedCases = player.openedCases || [];
  const newlyOpenedCases = [];

  cases.forEach(c => {
    if (points >= c.points && !openedCases.includes(c.points)) {
      openedCases.push(c.points);
      const prize = c.points === 150000 ? getMainPrize(player) : c.contents[Math.floor(Math.random() * c.contents.length)];
      if (prize) newlyOpenedCases.push({ name: c.name, points: c.points, prize });
    }
  });

  if (points >= 150000 && !player.mainPrize) {
    const winner = players.find(p => p.points >= 150000 && p.mainPrize);
    if (!winner) {
      const prize = cases.find(c => c.points === 150000).contents[Math.floor(Math.random() * cases.find(c => c.points === 150000).contents.length)];
      player.mainPrize = prize;
      newlyOpenedCases.push({ name: 'Главный приз', points: 150000, prize });
    }
  }

  player.openedCases = openedCases;
  player.lastActive = new Date().toISOString();
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('currentUser', JSON.stringify(player));
  localStorage.setItem('user_' + nickname, JSON.stringify(player));

  const webhookUrl = 'https://discord.com/api/webhooks/1393915689617588294/vTZ5qjX1sHQnkzXz3kdi2uOVF3-89TfmG1H92vrUzGfgLglmHwV2eJ81NlHVkVWbQYb_';
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(webhookUrl);
  if (addedPoints > 0 || newlyOpenedCases.length > 0) {
    const embed = {
      embeds: [{
        title: 'Очки начислены!',
        fields: [
          { name: 'Никнейм', value: nickname || 'Не указан' },
          { name: 'Начислено очков', value: addedPoints.toString() },
          { name: 'Всего очков', value: points.toString() },
          ...(newlyOpenedCases.length > 0 ? [{
            name: 'Открытые кейсы',
            value: newlyOpenedCases.map(c => `${c.name}: ${c.prize}`).join(', ')
          }] : [])
        ],
        color: 3447003,
        timestamp: new Date().toISOString()
      }]
    };

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed)
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    } catch (error) {
      console.error('Ошибка отправки в Discord:', error);
    }
  }

  newlyOpenedCases.forEach(c => {
    trackEvent('open_case', {
      nickname: nickname,
      case_name: c.name,
      case_points: c.points,
      prize: c.prize
    });
    alert(`Открыт ${c.name}! Приз: ${c.prize}`);
  });

  updateCasesModal();
  updateLeaderboard();
}

// Удаление игрока
function deletePlayer(nickname) {
  let players = JSON.parse(localStorage.getItem('players')) || [];
  players = players.filter(p => p.nickname !== nickname);
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.removeItem('user_' + nickname);

  trackEvent('delete_player', { nickname: nickname });
  alert('Игрок удалён!');
  updateAdminPanel();
  updateLeaderboard();
}

// Обновление таблицы рейтинга
function updateLeaderboard() {
  const players = JSON.parse(localStorage.getItem('players')) || [];
  const leaderboard = document.getElementById('leaderboard');
  if (!leaderboard) return;

  // Фильтруем только зарегистрированных пользователей и убираем дубликаты
  const uniquePlayers = Array.from(new Set(players.map(p => p.nickname)))
    .map(nickname => players.find(p => p.nickname === nickname))
    .filter(p => p && p.nickname);

  leaderboard.innerHTML = '';
  if (uniquePlayers.length === 0) {
    leaderboard.innerHTML = '<tr><td colspan="4" class="p-2 text-center">Нет зарегистрированных участников</td></tr>';
    return;
  }

  uniquePlayers.sort((a, b) => (b.points || 0) - (a.points || 0));
  uniquePlayers.forEach(player => {
    const now = new Date().getTime();
    const lastActive = player.lastActive ? new Date(player.lastActive).getTime() : 0;
    const isActive = (now - lastActive) <= 5 * 60 * 1000; // Активен, если был на сайте менее 5 минут назад
    const status = player.mainPrize ? `Победитель: ${player.mainPrize}` : (player.points || 0) >= 150000 ? 'Победитель' : isActive ? 'Активен' : 'Оффлайн';
    leaderboard.innerHTML += `
      <tr>
        <td class="p-2">${player.nickname || 'Не указан'}</td>
        <td class="p-2">${player.points || 0}</td>
        <td class="p-2">${player.tasksCompleted || 0}</td>
        <td class="p-2">${status}</td>
      </tr>
    `;
  });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  console.log('dashboard.html loaded, pathname:', window.location.pathname);
  console.log('styles.css path:', '/gta5rp-cases/styles.css');
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && window.location.pathname.includes('dashboard.html')) {
    console.log('Инициализация dashboard, текущий пользователь:', currentUser);
    currentUser.lastActive = new Date().toISOString();
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    let players = JSON.parse(localStorage.getItem('players')) || [];
    let player = players.find(p => p.nickname === currentUser.nickname);
    if (player) {
      player.lastActive = currentUser.lastActive;
      localStorage.setItem('players', JSON.stringify(players));
      localStorage.setItem('user_' + currentUser.nickname, JSON.stringify(player));
    }
    document.getElementById('userButtons')?.classList.remove('hidden');
    if (currentUser.isAdmin) {
      console.log('Пользователь является админом, отображаем админ-панель');
      document.getElementById('adminPanelButton')?.classList.remove('hidden');
    } else {
      document.getElementById('adminPanel')?.classList.add('hidden');
      document.getElementById('adminPanelButton')?.classList.add('hidden');
    }
    updateTaskTimer();
    updateNextTaskTimer();
    updateAdminPanel();
    updateLeaderboard();
    updateCasesModal();
  } else if (window.location.pathname.includes('dashboard.html')) {
    console.log('Пользователь не авторизован, перенаправление на index.html');
    window.location.href = 'index.html';
  }

  // Переключение форм входа/регистрации
  const toggleForms = document.getElementById('toggleForms');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const formTitle = document.getElementById('formTitle');
  if (toggleForms) {
    toggleForms.onclick = () => {
      if (loginForm.style.display !== 'none') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        formTitle.textContent = 'Регистрация';
        toggleForms.textContent = 'Есть аккаунт? Войти';
        document.getElementById('loginMessage').textContent = '';
        document.getElementById('registerMessage').textContent = '';
      } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        formTitle.textContent = 'Вход';
        toggleForms.textContent = 'Нет аккаунта? Зарегистрироваться';
        document.getElementById('loginMessage').textContent = '';
        document.getElementById('registerMessage').textContent = '';
      }
    };
  }
});
