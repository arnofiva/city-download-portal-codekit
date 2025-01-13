/* Copyright 2024 Esri
 *
 * Licensed under the Apache License Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import Accessor from "@arcgis/core/core/Accessor";
import { subclass, property } from "@arcgis/core/core/accessorSupport/decorators";
import { CalciteAlert } from "@esri/calcite-components-react";
import { ComponentProps, createContext, PropsWithChildren, useContext } from "react";
import { useAccessorValue } from "~/arcgis/reactive-hooks";
import useInstance from "~/hooks/useInstance";

type ToastMessage = { title: string, message: string, key: string; severity: ComponentProps<typeof CalciteAlert>['kind'] }

@subclass()
class ToastStore extends Accessor {
  @property()
  messages = [] as ToastMessage[];

  toast = (message: ToastMessage | ToastableError) => {
    if (message instanceof ToastableError && message.originalError) {
      console.error(message.originalError);
    }

    if (this.messages.some(m => m.key === message.key)) return;

    this.messages = [...this.messages, message];
  }

  complete = (message: ToastMessage) => {
    this.messages = this.messages.filter(m => m.key !== message.key);
  }
}

const ToastStoreContext = createContext<ToastStore>(null!);
const ToastContext = createContext<ToastStore['toast']>(null!);

function InternalToast({ store }: { store: ToastStore }) {
  const messages = useAccessorValue(() => store.messages) ?? [];

  return messages.map(message => (
    <CalciteAlert
      slot="alerts"
      key={message.key}
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

export function ToasterProvider({ children }: PropsWithChildren) {
  const store = useInstance(() => {
    return new ToastStore();
  });

  return (
    <ToastStoreContext.Provider value={store}>
      <ToastContext.Provider value={store.toast}>
        {children}
      </ToastContext.Provider>
    </ToastStoreContext.Provider>
  )
}

export function Toast() {
  const store = useContext(ToastStoreContext);
  return (
    <InternalToast store={store} />
  )
}

export class ToastableError extends Error {
  key: string;
  message: string;
  title: string;
  severity: ComponentProps<typeof CalciteAlert>["kind"];
  originalError?: unknown

  get toast(): ToastMessage {
    return {
      key: this.key,
      title: this.title,
      message: this.message,
      severity: this.severity,
    }
  }

  constructor(props: {
    key: string,
    message: string,
    title: string,
    severity: ComponentProps<typeof CalciteAlert>["kind"],
    originalError?: unknown
  }, options?: ErrorOptions) {
    super(props.message, options);
    this.key = props.key;
    this.message = props.message;
    this.title = props.title;
    this.severity = props.severity;
    this.originalError = props.originalError;
  }
}