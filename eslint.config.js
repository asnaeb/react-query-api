//@ts-check

import tseslint from "typescript-eslint";
import {common, typescript, node, react} from "@asn.aeb/eslint-configs";

export default tseslint.config(
  {ignores: ["dist"]},
  common,
  typescript,
  node,
  react
);
