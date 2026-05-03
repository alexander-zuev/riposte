export const STORY_PATHS = {
  DESIGN_SYSTEM: {
    ROOT: 'Design System',
    COLORS: 'Design System/Colors',
    TYPOGRAPHY: 'Design System/Typography',
    TOKENS: 'Design System/Tokens',
  },

  COMPONENTS: {
    ATOMS: {
      ROOT: 'Components/Atoms',
      BUTTONS: 'Components/Atoms/Buttons',
      INPUTS: 'Components/Atoms/Inputs',
      INDICATORS: 'Components/Atoms/Indicators',
    },
    DATA: {
      ROOT: 'Components/Data Display',
      TABLES: 'Components/Data Display/Tables',
      CARDS: 'Components/Data Display/Cards',
    },
    FEEDBACK: {
      ROOT: 'Components/Feedback',
      TOASTS: 'Components/Feedback/Toasts',
      ALERTS: 'Components/Feedback/Alerts',
    },
    LAYOUT: {
      ROOT: 'Components/Layout',
      CONTAINERS: 'Components/Layout/Containers',
    },
    NAVIGATION: {
      ROOT: 'Components/Navigation',
      MENUS: 'Components/Navigation/Menus',
      TABS: 'Components/Navigation/Tabs',
    },
    OVERLAYS: {
      ROOT: 'Components/Overlays',
      DIALOGS: 'Components/Overlays/Dialogs',
      POPOVERS: 'Components/Overlays/Popovers',
      TOOLTIPS: 'Components/Overlays/Tooltips',
    },
  },

  FEATURES: {
    DISPUTES: {
      ROOT: 'Features/Disputes',
      COMPONENTS: 'Features/Disputes/Components',
    },
    AUTH: {
      ROOT: 'Features/Authentication',
      COMPONENTS: 'Features/Authentication/Components',
    },
  },

  PAGES: {
    ROOT: 'Pages',
    DASHBOARD: 'Pages/Dashboard',
  },

  PATTERNS: {
    ROOT: 'Patterns',
    FORMS: 'Patterns/Forms',
    EMPTY_STATES: 'Patterns/Empty States',
    ERROR_STATES: 'Patterns/Error States',
    LOADING_STATES: 'Patterns/Loading States',
  },
} as const
