import { createSafeAuthM3Tokens } from "./m3-token-scheme.mjs";

console.log(JSON.stringify(createSafeAuthM3Tokens(true), null, 2));
