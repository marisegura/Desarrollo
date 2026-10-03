# Gestor de tareas

Gestor de tareas simple con servidor Node.js (sin dependencias) y datos guardados en `data/tasks.json`.

## Uso

Requiere Node.js.

```
npm start
```

Abre http://localhost:8000. En Windows también puedes usar `iniciar.bat`.

## Estructura

- `server.js`: servidor estático + API REST (`/api/tasks`)
- `static/`: interfaz (HTML, CSS, JS)
- `data/`: tareas guardadas (se crea sola, no se versiona)
