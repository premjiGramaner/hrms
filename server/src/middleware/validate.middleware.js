import AppError from '../utils/AppError.js';

const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema(req[source] || {});

  if (result.error) {
    return next(new AppError(result.error, 422));
  }

  req[source] = result.value;
  return next();
};

export default validate;
