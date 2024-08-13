import Accessor from "@arcgis/core/core/Accessor";
import { subclass, property } from "@arcgis/core/core/accessorSupport/decorators";
import Collection from "@arcgis/core/core/Collection";
import { CalciteAlert } from "@esri/calcite-components-react";
import { ComponentProps, createContext, PropsWithChildren, useContext } from "react";
import { useAccessorValue } from "~/hooks/reactive";
import useInstance from "~/hooks/useInstance";

type ToastMessage = { title: string, message: string, code: string; severity: ComponentProps<typeof CalciteAlert>['kind'] }

@subclass()
class ToastStore extends Accessor {
  @property()
  messages = new Collection<ToastMessage>()

  toast = (message: ToastMessage) => {
    if (this.messages.some(m => m.code === message.code)) return;
    this.messages.add(message)
  }

  complete = (message: ToastMessage) => {
    this.messages.remove(message)
  }
}

const ToastContext = createContext<ToastStore['toast']>(null!);

function Toast({ store }: { store: ToastStore }) {
  const messages = useAccessorValue(
    () => store.messages.toArray()) ?? [];

  return messages.map(message => (
    <CalciteAlert
      slot="alerts"
      key={message.code}
      icon
      kind={message.severity}
      label={message.title}
      open
      autoClose
      onCalciteAlertClose={() => {
        store.complete(message)
      }}
    >
      <p slot='title'>{message.title}</p>
      <p slot="message">{message.message}</p>
    </CalciteAlert>
  ))
}

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster({ children }: PropsWithChildren) {
  const store = useInstance(() => new ToastStore());

  return (
    <>
      <ToastContext.Provider value={store.toast}>
        {children}
      </ToastContext.Provider>
      <Toast store={store} />
    </>
  )
}
