import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // В кавычках должно быть ИМЯ ТВОЕГО РЕПОЗИТОРИЯ на GitHub
  // Если репозиторий называется "lust-tok", то пиши '/lust-tok/'
  base: '/lustios-tok/', 
})