const success = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

const created = (res, data) => success(res, data, 201);

const error = (res, message, statusCode = 500, details) =>
  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });

export { success, created, error };
