import { Archivo } from 'next/font/google'

// Weights match the Modernist sheet: 400 body, 600 labels, 800 headings.
export const archivo = Archivo({
  weight: ['400', '600', '800'],
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})
