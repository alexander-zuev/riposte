# Zed + Oxc (oxlint/oxfmt) + TypeScript Setup

Reference doc for configuring Zed IDE with oxlint, oxfmt, and vtsls typechecking.

## Sources

- [oxc-project/oxc-zed](https://github.com/oxc-project/oxc-zed) — Zed extension source
- [oxc_language_server README](https://github.com/oxc-project/oxc/tree/main/crates/oxc_language_server) — LSP options reference
- [Zed TypeScript docs](https://zed.dev/docs/languages/typescript) — vtsls/TS setup
- [extension.toml](https://github.com/oxc-project/oxc-zed/blob/main/extension.toml) — supported languages

## Architecture

The Zed oxc extension registers **two separate language servers**:

| Server ID | Binary | Role | Supported Languages |
|-----------|--------|------|---------------------|
| `oxlint` | `node_modules/oxlint/bin/oxlint --lsp` | Linting, diagnostics, code actions | JS, JSX, TS, TSX, Vue, Astro, Svelte |
| `oxfmt` | `node_modules/oxfmt/bin/oxfmt --lsp` | Formatting | JS, JSX, TS, TSX, Vue, JSON, JSON5, JSONC, HTML, CSS, SCSS, LESS, GraphQL, Handlebars, Markdown, MDX, YAML, TOML |

Each server reads its own `lsp.<id>.initialization_options` from Zed settings.
Workspace configuration is extracted from `initialization_options.settings`.

## LSP Options Reference

### oxlint options (`lsp.oxlint.initialization_options.settings`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configPath` | `string \| null` | `null` | Path to oxlint config file. Setting this disables nested config discovery. |
| `tsConfigPath` | `string \| null` | `null` | Path to tsconfig.json. Required for type-aware linting and import alias resolution. |
| `run` | `"onType" \| "onSave"` | `"onType"` | When to run diagnostics. |
| `fixKind` | see below | `"safe_fix_or_suggestion"` | What fix level to expose as code actions. |
| `unusedDisableDirectives` | `"allow" \| "warn" \| "deny"` | `"allow"` | How to report unused `// oxlint-disable` comments. |
| `typeAware` | `boolean \| null` | `null` | Enable type-aware linting. When null, uses config file's `options.typeAware`. |
| `disableNestedConfig` | `boolean` | `false` | Disable nested config discovery, use only `configPath`. |

**fixKind values:** `"safe_fix"`, `"safe_fix_or_suggestion"` (default), `"dangerous_fix"`, `"dangerous_fix_or_suggestion"`, `"none"`, `"all"`

### oxfmt options (`lsp.oxfmt.initialization_options.settings`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fmt.configPath` | `string \| null` | `null` | Path to `.oxfmtrc.json`. When null, auto-discovers from workspace root. |

Note: `run` is NOT an oxfmt option. Formatting is triggered by Zed's `format_on_save` setting, not the LSP.

## Correct Zed Configuration

### Global settings (`~/.config/zed/settings.json`)

Key principles:
- Only add `"oxlint"` to `language_servers` for supported languages (JS/JSX/TS/TSX)
- Only add `code_actions_on_format: source.fixAll.oxc` for languages oxlint supports
- Use `code_actions_on_format` for fix-on-save, NOT the formatter chain — avoids running fixAll twice
- Formatter chain should only contain `oxfmt`
- `prettier: { "allowed": false }` prevents Prettier from conflicting

```jsonc
{
  "languages": {
    "TypeScript": {
      "code_actions_on_format": {
        "source.fixAll.oxc": true
      },
      "format_on_save": "on",
      "formatter": [
        { "language_server": { "name": "oxfmt" } }
      ],
      "language_servers": [
        "vtsls",
        "tailwindcss-language-server",
        "oxlint",
        "!eslint"
      ],
      "prettier": { "allowed": false },
      "tab_size": 2
    },
    // Same pattern for TSX, JavaScript, JSX

    "CSS": {
      // oxfmt supports CSS, oxlint does NOT
      "format_on_save": "on",
      "formatter": [
        { "language_server": { "name": "oxfmt" } }
      ],
      "language_servers": [
        "tailwindcss-language-server",
        "!eslint"
        // NO oxlint here
      ],
      "prettier": { "allowed": false },
      "tab_size": 2
      // NO code_actions_on_format — oxlint doesn't lint CSS
    },

    "JSON": {
      // oxfmt supports JSON, oxlint does NOT
      "format_on_save": "on",
      "formatter": [
        { "language_server": { "name": "oxfmt" } }
      ],
      "language_servers": ["...", "!eslint"],
      "prettier": { "allowed": false },
      "tab_size": 2
    }
  }
}
```

### Project settings (`.zed/settings.json`)

Not needed for this project. All settings are global.

- `tsConfigPath`: not needed — oxlint auto-discovers the relevant `tsconfig.json` per file in monorepos
- `configPath`: not needed — oxlint auto-discovers `oxlint.json` from workspace root
- `fmt.configPath`: not needed — oxfmt auto-discovers `.oxfmtrc.json` from workspace root

### oxlint config (`oxlint.json`)

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["oxc", "typescript", "unicorn", "import", "node", "promise"],
  "categories": { "correctness": "error" },
  "options": {
    "typeAware": true,
    "typeCheck": true    // experimental — enables oxc's own type checking
  },
  "rules": { /* ... */ }
}
```

Note: `typeAware` and `typeCheck` are only supported in root config files, not in overrides.

### oxfmt config (`.oxfmtrc.json`)

Optional. If not present, oxfmt uses defaults. Example:

```jsonc
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 100,
  "experimentalTailwindcss": {}
}
```

## TypeScript / vtsls

Zed uses `vtsls` by default for TS/TSX/JS. Key settings:

```jsonc
{
  "lsp": {
    "vtsls": {
      "settings": {
        "typescript": {
          "format": { "semicolons": "remove" },
          "tsserver": { "maxTsServerMemory": 16184 },
          "inlayHints": {
            "enumMemberValues": { "enabled": true },
            "functionLikeReturnTypes": { "enabled": true },
            "parameterNames": { "enabled": "literals", "suppressWhenArgumentMatchesName": true },
            "parameterTypes": { "enabled": true }
          },
          "updateImportsOnFileMove": { "enabled": "always" }
        }
      }
    }
  }
}
```

For large monorepos, increase `maxTsServerMemory` to avoid OOM crashes.

## Fix Log

| # | Error | Where | Fix | Status |
|---|-------|-------|-----|--------|
| 1 | `source.fixAll.oxc` in both `formatter` chain AND `code_actions_on_format` — runs twice per save | `~/.config/zed/settings.json` — JavaScript, TSX, TypeScript | Removed `{ "code_action": "source.fixAll.oxc" }` from `formatter` arrays. Kept in `code_actions_on_format` only. [Proof: Zed two-phase pipeline](https://github.com/zed-industries/zed/blob/main/docs/src/languages/python.md) | Fixed 2026-05-02. Verified: `unicorn/prefer-array-flat-map` auto-fixes on save. |
| 2 | `oxlint` in `language_servers` + `source.fixAll.oxc` in `code_actions_on_format` for CSS, HTML, JSON, JSONC, Markdown, YAML — oxlint doesn't support these ([extension.toml](https://github.com/oxc-project/oxc-zed/blob/main/extension.toml)) | `~/.config/zed/settings.json` | Removed `code_actions_on_format` block from all 6 languages. Removed `"oxlint"` from CSS `language_servers`. | Fixed 2026-05-02. Dead config removed. |
| 3 | `run: "onSave"` set on oxfmt — `run` is oxlint-only | `.zed/settings.json` | Deleted project settings file entirely — all legitimate settings moved to global. | Fixed 2026-05-02. |
| 4 | Missing `tsConfigPath` in oxlint LSP settings | `.zed/settings.json` | Not needed. oxlint auto-discovers the relevant `tsconfig.json` per file (`oxlint --help`: "Oxlint automatically discovers the relevant tsconfig.json for each file"). Works in monorepos without config. | Not a bug. |
| 5 | `fixKind: "safe_fix"` excludes suggestion-type code actions (default: `"safe_fix_or_suggestion"`) | `.zed/settings.json` → `~/.config/zed/settings.json` | Changed to default `"safe_fix_or_suggestion"` in global settings. | Fixed 2026-05-02. |
