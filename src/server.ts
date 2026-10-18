import frontend from './index.html';

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  development: { hmr: false },
  routes: {
    '/': frontend,
    '/api/status': {
      GET: () => Response.json({ status: 'ok' }),
    },
  },
});

console.log(`FitForje disponível em ${server.url}`);