import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { port, corsOrigins } from './config/env.js';
import errorMiddleware from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import roleRoutes from './routes/role.routes.js';
import hradminRoutes from './routes/hradmin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.disable('x-powered-by');
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/hradmin', hradminRoutes);

app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
