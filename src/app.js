const planData = {
  basic: { price: 'R$ 19,90 / mês', label: 'BASIC' },
  pro: { price: 'R$ 39,90 / mês', label: 'PRO' },
  premium: { price: 'R$ 59,90 / mês', label: 'PREMIUM' },
};

const screens = [...document.querySelectorAll('.screen')];
const navButtons = [...document.querySelectorAll('.nav-button')];
const authButtons = [...document.querySelectorAll('.auth-only')];
const adminButtons = [...document.querySelectorAll('.admin-only')];
const headerUser = document.getElementById('headerUser');
const logoutButton = document.getElementById('logoutButton');
const toastMessage = document.getElementById('toastMessage');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const recoveryForm = document.getElementById('recoveryForm');
const onboardingForm = document.getElementById('onboardingForm');
const paymentForm = document.getElementById('paymentForm');
const summaryPlan = document.getElementById('summaryPlan');
const summaryPrice = document.getElementById('summaryPrice');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePlan = document.getElementById('profilePlan');
const adminUsers = document.getElementById('adminUsers');
const goBackButton = document.getElementById('goBackButton');

let currentUser = null;
let selectedPlan = 'pro';
let toastTimer;
let isPopState = false;

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'X-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a solicitação.');
  return data;
}

function showToast(message, variant = 'success') {
  if (!toastMessage) return;
  clearTimeout(toastTimer);
  toastMessage.textContent = message;
  toastMessage.classList.remove('hidden');
  toastMessage.classList.toggle('error', variant === 'error');
  toastMessage.classList.add('show');
  toastTimer = setTimeout(() => {
    toastMessage.classList.remove('show');
    toastMessage.classList.add('hidden');
  }, 3200);
}

function updateAuthState() {
  const signedIn = Boolean(currentUser);
  authButtons.forEach((button) => { button.style.display = signedIn ? 'inline-flex' : 'none'; });
  navButtons.forEach((button) => {
    const target = button.dataset.screen;
    button.style.display = target === 'home' || signedIn ? 'inline-flex' : 'none';
  });
  adminButtons.forEach((button) => {
    button.style.display = currentUser?.role === 'admin' ? 'inline-flex' : 'none';
  });
  if (headerUser) {
    headerUser.classList.toggle('hidden', !signedIn);
    headerUser.textContent = currentUser?.name ?? '';
  }
  document.getElementById('openLogin')?.classList.toggle('hidden', signedIn);
  document.getElementById('openRegister')?.classList.toggle('hidden', signedIn);
  logoutButton?.classList.toggle('hidden', !signedIn);
}

function getStartScreen() {
  if (!currentUser) return 'home';
  return currentUser.hasOnboarded ? 'dashboard' : 'onboarding';
}

function navigateToScreen(screenId) {
  const publicScreens = new Set(['home', 'login', 'register', 'recovery', 'plans']);
  if (!document.getElementById(`screen-${screenId}`)) return;
  if (screenId === 'admin' && currentUser?.role !== 'admin') {
    showToast('Acesso administrativo necessário.', 'error');
    return;
  }
  if (!currentUser && !publicScreens.has(screenId)) {
    showToast('Entre na sua conta para acessar essa área.', 'error');
    return;
  }
  showScreen(screenId);
}

function showScreen(screenId, pushState = true) {
  if (screenId === 'admin' && currentUser?.role !== 'admin') screenId = currentUser ? 'dashboard' : 'home';
  if (!currentUser && !new Set(['home', 'login', 'register', 'recovery', 'plans']).has(screenId)) screenId = 'home';
  const activeScreen = document.getElementById(`screen-${screenId}`);
  if (!activeScreen) screenId = getStartScreen();
  screens.forEach((screen) => screen.classList.toggle('hidden', screen.id !== `screen-${screenId}`));
  navButtons.forEach((button) => {
    if (button.dataset.screen === screenId) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  goBackButton?.classList.toggle('hidden', screenId === 'home');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (screenId === 'payment') updatePaymentSummary();
  if (screenId === 'profile') updateProfileInfo();
  if (screenId === 'onboarding') populateOnboardingForm();
  if (screenId === 'dashboard') renderDashboard();
  if (screenId === 'diets') renderDiets();
  if (screenId === 'training') renderTraining();
  if (screenId === 'progress') renderProgress();
  if (screenId === 'admin') updateAdminPanel();

  if (!pushState) return;
  const state = { screen: screenId };
  if (isPopState) history.replaceState(state, '', `#${screenId}`);
  else history.pushState(state, '', `#${screenId}`);
}

function renderCurrentScreen() {
  showScreen(getStartScreen());
}

async function restoreSession() {
  const { user } = await apiRequest('/api/auth/session');
  currentUser = user;
  updateAuthState();
}

async function migrateLegacyAccounts() {
  const legacyKey = 'fitforje_users';
  const sessionKey = 'fitforje_session';
  let legacyData;
  try {
    legacyData = localStorage.getItem(legacyKey);
  } catch {
    return;
  }
  if (!legacyData) return;

  let users;
  try {
    users = JSON.parse(legacyData);
  } catch {
    showToast('Os dados antigos da conta não puderam ser lidos e foram mantidos no navegador.', 'error');
    return;
  }
  if (!Array.isArray(users)) {
    showToast('O formato das contas antigas não foi reconhecido; os dados foram mantidos.', 'error');
    return;
  }

  try {
    const result = await apiRequest('/api/auth/migrate', {
      method: 'POST',
      body: JSON.stringify({ users }),
    });
    localStorage.removeItem(legacyKey);
    localStorage.removeItem(sessionKey);
    if (result.migrated > 0) showToast('Contas antigas migradas com segurança. Entre novamente para continuar.');
    if (result.skipped > 0) showToast('A conta admin de demonstração ou dados inválidos foram ignorados.', 'error');
  } catch {
    showToast('Não foi possível migrar as contas antigas. Os dados permanecem no navegador.', 'error');
  }
}

function setText(element, value) {
  if (element) element.textContent = value || 'Não informado';
}

function updateProfileInfo() {
  if (!currentUser) return;
  setText(profileName, currentUser.name);
  setText(profileEmail, currentUser.email);
  setText(profilePlan, planData[currentUser.plan]?.label ?? currentUser.plan);
  setText(document.getElementById('profileGoal'), currentUser.objective);
  setText(document.getElementById('profileAge'), currentUser.age ? String(currentUser.age) : 'Não informado');
  setText(document.getElementById('profileSex'), currentUser.sex);
  setText(document.getElementById('profileHeight'), currentUser.height ? `${currentUser.height} cm` : 'Não informado');
  setText(document.getElementById('profileWeight'), currentUser.weight ? `${currentUser.weight} kg` : 'Não informado');
  setText(document.getElementById('profileLocation'), currentUser.trainingLocation);
  setText(document.getElementById('profileIntensity'), currentUser.intensity);
  setText(document.getElementById('profileSchedule'), currentUser.weekDays?.join(', ') || `${currentUser.availabilityDays || 0} dias por semana`);
  setText(document.getElementById('profileFat'), currentUser.fat ? `${currentUser.fat}%` : 'Não informado');
  setText(document.getElementById('profileBMI'), currentUser.bmi ? String(currentUser.bmi) : 'Não calculado');
  setText(document.getElementById('profileWorkouts'), String(currentUser.workoutsCompleted ?? 0));
  setText(document.getElementById('profileWeightStat'), currentUser.weight ? `${currentUser.weight} kg` : 'Não informado');
  setText(document.getElementById('profilePlanTarget'), `Sugestões organizadas para ${currentUser.objective?.toLowerCase() || 'seu objetivo'}, conforme os dados do seu perfil.`);
  renderList(document.getElementById('planTrainingList'), generateTrainingPlan(currentUser));
  renderList(document.getElementById('planMealList'), generateMealPlan(currentUser));
}

function populateOnboardingForm() {
  if (!currentUser || !onboardingForm) return;
  for (const [name, value] of Object.entries(currentUser)) {
    const field = onboardingForm.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
      if (name !== 'weekDays') field.value = value == null ? '' : String(value);
    }
  }
  document.querySelectorAll('[data-week-day]').forEach((input) => {
    input.checked = Array.isArray(currentUser.weekDays) && currentUser.weekDays.includes(input.value);
  });
}

function updatePaymentSummary() {
  if (!summaryPlan || !summaryPrice) return;
  summaryPlan.textContent = planData[selectedPlan].label;
  summaryPrice.textContent = planData[selectedPlan].price;
}

async function updateAdminPanel() {
  if (!adminUsers) return;
  try {
    const stats = await apiRequest('/api/admin/stats');
    adminUsers.textContent = String(stats.users);
  } catch {
    adminUsers.textContent = 'Sem acesso';
  }
}

function renderDashboard() {
  if (!currentUser) return;
  const weight = Number(currentUser.weight) || 0;
  const activity = (currentUser.activityLevel || '').toLowerCase();
  const factor = activity.includes('muito') ? 1.6 : activity.includes('ativo') || activity.includes('moderado') ? 1.4 : 1.2;
  const calories = weight ? Math.round((weight * 24 * factor) / 10) * 10 : null;
  const protein = weight ? Math.round(weight * (currentUser.objective?.toLowerCase().includes('ganho') ? 2 : 1.4)) : null;
  const carbs = calories && protein ? Math.round((calories - protein * 4) * 0.55 / 4) : null;
  const fats = calories && protein && carbs ? Math.round((calories - protein * 4 - carbs * 4) / 9) : null;
  const metrics = document.querySelector('#screen-dashboard .metric-list');
  if (metrics) {
    const values = [calories ?? '—', protein ? `${protein}g` : '—', carbs ? `${carbs}g` : '—', fats ? `${fats}g` : '—'];
    [...metrics.children].forEach((item, index) => {
      const value = item.querySelector('strong');
      if (value) value.textContent = values[index];
    });
  }
  const summary = document.querySelector('#screen-dashboard .progress-summary');
  if (summary) {
    const values = [`${currentUser.workoutsCompleted ?? 0} treinos`, currentUser.weight ? `${currentUser.weight} kg` : '—', currentUser.fat ? `${currentUser.fat}%` : '—'];
    [...summary.children].forEach((item, index) => { item.textContent = values[index]; });
  }
  const recent = document.querySelector('#screen-dashboard .extras-card ul');
  if (recent) {
    recent.replaceChildren();
    const item = document.createElement('li');
    item.textContent = currentUser.lastAction || 'Nenhuma atividade registrada.';
    recent.append(item);
  }
}

function generateTrainingPlan(user) {
  const weekDays = Array.isArray(user.weekDays) ? user.weekDays : [];
  const days = weekDays.length || Number(user.availabilityDays) || 3;
  const sessions = weekDays.length ? weekDays : Array.from({ length: days }, (_, index) => `Dia ${index + 1}`);
  const atHome = (user.trainingLocation || '').includes('Casa');
  const intensity = user.intensity || 'moderada';
  const goal = (user.objective || '').toLowerCase();
  const routine = atHome ? 'circuito com peso corporal' : 'treino de força com cargas ajustadas';
  const focus = goal.includes('ganho') ? 'força e grupos musculares principais' : 'movimentos compostos, mobilidade e condicionamento leve';
  return sessions.slice(0, 7).map((day) => `${day}: ${routine} (${intensity}), com foco em ${focus}.`);
}

function generateMealPlan(user) {
  const goal = (user.objective || '').toLowerCase();
  const meals = goal.includes('ganho')
    ? ['Café: ovos, aveia e fruta.', 'Lanche: iogurte natural e fruta.', 'Almoço: arroz, feijão, proteína e vegetais.', 'Jantar: proteína, legumes e um carboidrato de sua preferência.']
    : ['Café: ovos ou iogurte com fruta e aveia.', 'Lanche: fruta e castanhas, se não houver restrição.', 'Almoço: arroz, feijão, proteína e vegetais.', 'Jantar: uma refeição variada com vegetais e proteína.'];
  const allergies = (user.allergies || '').trim();
  if (allergies) meals.push(`Atenção às restrições informadas: ${allergies}.`);
  return meals;
}

function renderList(container, items) {
  if (!container) return;
  container.replaceChildren();
  items.forEach((value) => {
    const item = document.createElement('li');
    item.textContent = value;
    container.append(item);
  });
}

function renderDiets() {
  const grid = document.querySelector('#screen-diets .meal-grid');
  if (!grid || !currentUser) return;
  grid.replaceChildren();
  generateMealPlan(currentUser).slice(0, 4).forEach((meal) => {
    const [title, ...description] = meal.split(':');
    const article = document.createElement('article');
    article.className = 'card-refeicao';
    const heading = document.createElement('h3');
    const copy = document.createElement('p');
    heading.textContent = title;
    copy.textContent = description.join(':').trim();
    article.append(heading, copy);
    grid.append(article);
  });
}

async function completeWorkout(button, item, title) {
  if (button.disabled || item.classList.contains('completed')) return;
  button.disabled = true;
  try {
    const { user } = await apiRequest('/api/workouts/complete', { method: 'POST', body: JSON.stringify({ title }) });
    currentUser = user;
    updateAuthState();
    item.classList.add('completed');
    button.textContent = 'Concluído';
    showToast('Treino salvo no seu histórico.');
  } catch (error) {
    button.disabled = false;
    showToast(error.message, 'error');
  }
}

function renderTraining() {
  const list = document.querySelector('#screen-training .lista-treinos');
  if (!list || !currentUser) return;
  list.replaceChildren();
  generateTrainingPlan(currentUser).forEach((session) => {
    const [title, ...description] = session.split(':');
    const article = document.createElement('article');
    article.className = 'item-treino';
    const content = document.createElement('div');
    const heading = document.createElement('strong');
    const details = document.createElement('p');
    const button = document.createElement('button');
    heading.textContent = title;
    details.textContent = description.join(':').trim();
    button.type = 'button';
    button.className = 'button tertiary complete-button';
    const completed = currentUser.completedWorkouts?.includes(title);
    button.textContent = completed ? 'Concluído' : 'Marcar como concluído';
    button.disabled = Boolean(completed);
    if (completed) article.classList.add('completed');
    button.addEventListener('click', () => completeWorkout(button, article, title));
    content.append(heading, details);
    article.append(content, button);
    list.append(article);
  });
}

function renderProgress() {
  if (!currentUser) return;
  const cards = document.querySelectorAll('#screen-progress .card-grafico');
  const history = Array.isArray(currentUser.weightHistory) ? currentUser.weightHistory : [];
  const axis = cards[0]?.querySelector('.chart-axis');
  if (!axis) return;
  axis.replaceChildren();
  if (!history.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Atualize seu peso no perfil para começar o histórico.';
    axis.append(empty);
    return;
  }
  const values = history.slice(-5);
  const min = Math.min(...values.map((point) => point.value));
  const max = Math.max(...values.map((point) => point.value));
  values.forEach((point, index) => {
    const marker = document.createElement('div');
    marker.className = 'chart-point';
    const range = max - min || 1;
    marker.style.bottom = `${10 + ((point.value - min) / range) * 70}%`;
    marker.style.left = `${index * (80 / Math.max(values.length - 1, 1))}%`;
    marker.style.width = `${Math.min(160, 100 / values.length)}px`;
    marker.textContent = `${point.value} kg`;
    axis.append(marker);
  });
  const fatAxis = cards[1]?.querySelector('.chart-axis');
  if (fatAxis) {
    fatAxis.replaceChildren();
    const empty = document.createElement('p');
    empty.textContent = 'Nenhum registro informado.';
    fatAxis.append(empty);
  }
}

function updatePasswordButtons() {
  const eyeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeOffIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 2 20 20"/><path d="M10.58 10.58a2 2 0 0 0 2.83 2.83"/><path d="M16.68 16.68A10.94 10.94 0 0 1 12 17.75c-5.75 0-9.5-5.75-9.5-5.75a16.73 16.73 0 0 1 3.2-3.78"/><path d="M9.9 5.24A10.8 10.8 0 0 1 12 5c5.75 0 9.5 5.75 9.5 5.75a16.7 16.7 0 0 1-3.3 3.9"/></svg>';
  document.querySelectorAll('.password-toggle').forEach((button) => {
    button.innerHTML = eyeIcon;
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      const input = target ? document.querySelector(`input[name="${target}"]`) : null;
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      const visible = input.type === 'text';
      button.innerHTML = visible ? eyeOffIcon : eyeIcon;
      button.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
      button.setAttribute('title', visible ? 'Ocultar senha' : 'Mostrar senha');
      button.setAttribute('aria-pressed', String(visible));
    });
  });
}

function attachEvents() {
  document.querySelectorAll('[data-screen]').forEach((button) => {
    button.addEventListener('click', () => navigateToScreen(button.dataset.screen));
  });

  document.querySelectorAll('.botao-selecionar-plano').forEach((button) => {
    button.addEventListener('click', () => {
      const plan = button.closest('.card-plano')?.dataset.plan;
      if (!planData[plan]) return;
      selectedPlan = plan;
      updatePaymentSummary();
      showScreen('payment');
    });
  });

  onboardingForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(onboardingForm);
    const profile = {
      age: Number(form.get('age')),
      sex: String(form.get('sex') ?? ''),
      height: Number(form.get('height')),
      weight: Number(form.get('weight')),
      objective: String(form.get('objective') ?? ''),
      activityLevel: String(form.get('activityLevel') ?? ''),
      availabilityDays: Number(form.get('availabilityDays')),
      hoursPerDay: Number(form.get('hoursPerDay')),
      weekDays: [...document.querySelectorAll('[data-week-day]:checked')].map((input) => input.dataset.weekDay),
      trainingLocation: String(form.get('trainingLocation') ?? ''),
      intensity: String(form.get('intensity') ?? ''),
      allergies: String(form.get('allergies') ?? '').trim(),
    };
    try {
      const { user } = await apiRequest('/api/profile/onboarding', { method: 'POST', body: JSON.stringify(profile) });
      currentUser = user;
      updateAuthState();
      showToast('Perfil salvo. Suas sugestões estão prontas.');
      showScreen('plans');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(loginForm);
    try {
      const { user } = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: String(form.get('loginEmail') ?? '').trim(), password: String(form.get('loginPassword') ?? '') }),
      });
      currentUser = user;
      updateAuthState();
      renderCurrentScreen();
      showToast(`Bem-vindo, ${user.name}!`);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(registerForm);
    const password = String(form.get('registerPassword') ?? '');
    const confirm = String(form.get('registerConfirmPassword') ?? '');
    if (password !== confirm) {
      showToast('As senhas não correspondem.', 'error');
      return;
    }
    try {
      const { user } = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: String(form.get('registerName') ?? '').trim(),
          email: String(form.get('registerEmail') ?? '').trim(),
          password,
        }),
      });
      currentUser = user;
      updateAuthState();
      showScreen('onboarding');
      showToast('Conta criada. Complete seu perfil para continuar.');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  recoveryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = String(new FormData(recoveryForm).get('recoveryEmail') ?? '').trim();
    try {
      await apiRequest('/api/recovery', { method: 'POST', body: JSON.stringify({ email }) });
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  paymentForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) {
      showToast('Entre na sua conta antes de continuar.', 'error');
      showScreen('login');
      return;
    }
    try {
      await apiRequest('/api/checkout', { method: 'POST', body: JSON.stringify({ plan: selectedPlan }) });
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  logoutButton?.addEventListener('click', async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      currentUser = null;
      updateAuthState();
      showScreen('home');
      showToast('Você saiu da conta.');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  goBackButton?.addEventListener('click', () => history.back());
  window.addEventListener('popstate', (event) => {
    isPopState = true;
    showScreen(event.state?.screen || window.location.hash.slice(1) || getStartScreen(), false);
    isPopState = false;
  });
  updatePasswordButtons();
}

async function init() {
  attachEvents();
  try {
    await migrateLegacyAccounts();
    await restoreSession();
  } catch {
    currentUser = null;
    updateAuthState();
    showToast('Não foi possível conectar ao servidor. Tente recarregar a página.', 'error');
  }
  const requestedScreen = window.location.hash.slice(1);
  const publicScreens = new Set(['home', 'login', 'register', 'recovery', 'plans']);
  const startScreen = requestedScreen && (currentUser || publicScreens.has(requestedScreen)) ? requestedScreen : getStartScreen();
  isPopState = true;
  showScreen(startScreen, false);
  isPopState = false;
}

void init();