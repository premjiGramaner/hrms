import { Toaster } from "react-hot-toast";

const commonStyle = {
  borderRadius: "12px",
  padding: "14px 18px",
  fontWeight: 600,
  fontSize: "14px",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
  backdropFilter: "blur(10px)",
  minWidth: "300px",
  maxWidth: "500px",
};

export const ToastContainer = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{
        top: 80,
        right: 20,
      }}
      toastOptions={{
        duration: 3000,
        style: {
          ...commonStyle,
        },
      }}
    />
  );
};

export default ToastContainer;
