import { Anton, Archivo, JetBrains_Mono } from 'next/font/google'

export const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

export const archivo = Archivo({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

export const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
