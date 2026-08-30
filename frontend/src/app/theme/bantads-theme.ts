import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const BantadsTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{cyan.50}',
      100: '{cyan.100}',
      200: '{cyan.200}',
      300: '{cyan.300}',
      400: '{cyan.400}',
      500: '{cyan.500}',
      600: '{cyan.600}',
      700: '{cyan.700}',
      800: '{cyan.800}',
      900: '{cyan.900}',
      950: '{cyan.950}'
    },

    colorScheme: {
      light: {
        surface: {
          0: 'var(--color-surface)',
          50: 'var(--color-background)',
          100: 'var(--color-surface)'
        },

        formField: {
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          hoverBorderColor: 'var(--color-primary)',
          focusBorderColor: 'var(--color-focus)',
          color: 'var(--color-text)',
          placeholderColor: 'var(--color-text-secondary)'
        },

        text: {
          color: 'var(--color-text)',
          mutedColor: 'var(--color-text-secondary)'
        },

        highlight: {
          background: 'var(--color-highlight)',
          focusBackground: 'var(--color-highlight-focus)'
        },

        focusRing: {
          width: '2px',
          style: 'solid',
          color: 'var(--color-focus)',
          offset: '1px'
        }
      }
    }
  },
    components: {
    toolbar: {
      root: {
        background: 'var(--color-primary)',
        color: 'var(--color-surface)',
        borderColor: 'var(--color-primary)',
        borderRadius: '0'
      }
    },
    menu: {
    root: {
      background: 'transparent',
      borderColor: 'transparent',
      color: 'var(--color-text)',
      borderRadius: '0',
      shadow: 'none'
    },

    list: {
      padding: '0',
      gap: '4px'
    },

    item: {
      color: 'var(--color-text-secondary)',
      padding: '10px 12px',
      borderRadius: 'var(--border-radius)',
      gap: '10px',
      focusBackground: 'var(--color-highlight)',
      focusColor: 'var(--color-primary)',

      icon: {
        color: 'var(--color-text-secondary)',
        focusColor: 'var(--color-primary)',
        size: '18px'
      },

      label: {
        fontWeight: '500',
        fontSize: '14px'
      }
    },
    separator: {
      borderColor: 'var(--color-border)'
    }
    },
    progressspinner: {
      root: {
      colorOne: 'var(--color-secondary)',
      colorTwo: 'var(--color-secondary-dark)',
      colorThree: 'var(--color-secondary)',
      colorFour: 'var(--color-secondary-dark)'
    }
  },
   button: {
      colorScheme: {
        light: {
         root: {
          primary: {
            background: 'var(--color-primary)',
            hoverBackground: 'var(--color-third)',
            borderColor: 'var(--color-primary)',
            hoverBorderColor: 'var(--color-third)',
            color: 'var(--color-surface)',
            hoverColor: 'var(--color-surface)'
          },
          secondary: {
            background: 'transparent',
            hoverBackground: 'var(--color-background)', 
            borderColor: 'var(--color-border)',
            hoverBorderColor: 'var(--color-primary)',
            color: 'var(--color-text)',
            hoverColor: 'var(--color-primary)'
          }
        }
      }
    }
  }
  }
});