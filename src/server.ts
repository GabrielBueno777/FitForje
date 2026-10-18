import { createHash, randomBytes, randomUUID } from 'node:crypto';
import frontend from './index.html';
import { db } from './db.ts';

type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  plan: 'basic' | 'pro' | 'premium';
  profile_json: string;
  workouts_completed: number;
  last_action: string;
  created_at: number;
};

type UserProfile = {
  age: number | null;
  sex: string;
  height: number | null;
  weight: number | null;
  objective: string;
  activityLevel: string;
  availabilityDays: number | null;
  hoursPerDay: number | null;
  weekDays: string[];
  trainingLocation: string;
  intensity: string;
  allergies: string;
  fat: number | null;
  bmi: number | null;
  weightHistory: Array<{ date: string; value: number }>;
  fatHistory: Array<{ date: string; value: number }>;
  hasOnboarded: boolean;
};

const sessionCookie = 'fitforje_session';
const sessionDuration = 14 * 24 * 60 * 60 * 1000;
const allowedPlans = new Set(['basic', 'pro', 'premium']);
const allowedWeekDays = new Set(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']);

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function getCookie(request: Request, name: string): string | null {
  const prefix = `${name}=`;
  const value = request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function cookieHeader(request: Request, token: string, maxAge: number) {
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const secure = new URL(request.url).protocol === 'https:' || forwardedProtocol === 'https';
  return `${sessionCookie}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function json(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return Response.json(data, { status, headers });
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function publicUser(user: UserRow) {
  let profile: Record<string, unknown> = {};
  try {
    profile = JSON.parse(user.profile_json) as Record<string, unknown>;
  } catch {
    profile = {};
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    ...profile,
    workoutsCompleted: user.workouts_completed,
    lastAction: user.last_action,
  };
}

function findUserByEmail(email: string) {
  return db.query('SELECT * FROM users WHERE email = ?').get(email) as UserRow | null;
}

function findUserById(id: string) {
  return db.query('SELECT * FROM users WHERE id = ?').get(id) as UserRow | null;
}

function getSessionUser(request: Request) {
  const token = getCookie(request, sessionCookie);
  if (!token) return null;

  const row = db.query(`
    SELECT users.*
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(hashToken(token), Date.now()) as UserRow | null;

  return row ?? null;
}

function createSession(userId: string, request: Request) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  db.query('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  db.query('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(hashToken(token), userId, now + sessionDuration, now);
  return cookieHeader(request, token, Math.floor(sessionDuration / 1000));
}

function requireUser(request: Request) {
  return getSessionUser(request);
}

function validateEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function defaultProfile(): UserProfile {
  return {
    age: null,
    sex: '',
    height: null,
    weight: null,
    objective: '',
    activityLevel: '',
    availabilityDays: null,
    hoursPerDay: null,
    weekDays: [] as string[],
    trainingLocation: '',
    intensity: '',
    allergies: '',
    fat: null,
    bmi: null,
    weightHistory: [] as Array<{ date: string; value: number }>,
    fatHistory: [] as Array<{ date: string; value: number }>,
    hasOnboarded: false,
  };
}

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  development: { hmr: false },
  routes: {
    '/': frontend,
    '/api/status': {
      GET: () => Response.json({ status: 'ok' }),
    },
    '/api/auth/register': {
      POST: async (request) => {
        const body = await readJson(request);
        const name = typeof body?.name === 'string' ? body.name.trim() : '';
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body?.password === 'string' ? body.password : '';
        if (name.length < 2 || name.length > 80 || !validateEmail(email) || password.length < 10 || password.length > 200) {
          return json({ error: 'Informe nome, e-mail válido e senha com 10 a 200 caracteres.' }, 400);
        }
        if (findUserByEmail(email)) return json({ error: 'Já existe uma conta com este e-mail.' }, 409);

        const id = randomUUID();
        const profile = defaultProfile();
        const passwordHash = await Bun.password.hash(password);
        try {
          db.query(`
            INSERT INTO users (id, name, email, password_hash, profile_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(id, name, email, passwordHash, JSON.stringify(profile), Date.now());
        } catch {
          return json({ error: 'Não foi possível criar a conta. Verifique se o e-mail já está cadastrado.' }, 409);
        }

        const user = findUserById(id);
        if (!user) return json({ error: 'Não foi possível concluir o cadastro.' }, 500);
        return json({ user: publicUser(user) }, 201, { 'Set-Cookie': createSession(id, request) });
      },
    },
    '/api/auth/login': {
      POST: async (request) => {
        const body = await readJson(request);
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body?.password === 'string' ? body.password : '';
        if (!validateEmail(email) || !password) return json({ error: 'E-mail ou senha inválidos.' }, 400);

        const user = findUserByEmail(email);
        const valid = user ? await Bun.password.verify(password, user.password_hash) : false;
        if (!user || !valid) return json({ error: 'E-mail ou senha inválidos.' }, 401);

        return json({ user: publicUser(user) }, 200, { 'Set-Cookie': createSession(user.id, request) });
      },
    },
    '/api/auth/migrate': {
      POST: async (request) => {
        const contentLength = Number(request.headers.get('content-length') ?? 0);
        if (contentLength > 1_000_000) return json({ error: 'O arquivo de contas é grande demais para migrar.' }, 413);
        const body = await readJson(request);
        if (!Array.isArray(body?.users) || body.users.length > 50) {
          return json({ error: 'Não foi possível validar a lista de contas antigas.' }, 400);
        }

        let migrated = 0;
        let skipped = 0;
        for (const entry of body.users) {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            skipped += 1;
            continue;
          }
          const legacy = entry as Record<string, unknown>;
          const name = typeof legacy.name === 'string' ? legacy.name.trim() : '';
          const email = typeof legacy.email === 'string' ? legacy.email.trim().toLowerCase() : '';
          const password = typeof legacy.password === 'string' ? legacy.password : '';
          const seededDemoAdmin = email === 'admin@fitforje.com' && password === 'admin123';
          if (seededDemoAdmin || name.length < 2 || name.length > 80 || !validateEmail(email) || password.length < 6 || password.length > 200) {
            skipped += 1;
            continue;
          }

          const profile = defaultProfile();
          const age = Number(legacy.age);
          const height = Number(legacy.height);
          const weight = Number(legacy.weight);
          const bmi = Number(legacy.bmi);
          profile.age = Number.isInteger(age) && age >= 13 && age <= 100 ? age : null;
          profile.sex = typeof legacy.sex === 'string' ? legacy.sex.slice(0, 30) : '';
          profile.height = Number.isFinite(height) && height >= 120 && height <= 250 ? height : null;
          profile.weight = Number.isFinite(weight) && weight >= 30 && weight <= 200 ? weight : null;
          profile.objective = typeof legacy.objective === 'string' ? legacy.objective.slice(0, 80) : typeof legacy.goal === 'string' ? legacy.goal.slice(0, 80) : '';
          profile.activityLevel = typeof legacy.activityLevel === 'string' ? legacy.activityLevel.slice(0, 40) : '';
          profile.availabilityDays = Number.isInteger(Number(legacy.availabilityDays)) ? Number(legacy.availabilityDays) : null;
          profile.hoursPerDay = Number.isFinite(Number(legacy.hoursPerDay)) ? Number(legacy.hoursPerDay) : null;
          profile.weekDays = Array.isArray(legacy.weekDays) ? legacy.weekDays.filter((day): day is string => typeof day === 'string' && allowedWeekDays.has(day)) : [];
          profile.trainingLocation = typeof legacy.trainingLocation === 'string' ? legacy.trainingLocation.slice(0, 40) : '';
          profile.intensity = typeof legacy.intensity === 'string' ? legacy.intensity.slice(0, 30) : '';
          profile.allergies = typeof legacy.allergies === 'string' ? legacy.allergies.slice(0, 300) : '';
          profile.fat = Number.isFinite(Number(legacy.fat)) && Number(legacy.fat) > 0 ? Number(legacy.fat) : null;
          profile.bmi = Number.isFinite(bmi) && bmi > 0 ? bmi : null;
          profile.weightHistory = Array.isArray(legacy.weightHistory) ? legacy.weightHistory.filter((point): point is { date: string; value: number } => Boolean(point) && typeof point === 'object' && typeof point.date === 'string' && Number.isFinite(point.value) && point.value > 0).slice(-30) : [];
          profile.fatHistory = Array.isArray(legacy.fatHistory) ? legacy.fatHistory.filter((point): point is { date: string; value: number } => Boolean(point) && typeof point === 'object' && typeof point.date === 'string' && Number.isFinite(point.value) && point.value > 0).slice(-30) : [];
          profile.hasOnboarded = Boolean(legacy.hasOnboarded);
          const plan = typeof legacy.plan === 'string' && allowedPlans.has(legacy.plan) ? legacy.plan : 'basic';
          const workouts = Number(legacy.workoutsCompleted);
          const lastAction = typeof legacy.lastAction === 'string' ? legacy.lastAction.slice(0, 160) : 'Conta migrada';
          const passwordHash = await Bun.password.hash(password);
          const result = db.query(`
            INSERT OR IGNORE INTO users (id, name, email, password_hash, plan, profile_json, workouts_completed, last_action, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(randomUUID(), name, email, passwordHash, plan, JSON.stringify(profile), Number.isInteger(workouts) && workouts >= 0 ? workouts : 0, lastAction, Date.now());
          if (result.changes > 0) migrated += 1;
          else skipped += 1;
        }
        return json({ migrated, skipped, adminAccountsRequireManualPromotion: true });
      },
    },
    '/api/auth/session': {
      GET: (request) => {
        const user = getSessionUser(request);
        return json({ user: user ? publicUser(user) : null });
      },
    },
    '/api/auth/logout': {
      POST: (request) => {
        const token = getCookie(request, sessionCookie);
        if (token) db.query('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
        return json({ success: true }, 200, { 'Set-Cookie': cookieHeader(request, '', 0) });
      },
    },
    '/api/profile/onboarding': {
      POST: async (request) => {
        const user = requireUser(request);
        if (!user) return json({ error: 'Entre na sua conta para salvar o perfil.' }, 401);
        const body = await readJson(request);
        const age = Number(body?.age);
        const height = Number(body?.height);
        const weight = Number(body?.weight);
        const availabilityDays = Number(body?.availabilityDays);
        const hoursPerDay = Number(body?.hoursPerDay);
        const strings = ['sex', 'objective', 'activityLevel', 'trainingLocation', 'intensity'] as const;
        const values = Object.fromEntries(strings.map((key) => [key, typeof body?.[key] === 'string' ? (body[key] as string).trim() : '']));
        const submittedWeekDays = Array.isArray(body?.weekDays) ? body.weekDays : [];
        const weekDays = submittedWeekDays.filter((day): day is string => typeof day === 'string' && allowedWeekDays.has(day));
        const allergies = typeof body?.allergies === 'string' ? body.allergies.trim().slice(0, 300) : '';
        const allowedValues = {
          sex: new Set(['Masculino', 'Feminino', 'Outro']),
          objective: new Set(['Emagrecer', 'Perder gordura', 'Definir/ficar shapado', 'Ganho de massa']),
          activityLevel: new Set(['Sedentário', 'Moderado', 'Ativo', 'Muito ativo']),
          trainingLocation: new Set(['Casa', 'Academia', 'Casa e Academia']),
          intensity: new Set(['Leve', 'Moderada', 'Alta']),
        };
        const validProfileOptions = strings.every((key) => allowedValues[key].has(values[key] ?? ''));
        const validWeekDays = submittedWeekDays.length <= 7 && weekDays.length === submittedWeekDays.length;
        if (!Number.isInteger(age) || age < 13 || age > 100 || !Number.isFinite(height) || height < 120 || height > 250 || !Number.isFinite(weight) || weight < 30 || weight > 200 || !Number.isInteger(availabilityDays) || availabilityDays < 1 || availabilityDays > 7 || !Number.isFinite(hoursPerDay) || hoursPerDay < 1 || hoursPerDay > 6 || !validProfileOptions || !validWeekDays) {
          return json({ error: 'Confira os dados do perfil e os limites informados nos campos.' }, 400);
        }

        const previousProfile = JSON.parse(user.profile_json) as ReturnType<typeof defaultProfile>;
        const today = new Date().toISOString();
        const weightHistory = [...(previousProfile.weightHistory ?? [])];
        if (previousProfile.weight !== weight) weightHistory.push({ date: today, value: weight });
        const bmi = Math.round((weight / ((height / 100) ** 2)) * 10) / 10;
        const profile = {
          ...previousProfile,
          age,
          height,
          weight,
          ...values,
          availabilityDays,
          hoursPerDay,
          weekDays,
          allergies,
          bmi,
          weightHistory: weightHistory.slice(-30),
          hasOnboarded: true,
        };
        db.query('UPDATE users SET profile_json = ?, last_action = ? WHERE id = ?')
          .run(JSON.stringify(profile), 'Perfil atualizado', user.id);
        const updatedUser = findUserById(user.id);
        return json({ user: updatedUser ? publicUser(updatedUser) : null });
      },
    },
    '/api/workouts/complete': {
      POST: async (request) => {
        const user = requireUser(request);
        if (!user) return json({ error: 'Entre na sua conta para registrar o treino.' }, 401);
        const body = await readJson(request);
        const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 100) : '';
        const action = title ? `Treino concluído: ${title}` : 'Treino concluído';
        db.query('UPDATE users SET workouts_completed = workouts_completed + 1, last_action = ? WHERE id = ?')
          .run(action, user.id);
        const updatedUser = findUserById(user.id);
        return json({ user: updatedUser ? publicUser(updatedUser) : null });
      },
    },
    '/api/admin/stats': {
      GET: (request) => {
        const user = requireUser(request);
        if (!user) return json({ error: 'Entre na sua conta.' }, 401);
        if (user.role !== 'admin') return json({ error: 'Acesso administrativo necessário.' }, 403);
        const row = db.query('SELECT COUNT(*) AS users FROM users').get() as { users: number };
        return json({ users: row.users });
      },
    },
    '/api/recovery': {
      POST: () => json({ error: 'Recuperação por e-mail não está configurada.' }, 503),
    },
    '/api/checkout': {
      POST: () => json({ error: 'Checkout não está configurado. Nenhuma cobrança foi feita.' }, 503),
    },
  },
  fetch: () => json({ error: 'Rota não encontrada.' }, 404),
});

console.log(`FitForje disponível em ${server.url}`);