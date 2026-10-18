const storageUsers = "fitforje_users";
const storageSession = "fitforje_session";
const planData = {
  basic: { price: "R$ 19,90 / mês", label: "BASIC", description: "Básico para começar com treinos simples e acompanhamento leve." },
  pro: { price: "R$ 39,90 / mês", label: "PRO", description: "Ideal para quem quer ganhar força com acompanhamento estruturado." },
  premium: { price: "R$ 59,90 / mês", label: "PREMIUM", description: "Pacote completo com treinos avançados, dieta e acompanhamento premium." },
};
const screens = Array.from(document.querySelectorAll('.screen'));
const navButtons = Array.from(document.querySelectorAll('.nav-button'));
const authButtons = Array.from(document.querySelectorAll('.auth-only'));
const adminButtons = Array.from(document.querySelectorAll('.admin-only'));
const headerUser = document.getElementById('headerUser');
const logoutButton = document.getElementById('logoutButton');
const openLogin = document.getElementById('openLogin');
const openRegister = document.getElementById('openRegister');
const toastMessage = document.getElementById('toastMessage');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const recoveryForm = document.getElementById('recoveryForm');
const paymentForm = document.getElementById('paymentForm');
const summaryPlan = document.getElementById('summaryPlan');
const summaryPrice = document.getElementById('summaryPrice');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePlan = document.getElementById('profilePlan');
const profileGoal = document.getElementById('profileGoal');
const profileAge = document.getElementById('profileAge');
const profileSex = document.getElementById('profileSex');
const profileHeight = document.getElementById('profileHeight');
const profileWeight = document.getElementById('profileWeight');
const profileLocation = document.getElementById('profileLocation');
const profileIntensity = document.getElementById('profileIntensity');
const profileSchedule = document.getElementById('profileSchedule');
const profileFat = document.getElementById('profileFat');
const profileBMI = document.getElementById('profileBMI');
const profilePlanTarget = document.getElementById('profilePlanTarget');
const planTrainingList = document.getElementById('planTrainingList');
const planMealList = document.getElementById('planMealList');
const adminUsers = document.getElementById('adminUsers');
const onboardingForm = document.getElementById('onboardingForm');
const goBackButton = document.getElementById('goBackButton');
let currentUser = null;
let selectedPlan = 'pro';
let currentScreen = 'home';
let isPopState = false;
function loadUsers() {
  const data = localStorage.getItem(storageUsers);
  if (!data) {
    const defaults = [
      {
        name: 'Admin Fit',
        email: 'admin@fitforje.com',
        password: 'admin123',
        plan: 'premium',
        isAdmin: true,
        weight: 78,
        fat: 14,
        bmi: 25.5,
        goal: 'Hipertrofia',
        workoutsCompleted: 15,
        lastAction: 'Plano premium ativo',
      },
    ];
    localStorage.setItem(storageUsers, JSON.stringify(defaults));
    return defaults;
  }
  try {
    return JSON.parse(data);
  }
  catch {
    return [];
  }
}
function saveUsers(users) {
  localStorage.setItem(storageUsers, JSON.stringify(users));
}
function getUsers() {
  return loadUsers();
}
function findUser(email) {
  return getUsers().find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}
function setCurrentUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem(storageSession, user.email);
  }
  else {
    localStorage.removeItem(storageSession);
  }
  updateAuthState();
  renderCurrentScreen();
}
function restoreSession() {
  const activeEmail = localStorage.getItem(storageSession);
  if (!activeEmail) {
    setCurrentUser(null);
    return;
  }
  const user = findUser(activeEmail);
  setCurrentUser(user);
}
function updateAuthState() {
  const signedIn = Boolean(currentUser);
  authButtons.forEach((button) => {
    button.style.display = signedIn ? 'inline-flex' : 'none';
  });
  navButtons.forEach((button) => {
    const target = button.dataset.screen;
    if (target === 'home') {
      button.style.display = 'inline-flex';
      return;
    }
    button.style.display = signedIn ? 'inline-flex' : 'none';
  });
  if (headerUser) {
    if (signedIn && currentUser) {
      headerUser.classList.remove('hidden');
      headerUser.textContent = currentUser.name;
      openLogin?.classList.add('hidden');
      openRegister?.classList.add('hidden');
      logoutButton?.classList.remove('hidden');
    }
    else {
      headerUser.classList.add('hidden');
      openLogin?.classList.remove('hidden');
      openRegister?.classList.remove('hidden');
      logoutButton?.classList.add('hidden');
    }
  }
  const isAdmin = currentUser?.isAdmin ?? false;
  adminButtons.forEach((button) => {
    button.style.display = isAdmin ? 'inline-flex' : 'none';
  });
}
function updateBackButton(screenId) {
  if (!goBackButton)
    return;
  const hideOn = ['home'];
  goBackButton.classList.toggle('hidden', hideOn.includes(screenId));
}

function showScreen(screenId, pushState = true) {
  screens.forEach((screen) => {
    screen.classList.toggle('hidden', screen.id !== `screen-${screenId}`);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  currentScreen = screenId;
  const current = document.getElementById(`screen-${screenId}`);
  if (current && screenId === 'payment') {
    updatePaymentSummary();
  }
  if (current && screenId === 'profile') {
    updateProfileInfo();
  }
  if (current && screenId === 'onboarding') {
    populateOnboardingForm();
  }
  if (current && screenId === 'dashboard') {
    renderDashboard();
  }
  if (current && screenId === 'diets') {
    renderDiets();
  }
  if (current && screenId === 'training') {
    renderTraining();
  }
  if (current && screenId === 'progress') {
    renderProgress();
  }
  if (current && screenId === 'admin') {
    updateAdminPanel();
  }
  updateBackButton(screenId);
  if (!pushState)
    return;
  if (isPopState) {
    history.replaceState({ screen: screenId }, '', `#${screenId}`);
  }
  else {
    history.pushState({ screen: screenId }, '', `#${screenId}`);
  }
}
function renderCurrentScreen() {
  if (!currentUser) {
    showScreen('home');
  }
  else if (!currentUser.hasOnboarded) {
    showScreen('onboarding');
  }
  else {
    showScreen('dashboard');
  }
}
function getStartScreen() {
  if (!currentUser) {
    return 'home';
  }
  return currentUser.hasOnboarded ? 'dashboard' : 'onboarding';
}
function showToast(message) {
  if (!toastMessage)
    return;
  toastMessage.textContent = message;
  toastMessage.classList.add('show');
  setTimeout(() => toastMessage.classList.remove('show'), 2600);
}
function updateProfileInfo() {
  if (!currentUser)
    return;
  if (profileName)
    profileName.replaceChildren(currentUser.name);
  if (profileEmail)
    profileEmail.replaceChildren(currentUser.email);
  if (profilePlan)
    profilePlan.replaceChildren(planData[currentUser.plan].label);
  if (profileGoal)
    profileGoal.replaceChildren(currentUser.objective);
  if (profileAge)
    profileAge.replaceChildren(String(currentUser.age));
  if (profileSex)
    profileSex.replaceChildren(currentUser.sex);
  if (profileHeight)
    profileHeight.replaceChildren(`${currentUser.height} cm`);
  if (profileWeight)
    profileWeight.replaceChildren(`${currentUser.weight} kg`);
  if (profileLocation)
    profileLocation.replaceChildren(currentUser.trainingLocation);
  if (profileIntensity)
    profileIntensity.replaceChildren(currentUser.intensity);
  if (profileSchedule)
    profileSchedule.replaceChildren(currentUser.weekDays.join(', ') || `${currentUser.availabilityDays} dias por semana`);
  if (profileFat)
    profileFat.replaceChildren(`${currentUser.fat}%`);
  if (profileBMI)
    profileBMI.replaceChildren(`${currentUser.bmi}`);
  if (profilePlanTarget)
    profilePlanTarget.replaceChildren(`Treino e dieta personalizados para ${currentUser.objective.toLowerCase()}, ${currentUser.availabilityDays}x na semana.`);
  if (planTrainingList)
    renderList(planTrainingList, generateTrainingPlan(currentUser));
  if (planMealList)
    renderList(planMealList, generateMealPlan(currentUser));
}
function populateOnboardingForm() {
  if (!currentUser || !onboardingForm)
    return;
  const setField = (name, value) => {
    const element = onboardingForm.querySelector(`[name="${name}"]`);
    if (!element)
      return;
    if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
      element.value = String(value ?? '');
    }
  };
  setField('age', currentUser.age || '');
  setField('sex', currentUser.sex || '');
  setField('height', currentUser.height || '');
  setField('weight', currentUser.weight || '');
  setField('objective', currentUser.objective || '');
  setField('activityLevel', currentUser.activityLevel || '');
  setField('availabilityDays', currentUser.availabilityDays || '');
  setField('hoursPerDay', currentUser.hoursPerDay || '');
  setField('trainingLocation', currentUser.trainingLocation || '');
  setField('intensity', currentUser.intensity || '');
  setField('allergies', currentUser.allergies || '');
  document.querySelectorAll('input[name="weekDays"]').forEach((input) => {
    if (input instanceof HTMLInputElement) {
      input.checked = currentUser.weekDays?.includes(input.value);
    }
  });
}
function updatePaymentSummary() {
  if (!summaryPlan || !summaryPrice)
    return;
  const plan = planData[selectedPlan];
  summaryPlan.textContent = plan.label;
  summaryPrice.textContent = plan.price;
}
function updateAdminPanel() {
  const users = getUsers();
  if (adminUsers) {
    adminUsers.textContent = String(users.length);
  }
}
 
// Renderizações que usam dados reais do usuário
function renderDashboard() {
  if (!currentUser) return;
  const dashboardEl = document.getElementById('screen-dashboard');
  if (!dashboardEl) return;

  // Estimativas simples a partir dos dados do usuário
  const weight = Number(currentUser.weight) || 0;
  const activity = (currentUser.activityLevel || '').toLowerCase();
  let factor = 1.2;
  if (activity.includes('moderado') || activity.includes('ativo')) factor = 1.4;
  if (activity.includes('muito')) factor = 1.6;
  const calories = Math.round((weight * 24) * factor / 10) * 10;
  const protein = Math.round(weight * (currentUser.objective && currentUser.objective.toLowerCase().includes('ganho') ? 2.0 : 1.4));
  const carbs = Math.round((calories - protein * 4) * 0.55 / 4);
  const fats = Math.round((calories - (protein * 4) - (carbs * 4)) / 9);

  const metricList = dashboardEl.querySelector('.metric-list');
  if (metricList) {
    metricList.innerHTML = `
      <div><strong>${calories}</strong><span>Calorias</span></div>
      <div><strong>${protein}g</strong><span>Proteínas</span></div>
      <div><strong>${carbs}g</strong><span>Carboidratos</span></div>
      <div><strong>${fats}g</strong><span>Gorduras</span></div>
    `;
  }

  const progressSummary = dashboardEl.querySelector('.progress-summary');
  if (progressSummary) {
    const workouts = currentUser.workoutsCompleted ?? 0;
    const w = currentUser.weight ? `${currentUser.weight}kg` : '-';
    const f = currentUser.fat ? `${currentUser.fat}%` : '-';
    progressSummary.innerHTML = `<span>${workouts} treinos</span><span>${w}</span><span>${f}</span>`;
  }

  const extras = dashboardEl.querySelector('.extras-card ul');
  if (extras) {
    extras.replaceChildren();
    const last = currentUser.lastAction ? String(currentUser.lastAction) : 'Sem ações recentes';
    const li = document.createElement('li');
    li.textContent = last;
    extras.appendChild(li);
  }
}

function renderDiets() {
  if (!currentUser) return;
  const grid = document.querySelector('#screen-diets .meal-grid');
  if (!grid) return;
  const meals = generateMealPlan(currentUser);
  const principais = meals.filter((m) => /Café|Almoço|Lanche|Jantar/i.test(m)).slice(0, 4);
  grid.replaceChildren();
  principais.forEach((text) => {
    const article = document.createElement('article');
    article.className = 'card-refeicao';
    const parts = text.split(':');
    const title = parts[0] || 'Refeição';
    const desc = parts.slice(1).join(':') || '';
    article.innerHTML = `<h3>${title}</h3><p>${desc.trim()}</p><span>- kcal</span>`;
    grid.appendChild(article);
  });
}

function renderTraining() {
  if (!currentUser) return;
  const list = document.querySelector('#screen-training .lista-treinos');
  if (!list) return;
  const sessions = generateTrainingPlan(currentUser);
  list.replaceChildren();
  sessions.forEach((sess) => {
    const article = document.createElement('article');
    article.className = 'item-treino';
    const div = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = sess.split(':')[0];
    const p = document.createElement('p');
    p.textContent = sess.split(':').slice(1).join(':').trim();
    div.appendChild(strong);
    div.appendChild(p);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'button tertiary complete-button';
    btn.textContent = 'Marcar como concluído';
    btn.addEventListener('click', () => {
      article.classList.toggle('completed');
      btn.textContent = article.classList.contains('completed') ? 'Concluído' : 'Marcar como concluído';
      if (btn.textContent === 'Concluído') {
        showToast('Treino marcado como concluído. Bom trabalho!');
        const users = getUsers();
        const profile = users.find((u) => u.email === currentUser.email);
        if (profile) {
          profile.workoutsCompleted = (profile.workoutsCompleted || 0) + 1;
          profile.lastAction = `Treino concluído: ${strong.textContent}`;
          saveUsers(users);
          setCurrentUser(profile);
        }
      }
    });
    article.appendChild(div);
    article.appendChild(btn);
    list.appendChild(article);
  });
}

function renderProgress() {
  if (!currentUser) return;
  const charts = document.querySelectorAll('#screen-progress .card-grafico');
  const weightHistory = currentUser.weightHistory || [{ date: new Date().toISOString(), value: currentUser.weight }];
  const fatHistory = currentUser.fatHistory || [{ date: new Date().toISOString(), value: currentUser.fat }];
  if (charts[0]) {
    const axis = charts[0].querySelector('.chart-axis');
    axis.replaceChildren();
    weightHistory.slice(-5).forEach((pt) => {
      const el = document.createElement('div');
      el.className = 'chart-point';
      const percent = Math.min(90, Math.max(5, ((pt.value || currentUser.weight) - 40) / 50 * 100));
      el.style.bottom = `${percent}%`;
      el.textContent = `${pt.value}kg`;
      axis.appendChild(el);
    });
  }
  if (charts[1]) {
    const axis = charts[1].querySelector('.chart-axis');
    axis.replaceChildren();
    fatHistory.slice(-5).forEach((pt) => {
      const el = document.createElement('div');
      el.className = 'chart-point';
      const percent = Math.min(90, Math.max(5, ((pt.value || currentUser.fat) / 40) * 100));
      el.style.bottom = `${percent}%`;
      el.textContent = `${pt.value}%`;
      axis.appendChild(el);
    });
  }
}
function navigateToScreen(target) {
  if (target !== 'home' && !currentUser && target !== 'login' && target !== 'register' && target !== 'recovery' && target !== 'plans') {
    showToast('Faça login para acessar esta área.');
    return;
  }
  showScreen(target);
}

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
}

function renderList(container, items) {
  container.replaceChildren();
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    container.appendChild(li);
  });
}

function generateTrainingPlan(user) {
  const days = user.weekDays.length || user.availabilityDays || 3;
  const home = user.trainingLocation.includes('Casa');
  const goal = user.objective.toLowerCase();
  const intensity = user.intensity.toLowerCase();
  const sessionLength = user.hoursPerDay >= 1.5 ? 'sessão de 60 minutos' : 'sessão de 40 minutos';
  const sessions = [];
  const dayNames = user.weekDays.length ? user.weekDays : Array.from({ length: days }, (_, i) => `Dia ${i + 1}`);

  const baseStrength = home
    ? `treino em circuito com peso corporal (${intensity})` 
    : `treino de força com cargas moderadas (${intensity})`;

  const goals = {
    emagrecer: [`Aquecimento dinâmico`, `${baseStrength}: agachamento, flexões, burpees, prancha`, `cardio intervalado`],
    'perder gordura': [`Aquecimento dinâmico`, `${baseStrength}: agachamento, flexões, burpees, prancha`, `cardio intervalado`],
    'ganho de massa': [`Aquecimento de mobilidade`, `${baseStrength}: supino, remada, agachamento, desenvolvimento`, `abdominais e alongamento`],
    'definir/ficar shapado': [`Aquecimento de mobilidade`, `${baseStrength}: agachamento, avanço, puxada, elevação lateral`, `core e alongamento`],
  };

  for (let i = 0; i < days; i += 1) {
    const day = dayNames[i] || `Dia ${i + 1}`;
    const parts = goals[goal] || goals['definir/ficar shapado'];
    const extra = goal.includes('emagrecer') || goal.includes('perder gordura') ? ` + ${Math.max(20, user.hoursPerDay * 15)} min de cardio leve` : '';
    sessions.push(`${day}: ${parts[0]}, ${parts[1]}, ${parts[2]} (${sessionLength})${extra}`);
  }
  return sessions;
}

function generateMealPlan(user) {
  const target = user.objective.toLowerCase();
  const calories = target.includes('ganho de massa') ? '2.300 kcal' : target.includes('emagrecer') || target.includes('perder gordura') ? '1.700 kcal' : '2.000 kcal';
  const protein = target.includes('ganho de massa') ? 'foco em proteína magra' : 'equilíbrio entre proteínas e fibras';
  const allergyNote = user.allergies ? `Atenção: evite ${user.allergies}.` : 'Sem restrições alimentares específicas.';
  const mealOptions = [];

  if (target.includes('emagrecer') || target.includes('perder gordura')) {
    mealOptions.push('Café: omelete de claras com espinafre e pão integral.');
    mealOptions.push('Lanche: iogurte natural com chia e morangos.');
    mealOptions.push('Almoço: frango grelhado, salada colorida e batata-doce.');
    mealOptions.push('Lanche 2: mix de castanhas e cenoura.');
    mealOptions.push('Jantar: peixe assado com legumes no vapor.');
  }
  else if (target.includes('ganho de massa')) {
    mealOptions.push('Café: ovos, aveia com banana e mel.');
    mealOptions.push('Lanche: shake de proteína e frutas.');
    mealOptions.push('Almoço: arroz integral, feijão, carne vermelha magra e brócolis.');
    mealOptions.push('Lanche 2: sanduíche integral com peito de peru e queijo branco.');
    mealOptions.push('Jantar: macarrão integral com frango grelhado e legumes.');
  }
  else {
    mealOptions.push('Café: smoothie verde com whey e aveia.');
    mealOptions.push('Lanche: frutas, castanhas e iogurte.');
    mealOptions.push('Almoço: salada com quinoa, frango e abacate.');
    mealOptions.push('Lanche 2: wraps integrais com atum ou frango.');
    mealOptions.push('Jantar: omelete com legumes variados e batata doce.');
  }

  mealOptions.push(`Meta diária: ${calories}, ${protein}.`);
  mealOptions.push(allergyNote);
  return mealOptions;
}

function attachNavigation() {
  document.querySelectorAll('[data-screen]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.screen;
      if (target) {
        navigateToScreen(target);
      }
    });
  });
  document.querySelectorAll('.botao-selecionar-plano').forEach((button) => {
    button.addEventListener('click', () => {
      const plan = button.closest('.card-plano')?.getAttribute('data-plan');
      if (plan) {
        selectedPlan = plan;
        showToast(`${planData[plan].label} selecionado.`);
        showScreen('payment');
      }
    });
  });
  document.querySelectorAll('.complete-button').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.item-treino');
      if (!item)
        return;
      item.classList.toggle('completed');
      button.textContent = item.classList.contains('completed') ? 'Concluído' : 'Marcar como concluído';
      if (button.textContent === 'Concluído') {
        showToast('Treino marcado como concluído. Bom trabalho!');
      }
    });
  });
}
function attachPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-target');
      if (!target)
        return;
      const input = document.querySelector(`input[name="${target}"]`);
      if (!input)
        return;
      if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
        button.setAttribute('aria-label', 'Ocultar senha');
      }
      else {
        input.type = 'password';
        button.textContent = '👁';
        button.setAttribute('aria-label', 'Mostrar senha');
      }
    });
  });
}

function attachForms() {
  onboardingForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(onboardingForm);
    const age = Number(formData.get('age'));
    const sex = String(formData.get('sex') ?? 'Outro');
    const height = Number(formData.get('height'));
    const weight = Number(formData.get('weight'));
    const objective = String(formData.get('objective') ?? 'Emagrecer');
    const activityLevel = String(formData.get('activityLevel') ?? 'Moderado');
    const availabilityDays = Number(formData.get('availabilityDays'));
    const hoursPerDay = Number(formData.get('hoursPerDay'));
    const weekDays = getCheckedValues('weekDays');
    const trainingLocation = String(formData.get('trainingLocation') ?? 'Casa');
    const intensity = String(formData.get('intensity') ?? 'Moderada');
    const allergies = String(formData.get('allergies') ?? 'Nenhuma');
    if (!currentUser) {
      showToast('Erro interno. Faça login novamente.');
      return;
    }
    const users = getUsers();
    const profile = users.find((user) => user.email === currentUser?.email);
    if (profile) {
      profile.age = age;
      profile.sex = sex;
      profile.height = height;
      profile.weight = weight;
      profile.objective = objective;
      profile.activityLevel = activityLevel;
      profile.availabilityDays = availabilityDays;
      profile.hoursPerDay = hoursPerDay;
      profile.weekDays = weekDays;
      profile.trainingLocation = trainingLocation;
      profile.intensity = intensity;
      profile.allergies = allergies;
      profile.fat = Math.round(weight * 0.18);
      profile.bmi = Math.round((weight / ((height / 100) ** 2)) * 10) / 10;
      profile.hasOnboarded = true;
      profile.lastAction = 'Onboarding completo';
      saveUsers(users);
      setCurrentUser(profile);
    }
    showToast('Perfil atualizado! Agora escolha seu plano.');
    showScreen('plans');
  });

  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const email = String(formData.get('loginEmail') ?? '').trim();
    const password = String(formData.get('loginPassword') ?? '').trim();
    const user = findUser(email);
    if (!user || user.password !== password) {
      showToast('E-mail ou senha inválidos.');
      return;
    }
    setCurrentUser(user);
    showToast(`Bem-vindo, ${user.name}!`);
  });
  registerForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const name = String(formData.get('registerName') ?? '').trim();
    const email = String(formData.get('registerEmail') ?? '').trim();
    const password = String(formData.get('registerPassword') ?? '').trim();
    const confirm = String(formData.get('registerConfirmPassword') ?? '').trim();
    if (password !== confirm) {
      showToast('As senhas não correspondem.');
      return;
    }
    if (findUser(email)) {
      showToast('Já existe uma conta com este e-mail.');
      return;
    }
    const users = getUsers();
    const newUser = {
      name,
      email,
      password,
      plan: 'basic',
      isAdmin: false,
      age: 0,
      sex: 'Outro',
      height: 0,
      weight: 0,
      fat: 0,
      bmi: 0,
      objective: 'Emagrecer',
      activityLevel: 'Moderado',
      availabilityDays: 0,
      hoursPerDay: 0,
      weekDays: [],
      trainingLocation: 'Casa',
      intensity: 'Moderada',
      allergies: 'Nenhuma',
      hasOnboarded: false,
      workoutsCompleted: 0,
      lastAction: 'Novo cadastrado',
    };
    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);
    showToast('Conta criada com sucesso! Complete seu perfil para um plano personalizado.');
    showScreen('onboarding');
  });
  recoveryForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(recoveryForm);
    const email = String(formData.get('recoveryEmail') ?? '').trim();
    const user = findUser(email);
    if (!user) {
      showToast('E-mail não encontrado.');
      return;
    }
    showToast('Instruções de recuperação enviadas para seu e-mail.');
    showScreen('login');
  });
  paymentForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!currentUser) {
      showToast('Faça login antes de concluir a compra.');
      showScreen('login');
      return;
    }
    const users = getUsers();
    const profile = users.find((user) => user.email === currentUser?.email);
    if (profile) {
      profile.plan = selectedPlan;
      profile.lastAction = `Assinatura ${planData[selectedPlan].label}`;
      saveUsers(users);
      setCurrentUser(profile);
    }
    showToast('Pagamento realizado com sucesso! Plano ativo.');
    showScreen('dashboard');
  });
}
function init() {
  attachNavigation();
  attachForms();
  restoreSession();
  const hashScreen = window.location.hash.replace('#', '');
  const startScreen = hashScreen || getStartScreen();
  isPopState = true;
  showScreen(startScreen, false);
  isPopState = false;
  window.addEventListener('popstate', (event) => {
    const target = event.state?.screen || window.location.hash.replace('#', '') || 'home';
    isPopState = true;
    showScreen(target, false);
    isPopState = false;
  });
  goBackButton?.addEventListener('click', () => {
    history.back();
  });
  document.querySelectorAll('#loginGoogle').forEach((button) => {
    button.addEventListener('click', () => {
      showToast('Integração com Google não disponível no demo.');
    });
  });
  document.querySelectorAll('.botao-link').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.screen;
      if (target)
        navigateToScreen(target);
    });
  });
  logoutButton?.addEventListener('click', () => {
    setCurrentUser(null);
    showToast('Você saiu da conta.');
    showScreen('home');
  });
  attachPasswordToggles();
}
init();
