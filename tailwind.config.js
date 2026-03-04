/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-inter)", "sans-serif"],
                serif: ["var(--font-garamond)", "serif"],
            },
            // Editorial spacing scale (8px grid)
            // These reference CSS variables to prevent drift
            spacing: {
                'xs': 'var(--space-xs)',    // 4px
                'sm': 'var(--space-sm)',    // 8px
                'md': 'var(--space-md)',    // 16px
                'lg': 'var(--space-lg)',    // 24px
                'xl': 'var(--space-xl)',    // 48px
                '2xl': 'var(--space-2xl)',  // 96px
            },
            // Editorial colors
            colors: {
                'ivory': 'var(--ivory)',
                'ink': 'var(--ink)',
                'forest-green': 'var(--forest-green)',
                'rose-gold': 'var(--rose-gold)',
                'rose-gold-muted': 'var(--rose-gold-muted)',
            },
            // Near-sharp border radius for editorial feel
            borderRadius: {
                'editorial': 'var(--border-radius)',
            },
        },
    },
    plugins: [],
};
