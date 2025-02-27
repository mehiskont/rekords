import fs from "fs"
import path from "path"

const logDir = path.join(process.cwd(), "logs")

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}

function getLogFile() {
  const date = new Date().toISOString().split("T")[0]
  return path.join(logDir, `${date}.log`)
}

export function log(message: string, level: "info" | "error" | "warn" = "info") {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`

  fs.appendFileSync(getLogFile(), logMessage)

  // Also log to console in development
  if (process.env.NODE_ENV === "development") {
    console[level](message)
  }
}

