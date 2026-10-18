type PlanKey = 'basic' | 'pro' | 'premium';

type UserSchema = {
  name: string;
  email: string;
  password: string;
  plan: PlanKey;
  isAdmin: boolean;
  weight: number;
  fat: number;
  bmi: number;
  goal: string;
  workoutsCompleted: number;
  lastAction: string;
};

const storageUsers = 'fitforje_users';
const storageSession = 'fitforje_session';

const planData: Record<PlanKey, { price: string; label: string; description: string }> = {
  basic: { price: 'R$ 19,90 / mês', label: 'BASIC', description: 'Básico para começar com treinos simples e acompanhamento leve.' },
  pro: { price: 'R$ 39,90 / mês', label: 'PRO', description: 'Ideal para quem quer ganhar força com acompanhamento estruturado.' },
  premium: { price: 'R$ 59,90 / mês', label: 'PREMIUM', description: 'Pacote completo com treinos avançados, dieta e acompanhamento premium.' },
};

const screens = Array.from(document.querySelectorAll<HTMLElement>('.screen'));
const navButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.nav-button'));
const authButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.auth-only'));
const adminButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.admin-only'));
const headerUser = document.getElementById('headerUser');
const openLogin = document.getElementById('openLogin');
const openRegister = document.getElementById('openRegister');
const toastMessage = document.getElementById('toastMessage');

const loginForm = document.getElementById('loginForm') as HTMLFormElement | null;
const registerForm = document.getElementById('registerForm') as HTMLFormElement | null;
const recoveryForm = document.getElementById('recoveryForm') as HTMLFormElement | null;
const paymentForm = document.getElementById('paymentForm') as HTMLFormElement | null;
const summaryPlan = document.getElementById('summaryPlan');
const summaryPrice = document.getElementById('summaryPrice');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePlan = document.getElementById('profilePlan');
const profileWeight = document.getElementById('profileWeight');
const profileFat = document.getElementById('profileFat');
const profileBMI = document.getElementById('profileBMI');
const adminUsers = document.getElementById('adminUsers');

let currentUser: UserSchema | null = null;
let selectedPlan: PlanKey = 'pro';

function loadUsers(): UserSchema[] {
  const data = localStorage.getItem(storageUsers);
  if (!data) {
    const defaults: UserSchema[] = [
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
    return JSON.parse(data) as UserSchema[];
  } catch {
    return [];
  }
}

function saveUsers(users: UserSchema[]) {
  localStorage.setItem(storageUsers, JSON.stringify(users));
}

function getUsers(): UserSchema[] {
  return loadUsers();
}

function findUser(email: string): UserSchema | null {
  return getUsers().find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

function setCurrentUser(user: UserSchema | null) {
  currentUser = user;
  if (user) {
    localStorage.setItem(storageSession, user.email);
  } else {
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
    } else {
      headerUser.classList.add('hidden');
      openLogin?.classList.remove('hidden');
      openRegister?.classList.remove('hidden');
    }
  }

  const isAdmin = currentUser?.isAdmin ?? false;
  adminButtons.forEach((button) => {
    button.style.display = isAdmin ? 'inline-flex' : 'none';
  });
}

function showScreen(screenId: string) {
  screens.forEach((screen) => {
    screen.classList.toggle('hidden', screen.id !== `screen-${screenId}`);
  });

  const current = document.getElementById(`screen-${screenId}`);
  if (current && screenId === 'payment') {
    updatePaymentSummary();
  }
  if (current && screenId === 'profile') {
    updateProfileInfo();
  }
  if (current && screenId === 'admin') {
    updateAdminPanel();
  }
}

function renderCurrentScreen() {
  if (!currentUser) {
    showScreen('home');
  } else {
    showScreen('dashboard');
  }
}

function showToast(message: string) {
  if (!toastMessage) return;
  toastMessage.textContent = message;
  toastMessage.classList.add('show');
  setTimeout(() => toastMessage.classList.remove('show'), 2600);
}

function updateProfileInfo() {
  if (!currentUser) return;
  profileName?.replaceChildren(currentUser.name);
  profileEmail?.replaceChildren(currentUser.email);
  profilePlan?.replaceChildren(planData[currentUser.plan].label);
  profileWeight?.replaceChildren(`${currentUser.weight} kg`);
  profileFat?.replaceChildren(`${currentUser.fat}%`);
  profileBMI?.replaceChildren(`${currentUser.bmi}`);
}

function updatePaymentSummary() {
  if (!summaryPlan || !summaryPrice) return;
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

function attachNavigation() {
  document.querySelectorAll<HTMLButtonElement>('[data-screen]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.screen;
      if (target) {
        if (target !== 'home' && !currentUser && target !== 'login' && target !== 'register' && target !== 'recovery' && target !== 'plans') {
          showToast('Faça login para acessar esta área.');
          return;
        }
        showScreen(target);
      }
    });
  });

  openLogin?.addEventListener('click', () => showScreen('login'));
  openRegister?.addEventListener('click', () => showScreen('register'));

  document.querySelectorAll<HTMLButtonElement>('.plan-select').forEach((button) => {
    button.addEventListener('click', () => {
      const plan = button.closest('.plan-card')?.getAttribute('data-plan') as PlanKey | null;
      if (plan) {
        selectedPlan = plan;
        showToast(`${planData[plan].label} selecionado.`);
        showScreen('payment');
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.complete-button').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.training-item');
      if (!item) return;
      item.classList.toggle('completed');
      button.textContent = item.classList.contains('completed') ? 'Concluído' : 'Marcar como concluído';
      if (button.textContent === 'Concluído') {
        showToast('Treino marcado como concluído. Bom trabalho!');
      }
    });
  });
}

function attachForms() {
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
    const newUser: UserSchema = {
      name,
      email,
      password,
      plan: 'basic',
      isAdmin: false,
      weight: 84,
      fat: 22,
      bmi: 27.4,
      goal: 'Perda de gordura',
      workoutsCompleted: 0,
      lastAction: 'Novo cadastrado',
    };
    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);
    showToast('Conta criada com sucesso! Agora você pode escolher seu plano.');
    showScreen('plans');
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

  document.querySelectorAll<HTMLButtonElement>('#loginGoogle').forEach((button) => {
    button.addEventListener('click', () => {
      showToast('Integração com Google não disponível no demo.');
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.link-button').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.screen;
      if (target) showScreen(target);
    });
  });

  showScreen('home');
}

init();
