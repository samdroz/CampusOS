import os
import sys
import socket
import argparse
import logging
import threading
import time
import signal
import traceback
from pathlib import Path

# Add repository root to sys.path so 'backend' can be resolved in all execution contexts
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

# Mark desktop production mode
os.environ["CAMPUSOS_DESKTOP"] = "1"

def write_early_bootstrap_error(error_text: str):
    """Writes early crash info to %APPDATA%/CampusOS/logs/backend.log before normal logger setup."""
    try:
        app_data = os.environ.get("APPDATA")
        if not app_data:
            app_data = str(Path.home() / "AppData" / "Roaming")
        log_dir = Path(app_data) / "CampusOS" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / "backend.log"
        with open(log_file, "a", encoding="utf-8") as f:
            ts = time.strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"{ts} [FATAL] CampusOS-Backend Early Bootstrap: {error_text}\n")
    except Exception:
        pass

try:
    from backend.app.core.config import get_app_data_dir, settings
except Exception as exc:
    err = f"Failed to import core config:\n{traceback.format_exc()}"
    sys.stderr.write(err + "\n")
    sys.stderr.flush()
    write_early_bootstrap_error(err)
    sys.exit(1)

def find_available_port(start_port: int = 18420, max_port: int = 18999) -> int:
    """Finds an available local port on 127.0.0.1, preferring the designated range."""
    # First check designated range
    for port in range(start_port, max_port + 1):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("127.0.0.1", port))
                return port
        except OSError:
            continue

    # Fallback to ephemeral port 0
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", 0))
            return s.getsockname()[1]
    except Exception:
        pass

    return 18420

def setup_desktop_logging():
    """Sets up persistent error and access logging in the user AppData directory."""
    app_data = get_app_data_dir()
    logs_dir = app_data / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_file = logs_dir / "backend.log"

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(str(log_file), encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )
    return logging.getLogger("CampusOS-Backend")

def start_parent_watchdog(parent_pid: int, logger: logging.Logger):
    """Monitors parent process PID and exits if parent process terminates unexpectedly."""
    def watchdog_loop():
        logger.info(f"Watchdog active for parent PID: {parent_pid}")
        while True:
            time.sleep(1.5)
            # Check if parent is alive
            if sys.platform == "win32":
                import ctypes
                PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
                SYNCHRONIZE = 0x00100000
                handle = ctypes.windll.kernel32.OpenProcess(
                    PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE, False, parent_pid
                )
                if not handle:
                    logger.warning("Parent process handle closed. Terminating backend sidecar...")
                    os._exit(0)
                # Check exit code
                exit_code = ctypes.c_ulong()
                ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(exit_code))
                ctypes.windll.kernel32.CloseHandle(handle)
                STILL_ACTIVE = 259
                if exit_code.value != STILL_ACTIVE:
                    logger.warning("Parent process exited. Terminating backend sidecar...")
                    os._exit(0)
            else:
                try:
                    os.kill(parent_pid, 0)
                except OSError:
                    logger.warning("Parent process dead. Terminating backend sidecar...")
                    os._exit(0)

    t = threading.Thread(target=watchdog_loop, daemon=True, name="ParentWatchdog")
    t.start()

def main():
    parser = argparse.ArgumentParser(description="CampusOS Desktop Backend Sidecar")
    parser.add_argument("--port", type=int, default=0, help="Port to bind to (0 for auto-assign)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host (must be 127.0.0.1)")
    parser.add_argument("--parent-pid", type=int, default=None, help="Parent process PID to monitor")
    parser.add_argument("--handshake-file", type=str, default=None, help="Path to write handshake port/URL")
    args = parser.parse_args()

    # Ensure host is strictly local
    host = "127.0.0.1"
    if args.host != "127.0.0.1" and args.host != "localhost":
        print("[CampusOS] Warning: Non-local host requested. Restricting strictly to 127.0.0.1 for security.")

    logger = setup_desktop_logging()
    logger.info("Initializing CampusOS Desktop Backend Sidecar...")

    # Select port
    port = args.port
    if not port or port <= 0:
        port = find_available_port()

    # Import diagnostic logger
    from backend.app.main import write_onboarding_debug_log, BUILD_ID
    write_onboarding_debug_log(
        "BACKEND_PROCESS_INIT",
        "desktop_entry.py initializing sidecar",
        {
            "build_id": BUILD_ID,
            "pid": os.getpid(),
            "parent_pid": args.parent_pid,
            "port": port,
            "executable": sys.executable,
            "argv": sys.argv,
            "meipass": getattr(sys, "_MEIPASS", None),
        }
    )

    # Start parent watchdog if specified
    if args.parent_pid:
        start_parent_watchdog(args.parent_pid, logger)

    backend_url = f"http://{host}:{port}"

    # Write handshake to AppData
    app_data = get_app_data_dir()
    port_file = app_data / "backend_endpoint.txt"
    try:
        port_file.write_text(backend_url, encoding="utf-8")
    except Exception as e:
        logger.error(f"Failed to write endpoint file: {e}")

    if args.handshake_file:
        try:
            Path(args.handshake_file).write_text(backend_url, encoding="utf-8")
        except Exception as e:
            logger.error(f"Failed to write handshake file: {e}")

    # Emit handshake line to stdout for Tauri / process supervisor
    print(f"CAMPUSOS_BACKEND_READY:{backend_url}", flush=True)
    logger.info(f"CampusOS Backend running at {backend_url}")

    # Graceful shutdown handler
    def handle_signal(sig, frame):
        logger.info(f"Received signal {sig}. Shutting down backend sidecar gracefully...")
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    # Launch uvicorn
    import uvicorn
    from backend.app.main import app

    try:
        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level="info",
            access_log=False,
        )
    except Exception as exc:
        err = f"Fatal backend sidecar crash:\n{traceback.format_exc()}"
        logger.critical(err)
        sys.stderr.write(err + "\n")
        sys.stderr.flush()
        write_early_bootstrap_error(err)
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        err = f"Unhandled exception in main:\n{traceback.format_exc()}"
        sys.stderr.write(err + "\n")
        sys.stderr.flush()
        write_early_bootstrap_error(err)
        sys.exit(1)
