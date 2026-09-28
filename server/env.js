// Reads a local .env file (KEY=value lines) into process.env before anything else runs. Real environment variables win.
// The file is git-ignored and never copied into the Docker image.
try {
  process.loadEnvFile('.env')
} catch {
  /* no .env file, which is fine */
}
