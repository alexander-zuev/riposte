import type { PdfIconName } from './phosphor-paths'
import { PHOSPHOR_ICON_PATHS } from './phosphor-paths'

export type EvidencePdfAssets = {
  icons: Record<PdfIconName, string>
}

export function createDefaultEvidencePdfAssets(): EvidencePdfAssets {
  return {
    icons: PHOSPHOR_ICON_PATHS,
  }
}
