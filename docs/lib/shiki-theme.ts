type Ramp = { fg: string; soft: string; muted: string; faint: string }

/** Grayscale ramps: emphasis comes from lightness, never from hue. */
function mono(name: string, type: "light" | "dark", c: Ramp) {
  return {
    name,
    type,
    colors: { "editor.background": "#00000000", "editor.foreground": c.fg },
    settings: [
      { settings: { foreground: c.fg } },
      { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: c.faint, fontStyle: "italic" } },
      {
        scope: ["keyword", "storage", "keyword.operator.new", "constant.language", "support.type.primitive"],
        settings: { foreground: c.fg, fontStyle: "bold" },
      },
      {
        scope: ["string", "string.quoted", "constant.numeric", "constant.character"],
        settings: { foreground: c.soft },
      },
      { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: c.fg } },
      {
        scope: ["variable.parameter", "punctuation", "meta.brace", "keyword.operator"],
        settings: { foreground: c.muted },
      },
      { scope: ["entity.name.tag", "support.class.component", "entity.name.type"], settings: { foreground: c.fg } },
      { scope: ["entity.other.attribute-name", "variable.other.property"], settings: { foreground: c.soft } },
    ],
  }
}

export const MONO_LIGHT = mono("findplate-light", "light", {
  fg: "#171717",
  soft: "#525252",
  muted: "#737373",
  faint: "#737373",
})

export const MONO_DARK = mono("findplate-dark", "dark", {
  fg: "#fafafa",
  soft: "#b4b4b4",
  muted: "#a3a3a3",
  faint: "#8a8a8a",
})
