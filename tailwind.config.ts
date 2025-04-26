
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'poppins': ['Poppins', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					green: '#4CAF50',
					yellow: '#FFEB3B',
					blue: '#03A9F4'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				agri: {
					// Core brand colors
					green: '#2E7D32', // Rich forest green
					darkGreen: '#1B5E20', // Deep forest green
					lightGreen: '#66BB6A', // Bright leaf green
					freshGreen: '#81C784', // Fresh spring green
					lime: '#AED581', // Lime green
					
					// Earth tones
					soil: '#795548', // Rich soil brown
					darkSoil: '#5D4037', // Deep earth brown
					sand: '#D7CCC8', // Sandy soil
					clay: '#A1887F', // Clay soil
					
					// Sky and water
					blue: '#1976D2', // Sky blue
					lightBlue: '#4FC3F7', // Water blue
					teal: '#26A69A', // Teal accent
					
					// Harvest colors
					yellow: '#FDD835', // Wheat/corn yellow
					gold: '#FFB300', // Golden harvest
					amber: '#FFB74D', // Amber grain
					orange: '#FF9800', // Pumpkin/citrus
					
					// Fruit and vegetables
					tomato: '#E53935', // Tomato red
					berry: '#C2185B', // Berry purple
					eggplant: '#7B1FA2', // Eggplant purple
					carrot: '#FF7043', // Carrot orange
					
					// UI colors
					alert: '#F44336', // Alert red
					warning: '#FF9800', // Warning orange
					success: '#4CAF50', // Success green
					info: '#2196F3', // Information blue
					
					// Neutral tones
					offWhite: '#FAFAFA', // Off-white background
					paper: '#F5F5F5', // Paper background
					stone: '#EEEEEE', // Stone gray
					slate: '#90A4AE' // Slate blue-gray
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
