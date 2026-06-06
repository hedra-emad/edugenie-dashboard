/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-light': 'var(--color-primary-light)',
        'primary-dark': 'var(--color-primary-dark)',
        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        'background-page': 'var(--color-background-page)',
        'sidebar-bg': 'var(--color-sidebar-bg)',
        border: 'var(--color-border)',
        'sidebar-hover': 'var(--color-sidebar-hover)',
        'sidebar-active': 'var(--color-sidebar-active)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        panel: 'var(--radius-panel)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        layout: 'var(--shadow-layout)',
        footer: 'var(--shadow-footer)',
        'interest-active': 'var(--shadow-interest-active)',
      },
      maxWidth: {
        container: 'var(--width-container)',
        'sidebar-p': 'var(--spacing-sidebar-maxw)',
      },
      width: {
        card: 'var(--width-card)',
        sidebar: 'var(--sidebar-width)',
        'sidebar-mini': 'var(--sidebar-width-mini)',
      },
      height: {
        'btn-back': 'var(--height-btn-back)',
      },
      minHeight: {
        'error': 'var(--spacing-error-min-h)',
      },
      fontSize: {
        micro: 'var(--text-micro)',
        '2xs': 'var(--text-2xs)',
        'xs-alt': 'var(--text-xs-alt)',
        'xs-fixed': 'var(--text-xs-fixed)',
      },
      letterSpacing: {
        'wide-custom': 'var(--tracking-wide)',
        'wider-custom': 'var(--tracking-wider)',
      },
      blur: {
        glow: 'var(--blur-glow)',
      },
      dropShadow: {
        'logo-glow': 'var(--shadow-logo-glow)',
      },
      transitionDuration: {
        sidebar: 'var(--transition-sidebar)',
      },
    },
  },
  plugins: [],
}
