import { useCallback, useState } from "react";
import {
  messageText,
  notifications,
} from "../utils/notifications";

export default function useNotificationState(kind = "error") {
  const [message, setMessage] = useState("");

  const update = useCallback(value => {
    const text = messageText(value);

    setMessage(text);

    if (text) {
      void notifications[kind](text).catch(console.error);
    }
  }, [kind]);

  return [message, update];
}
