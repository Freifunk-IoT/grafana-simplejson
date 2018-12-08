import Logging from "@hibas123/nodelogging";
import * as ini from "ini";
import { readFileSync } from "fs";

interface WebConfig {
   port: number;
   host: string | undefined;
   access_log: boolean;
   username: string;
   password: string;
}

interface DatabaseConfig {
   database: string;
   host: string;
}

interface GeneralConfig {
   dev: boolean;
}

interface Config {
   web: WebConfig
   database: DatabaseConfig
   general: GeneralConfig
}

/**
 * Regular expression for verifying ipv4 and ipv6 addresses
 */
const ipregex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;

/**
 * Checks config values and provides defaults
 */
const definition = {
   web: {
      port: (value: string) => {
         if (!value) return 3018;
         let n = Number(value)
         if (Number.isNaN(n)) throw new Error("Not a number!");
         return n;
      },
      host: (value: string) => {
         if (!value) return "127.0.0.1";
         if (!ipregex.test(value)) throw new Error("Invalid IP!");
         return value;
      },
      access_log: (value: string) => value ? Boolean(value) : true,
      username: (value: string) => value || "grafana",
      password: (value: string) => value ? value : new Error("Password must be set!")
   },
   database: {
      database: (value: string) => value || "ffiot",
      host: (value: string) => value || "127.0.0.1"
   },
   general: {
      dev: (value: string) => value ? Boolean(value) : false
   }
}

let cont = "";
try {
   cont = readFileSync("config.ini").toString("utf8");
} catch (err) {
   Logging.warning("No config.ini file found or it is not readable!")
}

let parsed = ini.parse(cont);

export let config: Config = <any>{};
export default config;
for (let category in definition) {
   if (!parsed[category]) parsed[category] = {}; //So no errors on next check
   config[category] = {}; //Initialize
   for (let entry in definition[category]) {
      try {
         let res = definition[category][entry](parsed[category][entry]);
         if (res instanceof Error) throw res;
         config[category][entry] = res;
      } catch (err) {
         Logging.errorMessage(`Configuration error in config.ini at ${category} -> ${entry}:`, err.message);
         process.exit(1);
      }
   }
}
