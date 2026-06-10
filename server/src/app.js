import express from 'express';
import healthRoutes from './routes/health.routes.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', healthRoutes);

app.get('/', (req, res) => res.send('API is running'));

export default app;

