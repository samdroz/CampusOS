using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
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
            bool isNewInstance = false;
            using (Mutex appMutex = new Mutex(true, @"Local\CampusOS_SingleInstance_Mutex", out isNewInstance))
            {
                if (!isNewInstance)
                {
                    MessageBox.Show(
                        "CampusOS is already running.\nPlease check your taskbar or active windows.",
                        "CampusOS",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                    return;
                }

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

                StringBuilder stderrBuffer = new StringBuilder();
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = backendExe,
                        Arguments = "--port " + port + " --parent-pid " + Process.GetCurrentProcess().Id,
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        RedirectStandardError = true,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        WorkingDirectory = Path.GetDirectoryName(backendExe)
                    };

                    backendProcess = new Process();
                    backendProcess.StartInfo = psi;
                    backendProcess.ErrorDataReceived += (s, e) =>
                    {
                        if (!string.IsNullOrEmpty(e.Data))
                        {
                            lock (stderrBuffer)
                            {
                                stderrBuffer.AppendLine(e.Data);
                            }
                        }
                    };
                    backendProcess.Start();
                    backendProcess.BeginErrorReadLine();
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

                for (int i = 0; i < 40; i++)
                {
                    // Fast failure detection: If backend process terminated unexpectedly, exit polling immediately
                    if (backendProcess != null && backendProcess.HasExited)
                    {
                        break;
                    }

                    Thread.Sleep(300);
                    try
                    {
                        HttpWebRequest request = (HttpWebRequest)WebRequest.Create(healthUrl);
                        request.Proxy = null; // Disable system proxy / WPAD lookup for 127.0.0.1
                        request.Timeout = 1000;
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
                    string errorSnippet = "";
                    lock (stderrBuffer)
                    {
                        errorSnippet = stderrBuffer.ToString().Trim();
                    }

                    string exitInfo = "";
                    if (backendProcess != null && backendProcess.HasExited)
                    {
                        exitInfo = "\nBackend process terminated unexpectedly (Exit Code: " + backendProcess.ExitCode + ").";
                    }

                    CleanShutdown();

                    string details = "";
                    if (!string.IsNullOrEmpty(errorSnippet))
                    {
                        string preview = errorSnippet.Length > 500 ? errorSnippet.Substring(0, 500) + "..." : errorSnippet;
                        details = "\n\nError details:\n" + preview;
                    }

                    MessageBox.Show(
                        "CampusOS local backend failed to respond to the startup handshake.\nPlease check the logs in %APPDATA%\\CampusOS\\logs\\backend.log" + exitInfo + details,
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
                            Arguments = "--app=" + backendUrl + "/ --window-size=1280,820 --user-data-dir=\"" + webCache + "\" --disable-background-mode --no-first-run --no-default-browser-check",
                            UseShellExecute = false
                        };

                        Stopwatch sw = Stopwatch.StartNew();
                        Process edgeProc = Process.Start(edgePsi);
                        if (edgeProc != null)
                        {
                            edgeProc.WaitForExit();
                            sw.Stop();
                            // If Edge exited in less than 1500 ms with a non-zero exit code, launch failed
                            if (sw.ElapsedMilliseconds < 1500 && edgeProc.ExitCode != 0)
                            {
                                windowOpened = false;
                            }
                            else
                            {
                                windowOpened = true;
                            }
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
        }

        private static int FindAvailablePort(int start, int end)
        {
            // First check designated range
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

            // Fallback to ephemeral port 0
            try
            {
                TcpListener l = new TcpListener(IPAddress.Loopback, 0);
                l.Start();
                int p = ((IPEndPoint)l.LocalEndpoint).Port;
                l.Stop();
                return p;
            }
            catch { }

            return 18420;
        }

        private static void CleanShutdown()
        {
            if (backendProcess != null)
            {
                try
                {
                    if (!backendProcess.HasExited)
                    {
                        backendProcess.Kill();
                        backendProcess.WaitForExit(2000);
                    }
                }
                catch { }
                finally
                {
                    try { backendProcess.Dispose(); } catch { }
                    backendProcess = null;
                }
            }
        }
    }
}
