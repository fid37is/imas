/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    400: '#4f85e6',  // lighter blue
                    500: '#3366cc',  // main blue
                    700: '#1a3366',  // darker blue
                },
                accent: {
                    400: '#ffcc66',  // lighter gold
                    500: '#ffbb33',  // main gold
                    600: '#F4B400',  // darker gold
                }
            },
        },
    },
    plugins: [],
}