import {
  argbFromHex,
  hexFromArgb,
  Hct,
  SchemeTonalSpot,
} from "@material/material-color-utilities";

const roles = [
  "background", "onBackground", "surface", "surfaceDim", "surfaceBright",
  "surfaceContainerLowest", "surfaceContainerLow", "surfaceContainer",
  "surfaceContainerHigh", "surfaceContainerHighest", "onSurface",
  "surfaceVariant", "onSurfaceVariant", "outline", "outlineVariant",
  "inverseSurface", "inverseOnSurface", "surfaceTint", "primary", "primaryDim",
  "onPrimary", "primaryContainer", "onPrimaryContainer", "primaryFixed",
  "primaryFixedDim", "onPrimaryFixed", "onPrimaryFixedVariant", "secondary",
  "secondaryDim", "onSecondary", "secondaryContainer", "onSecondaryContainer",
  "tertiary", "tertiaryDim", "onTertiary", "tertiaryContainer",
  "onTertiaryContainer", "error", "errorDim", "onError", "errorContainer",
  "onErrorContainer",
];

const extendedSeeds = {
  work: "#0EA5E9",
  cloud: "#14B8A6",
  finance: "#10B981",
  dev: "#A855F7",
  personal: "#F59E0B",
  favorite: "#F43F5E",
};

const extendedRoles = ["primary", "onPrimary", "primaryContainer", "onPrimaryContainer"];

export function createSafeAuthM3Tokens(isDark) {
  const source = "#6D5EF5";
  const makeScheme = (seed) =>
    new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)), isDark, 0);
  const scheme = makeScheme(source);

  return {
    source,
    variant: "tonal-spot",
    mode: isDark ? "dark" : "light",
    tokens: Object.fromEntries(
      roles.map((role) => [role, hexFromArgb(scheme[role])]),
    ),
    extended: Object.fromEntries(
      Object.entries(extendedSeeds).map(([name, seed]) => {
        const categoryScheme = makeScheme(seed);
        return [
          name,
          Object.fromEntries(
            extendedRoles.map((role) => [role, hexFromArgb(categoryScheme[role])]),
          ),
        ];
      }),
    ),
  };
}
