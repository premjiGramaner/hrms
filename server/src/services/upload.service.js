import multer from "multer";

const ALLOWED_MIME = /^image\/(jpeg|jpg|png)$/;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, and PNG image files are allowed"), false);
  }
};

const upload = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter });

export default upload;
