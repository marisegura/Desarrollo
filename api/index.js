// Función serverless de Vercel: recibe todas las rutas /api/* (ver vercel.json).
const { apiHandler } = require('../lib/api');

module.exports = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // Tras el rewrite, la ruta original llega en ?__path= (p. ej. "tasks/3").
  const rewritten = url.searchParams.get('__path');
  const pathname = rewritten !== null ? `/api/${rewritten}` : url.pathname;
  return apiHandler(req, res, pathname);
};
