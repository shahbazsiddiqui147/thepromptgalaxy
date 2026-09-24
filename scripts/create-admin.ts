import { parseArgs } from 'node:util'
import { getPool } from '../src/db/pool'
import { createUser, UserInputError } from '../src/lib/users'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    name: { type: 'string' },
    handle: { type: 'string' },
    role: { type: 'string', default: 'admin' },
  },
})

if (!values.email || !values.password || !values.name || !values.handle) {
  console.error("Usage: pnpm create-admin --email you@example.com --password '...' --name 'Your Name' --handle yourhandle [--role admin|editor|moderator]")
  process.exit(1)
}

const role = values.role
if (role !== 'admin' && role !== 'editor' && role !== 'moderator') {
  console.error('--role must be admin, editor or moderator')
  process.exit(1)
}

const pool = getPool()
try {
  const id = await createUser(pool, {
    email: values.email,
    password: values.password,
    displayName: values.name,
    handle: values.handle,
    role,
  })
  console.log(`Created ${role} user #${id} (${values.email})`)
} catch (error) {
  if (error instanceof UserInputError) {
    console.error(error.message)
    process.exitCode = 1
  } else {
    throw error
  }
} finally {
  await pool.end()
}
