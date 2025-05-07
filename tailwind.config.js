/** @type {import('tailwindcss').Config} */
export const content = [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
];
export const theme = {
    extend: {
        colors: {
            primary: {
                400: '#4f85e6', // lighter blue
                500: '#6666AA', // main blue
                700: '#222288', // darker blue
            },
            accent: {
                400: '#ffcc66', // lighter gold
                500: '#ffbb33', // main gold
                600: '#F4B400', // darker gold
            }
        },
    },
};
export const plugins = [];