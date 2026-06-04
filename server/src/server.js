import app from './app.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
	console.error('Uncaught exception:', err);
	process.exit(1);
});


