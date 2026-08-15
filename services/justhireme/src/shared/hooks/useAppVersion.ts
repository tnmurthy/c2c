import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { version as packageVersion } from "../../../package.json";

export function useAppVersion() {
  const [version, setVersion] = useState(packageVersion);

  useEffect(() => {
    let alive = true;
    getVersion()
      .then(value => {
        if (alive && value) setVersion(value);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  return version;
}
