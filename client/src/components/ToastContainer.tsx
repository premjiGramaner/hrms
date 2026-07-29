import { Toaster } from "react-hot-toast";
import { TOAST_COMMON_STYLE } from "../utils/toast";

export const ToastContainer = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerStyle={{
        top: 80,
        right: 20,
      }}
      toastOptions={{
        duration: 3000,
        style: {
          ...TOAST_COMMON_STYLE,
        },
      }}
    />
  );
};

export default ToastContainer;
