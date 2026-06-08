export const WORLD_CONTINENT_COLOR: Record<string, string> = {
  "n-america": "var(--color-c-namerica)",
  "s-america": "var(--color-c-samerica)",
  europe: "var(--color-c-europe)",
  africa: "var(--color-c-africa)",
  asia: "var(--color-c-asia)",
  oceania: "var(--color-c-oceania)",
};

/** Cross-water adjacencies to draw as dashed connectors (each pair once). */
export const BRIDGES: Array<[string, string]> = [
  ["greenland", "britain"],
  ["usa", "russia"],
  ["central-america", "colombia"],
  ["caribbean", "colombia"],
  ["brazil", "north-africa"],
  ["west-europe", "north-africa"],
  ["egypt", "middle-east"],
  ["east-europe", "middle-east"],
  ["southeast-asia", "indonesia"],
  ["argentina", "australia"],
];
