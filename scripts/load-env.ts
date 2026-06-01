/**
 * Load .env then .env.local before any app modules read process.env.
 * Import this as the first line in standalone tsx scripts.
 */
import dotenv from 'dotenv'
import { resolve } from 'path'

const root = process.cwd()
dotenv.config({ path: resolve(root, '.env') })
dotenv.config({ path: resolve(root, '.env.local'), override: true })
