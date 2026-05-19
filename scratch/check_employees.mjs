import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const envLocalPath = join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envLocalPath, 'utf8')
const envVars = Object.fromEntries(
  envContent.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const parts = line.split('=')
      const key = parts[0].trim()
      let value = parts.slice(1).join('=').trim()
      // remove quotes if any
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
      return [key, value]
    })
)

const url = envVars.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || ''

console.log('Connecting to:', url)

const supabase = createClient(url, serviceKey)

async function run() {
  const { data, error } = await supabase.from('employees').select('*').limit(3)
  if (error) {
    console.error('Error fetching employees:', error)
    return
  }
  console.log('Employee count fetched:', data?.length)
  if (data && data.length > 0) {
    console.log('Keys of first employee:', Object.keys(data[0]))
    console.log('First employee data:', JSON.stringify(data[0], null, 2))
  } else {
    console.log('No employees found in database.')
  }
}

run()
