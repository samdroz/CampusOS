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
                        edgeProc.WaitForExit();
                    }
                }
                else
                {
                    // Fallback to default browser
                    Process.Start(backendUrl + "/");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error launching desktop interface:\n" + ex.Message,
                    "CampusOS Window Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
            }
            finally
            {
                CleanShutdown();
            }
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
