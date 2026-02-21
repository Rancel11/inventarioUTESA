import { app, BrowserWindow } from "electron";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL("http://localhost:3000");
}

function startServer() {
  const serverPath = path.join(__dirname, "server.js");

  serverProcess = spawn("node", [serverPath], {
    shell: true
  });

  serverProcess.stdout.on("data", (data) => {
    console.log(`Backend: ${data}`);
  });

  serverProcess.stderr.on("data", (data) => {
    console.error(`Backend error: ${data}`);
  });
}

app.whenReady().then(() => {
  startServer();

  // Esperar 2 segundos para que el servidor arranque
  setTimeout(() => {
    createWindow();
  }, 2000);
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});