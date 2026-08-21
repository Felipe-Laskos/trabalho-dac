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
          0: '#FFFFFF',
          50: '#F4F7F8',
          100: '#FFFFFF'
        },

        formField: {
          background: '#FFFFFF',
          borderColor: '#E2E8F0',
          hoverBorderColor: '#0B3B45',
          focusBorderColor: '#2563EB',
          color: '#1A242B',
          placeholderColor: '#64748B'
        },

        text: {
          color: '#1A242B',
          mutedColor: '#64748B'
        },

        highlight: {
          background: '#E6F7FA',
          focusBackground: '#CCF0F5'
        },

        focusRing: {
          width: '2px',
          style: 'solid',
          color: '#2563EB',
          offset: '1px'
        }
      }
    }
  },
    components: {
    toolbar: {
      root: {
        background: '#0B3B45',
        color: '#FFFFFF',
        borderColor: '#0B3B45',
        borderRadius: '0'
      }
    },
    menu: {
    root: {
      background: '#FFFFFF',
      borderColor: '#E2E8F0',
      color: '#1A242B',
      borderRadius: '8px',
      shadow: 'none'
    },

    list: {
      padding: '8px',
      gap: '4px'
    },

    item: {
      color: '#64748B',
      padding: '10px 12px',
      borderRadius: '8px',
      gap: '10px',
      focusBackground: '#E6F7FA',
      focusColor: '#0B3B45',

      icon: {
        color: '#64748B',
        focusColor: '#0B3B45',
        size: '18px'
      },

      label: {
        fontWeight: '500',
        fontSize: '14px'
      }
    },
    separator: {
      borderColor: '#E2E8F0'
    }
    },
    progressspinner: {
      root: {
      colorOne: '#00B4D8',
      colorTwo: '#095969',
      colorThree: '#00B4D8',
      colorFour: '#095969'
    }
  },
   button: {
      colorScheme: {
        light: {
         root: {
          primary: {
            background: '#0B3B45',
            hoverBackground: '#09323B',
            borderColor: '#0B3B45',
            hoverBorderColor: '#09323B',
            color: '#FFFFFF',
            hoverColor: '#FFFFFF'
          },
          secondary: {
            background: 'transparent',
            hoverBackground: '#F4F7F8', 
            borderColor: '#E2E8F0',
            hoverBorderColor: '#0B3B45',
            color: '#1A242B',
            hoverColor: '#0B3B45'
          }
        }
      }
    }
  }
  }
});