
import { useEffect } from "react";

const APP_NAME = "OSX IT Service Desk";

export default function usePageTitle(pageName) {
  useEffect(() => {
    document.title = pageName
      ? `${APP_NAME} | ${pageName}`
      : APP_NAME;
  }, [pageName]);
}
