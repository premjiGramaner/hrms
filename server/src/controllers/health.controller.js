export const getHealth = (req, res) => {
  const payload = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  return res.status(200).json(payload);
};
