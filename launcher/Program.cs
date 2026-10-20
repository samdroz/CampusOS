using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

namespace CampusOS
{
    static class Program
    {
        private static Process backendProcess = null;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string backendExe = Path.Combine(exeDir, "campusos-backend.exe");

            if (!File.Exists(backendExe))
            {
                // Also check dist/
                string altBackend = Path.Combine(exeDir, "..", "dist", "campusos-backend.exe");
                if (File.Exists(altBackend))
                {
                    backendExe = Path.GetFullPath(altBackend);
                }
                else
                {
                    MessageBox.Show(
                        "CampusOS backend engine executable could not be found.\nExpected at: " + backendExe,
                        "CampusOS Startup Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }
            }

            int port = FindAvailablePort(18420, 18999);
            string backendUrl = "http://127.0.0.1:" + port;

            // Register cleanup on app exit
            AppDomain.CurrentDomain.ProcessExit += (s, e) => CleanShutdown();

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = backendExe,
                    Arguments = "--port " + port + " --parent-pid " + Process.GetCurrentProcess().Id,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    WorkingDirectory = Path.GetDirectoryName(backendExe)
                };

                backendProcess = Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Failed to start CampusOS local backend:\n" + ex.Message,
                    "CampusOS Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // Wait for backend health check
            bool healthy = false;
            string healthUrl = backendUrl + "/api/health";

            for (int i = 0; i < 30; i++)
            {
                Thread.Sleep(300);
                try
                {
                    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(healthUrl);
                    request.Timeout = 1500;
                    using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                    {
                        if (response.StatusCode == HttpStatusCode.OK)
                        {
                            healthy = true;
                            break;
                        }
                    }
                }
                catch
                {
                    // Keep waiting
                }
            }

            if (!healthy)
            {
                CleanShutdown();
                MessageBox.Show(
                    "CampusOS local backend failed to respond to the startup handshake.\nPlease check the logs in %APPDATA%\\CampusOS\\logs\\backend.log",
                    "CampusOS Handshake Timeout",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // Launch Native Application Window
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string webCache = Path.Combine(appData, "CampusOS", "webview_cache");

            bool windowOpened = false;
            try
            {
                if (File.Exists(edgePath))
                {
                    ProcessStartInfo edgePsi = new ProcessStartInfo
                    {
                        FileName = edgePath,
                        Arguments = "--app=" + backendUrl + "/ --window-size=1280,820 --user-data-dir=\"" + webCache + "\"",
                        UseShellExecute = false
                    };
                    Process edgeProc = Process.Start(edgePsi);
                    if (edgeProc != null)
                    {
                        windowOpened = true;
                        edgeProc.WaitForExit();
                    }
                }
            }
            catch
            {
                // Edge launch failed, proceed to browser fallback
                windowOpened = false;
            }

            if (!windowOpened)
            {
                try
                {
                    ProcessStartInfo browserPsi = new ProcessStartInfo
                    {
                        FileName = backendUrl + "/",
                        UseShellExecute = true
                    };
                    Process.Start(browserPsi);

                    // Keep the launcher process alive so the local backend remains active
                    MessageBox.Show(
                        "CampusOS is running in your default web browser:\n" + backendUrl + "/\n\n" +
                        "Click OK when you are finished using CampusOS to shut down the backend services.",
                        "CampusOS - Running in Browser",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }
                catch (Exception browserEx)
                {
                    // Backend is active; keep launcher alive so user can browse manually and shut down cleanly on dismissal
                    MessageBox.Show(
                        "CampusOS local backend is active at:\n" + backendUrl + "/\n\n" +
                        "The system could not launch your default web browser automatically:\n" +
                        browserEx.Message + "\n\n" +
                        "Please open your web browser manually and navigate to:\n" +
                        backendUrl + "/\n\n" +
                        "Keep this dialog open while using CampusOS.\n" +
                        "Click OK when you are finished to shut down the backend services.",
                        "CampusOS - Running in Browser (Manual)",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                }
            }

            CleanShutdown();
        }

        private static int FindAvailablePort(int start, int end)
        {
            try
            {
                TcpListener l = new TcpListener(IPAddress.Loopback, 0);
                l.Start();
                int p = ((IPEndPoint)l.LocalEndpoint).Port;
                l.Stop();
                return p;
            }
            catch { }

            for (int p = start; p <= end; p++)
            {
                try
                {
                    TcpListener l = new TcpListener(IPAddress.Loopback, p);
                    l.Start();
                    l.Stop();
                    return p;
                }
                catch { }
            }
            return 18420;
        }

        private static void CleanShutdown()
        {
            if (backendProcess != null && !backendProcess.HasExited)
            {
                try
                {
                    backendProcess.Kill();
                    backendProcess.WaitForExit(2000);
                }
                catch { }
                backendProcess = null;
            }
        }
    }
}
