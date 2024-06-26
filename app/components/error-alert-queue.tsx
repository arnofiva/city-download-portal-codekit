import { ComponentType, useState, useEffect } from "react";

interface ErrorAlertQueueProps<ErrorType extends string = string, Message = unknown> {
  captureError: (capture: (error: { type: StringHint<ErrorType>, message?: Message }) => void) => () => void;
  alertComponent: ComponentType<{ type: StringHint<ErrorType>; message?: Message; onClose: () => void }>
}
export default function ErrorAlertQueue<ErrorType extends string = string, Message = unknown>({
  alertComponent: AlertComponent,
  captureError
}: ErrorAlertQueueProps<ErrorType, Message>) {
  type ErrorMap = Map<StringHint<ErrorType>, { type: StringHint<ErrorType>, message?: Message }>;
  const [errorMap, setErrors] = useState<ErrorMap>(new Map());

  useEffect(() => {
    const unsubscribe = captureError((error) => {
      if (!errorMap.has(error.type)) {
        const next = new Map(errorMap);
        next.set(error.type, error);
        setErrors(next);
      }
    });

    return unsubscribe;
  }, [captureError, errorMap])

  const errors = Array.from(errorMap.values());

  return (
    errors.map(error => (
      <AlertComponent
        key={error.type}
        type={error.type}
        message={error.message}
        onClose={() => {
          const next = new Map(errorMap);
          next.delete(error.type);
          setErrors(next);
        }}
      />
    ))
  );
}
