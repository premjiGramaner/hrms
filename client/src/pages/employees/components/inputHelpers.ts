import { ChangeEvent } from "react";
import { NON_DIGIT_PATTERN } from "../../../constants/validationPatterns";

export const handleMobileInput = (
  event: ChangeEvent<HTMLInputElement>,
  formRef: React.MutableRefObject<Record<string, string>>,
  fieldName: string,
  errors: Record<string, string>,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) => {
  const digitsOnly = event.target.value
    .replace(NON_DIGIT_PATTERN, "")
    .slice(0, 10);

  event.target.value = digitsOnly;
  formRef.current[fieldName] = digitsOnly;

  if (errors[fieldName]) {
    setErrors((currentErrors) => {
      const updatedErrors = { ...currentErrors };
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
  const digits = event.target.value.replace(NON_DIGIT_PATTERN, "");

  return maxLength ? digits.slice(0, maxLength) : digits;
};
