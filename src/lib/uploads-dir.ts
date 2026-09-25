import path from 'node:path'

/** Where uploaded images live. Defaults to ./uploads next to the app; override with UPLOADS_DIR. */
export function getUploadsDir(): string {
  return process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve('uploads')
}
