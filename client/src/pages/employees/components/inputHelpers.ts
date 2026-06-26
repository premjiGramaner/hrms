import { ChangeEvent } from "react";

export const handleMobileInput = (
  e: ChangeEvent<HTMLInputElement>,
  formRef: React.MutableRefObject<Record<string, any>>,
  fieldName: string,
  errors: Record<string, string>,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) => {
  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);

  e.target.value = digitsOnly;
  formRef.current[fieldName] = digitsOnly;

  if (errors[fieldName]) {
    setErrors((prev) => {
      const updatedErrors = { ...prev };
      delete updatedErrors[fieldName];
      return updatedErrors;
    });
  }
};

export const getNumericValue = (
  event: ChangeEvent<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >,
  maxLength?: number,
): string => {
  const digits = event.target.value.replace(/\D/g, "");

  return maxLength ? digits.slice(0, maxLength) : digits;
};
