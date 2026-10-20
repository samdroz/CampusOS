use std::net::TcpListener;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Manager, RunEvent};

struct BackendState {
    port: u16,
    url: String,
    child: Arc<Mutex<Option<Child>>>,
}

fn find_available_port(start: u16, end: u16) -> u16 {
    // Try binding to 0 for ephemeral port
    if let Ok(listener) = TcpListener::bind("127.0.0.1:0") {
        if let Ok(addr) = listener.local_addr() {
            return addr.port();
        }
    }
    for port in start..end {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return port;
        }
    }
    18000
}

fn check_backend_health(port: u16) -> bool {
    use std::io::{Read, Write};
    use std::net::{SocketAddr, TcpStream};
    use std::time::Duration;

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let mut stream = match TcpStream::connect_timeout(&addr, Duration::from_millis(600)) {
        Ok(s) => s,
        Err(_) => return false,
    };

    let _ = stream.set_read_timeout(Some(Duration::from_millis(600)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(600)));

    let request = format!(
        "GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nConnection: close\r\nAccept: application/json\r\n\r\n",
        port
    );

    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }

    let mut response_bytes = Vec::with_capacity(1024);
    let mut chunk = [0u8; 512];
    const MAX_RESPONSE_BYTES: usize = 4096;

    // Read incrementally up to bounded maximum size to handle partial chunks and avoid EOF hanging
    while response_bytes.len() < MAX_RESPONSE_BYTES {
        match stream.read(&mut chunk) {
            Ok(0) => break, // Server closed connection (EOF)
            Ok(n) => {
                response_bytes.extend_from_slice(&chunk[..n]);
                let partial = String::from_utf8_lossy(&response_bytes);
                // When header boundary is received, validate status line and body payload
                if let Some(body_start) = partial.find("\r\n\r\n") {
                    let headers = &partial[..body_start];
                    let body = &partial[body_start + 4..];
                    let is_status_200 = headers.starts_with("HTTP/1.1 200") || headers.starts_with("HTTP/1.0 200");
                    let is_healthy_payload = body.contains("\"status\":\"healthy\"") || body.contains("\"status\": \"healthy\"");
                    if is_status_200 && is_healthy_payload {
                        return true;
                    }
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut || e.kind() == std::io::ErrorKind::WouldBlock => {
                // Read timeout hit; break and evaluate whatever has been buffered
                break;
            }
            Err(_) => break,
        }
    }

    let final_str = String::from_utf8_lossy(&response_bytes);
    if let Some(body_start) = final_str.find("\r\n\r\n") {
        let headers = &final_str[..body_start];
        let body = &final_str[body_start + 4..];
        let is_status_200 = headers.starts_with("HTTP/1.1 200") || headers.starts_with("HTTP/1.0 200");
        let is_healthy_payload = body.contains("\"status\":\"healthy\"") || body.contains("\"status\": \"healthy\"");
        return is_status_200 && is_healthy_payload;
    }
    false
}

#[tauri::command]
fn get_backend_url(state: tauri::State<Arc<BackendState>>) -> String {
    state.url.clone()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let port = find_available_port(18000, 18999);
    let backend_url = format!("http://127.0.0.1:{}", port);
    let child_holder: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));

    let backend_state = Arc::new(BackendState {
        port,
        url: backend_url.clone(),
        child: child_holder.clone(),
    });

    tauri::Builder::default()
        .manage(backend_state.clone())
        .invoke_handler(tauri::generate_handler![get_backend_url])
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_handle = app.handle().clone();
            let parent_pid = std::process::id();
            let sidecar_child = child_holder.clone();

            // Spawn backend in background thread
            thread::spawn(move || {
                let current_exe = std::env::current_exe().unwrap_or_default();
                let exe_dir = current_exe.parent().unwrap_or(std::path::Path::new(""));

                // Candidate sidecar paths
                let candidates = vec![
                    exe_dir.join("campusos-backend.exe"),
                    exe_dir.join("binaries").join("campusos-backend-x86_64-pc-windows-msvc.exe"),
                    exe_dir.join("binaries").join("campusos-backend-x86_64-pc-windows-gnu.exe"),
                    std::path::PathBuf::from("src-tauri/binaries/campusos-backend-x86_64-pc-windows-msvc.exe"),
                    std::path::PathBuf::from("binaries/campusos-backend-x86_64-pc-windows-msvc.exe"),
                    std::path::PathBuf::from("../dist/campusos-backend.exe"),
                    std::path::PathBuf::from("dist/campusos-backend.exe"),
                ];

                let mut sidecar_exe = None;
                for cand in candidates {
                    if cand.exists() {
                        sidecar_exe = Some(cand);
                        break;
                    }
                }

                if let Some(exe_path) = sidecar_exe {
                    println!("[CampusOS] Starting backend sidecar at {:?} on port {}", exe_path, port);
                    match Command::new(&exe_path)
                        .arg("--port")
                        .arg(port.to_string())
                        .arg("--parent-pid")
                        .arg(parent_pid.to_string())
                        .spawn()
                    {
                        Ok(child) => {
                            if let Ok(mut lock) = sidecar_child.lock() {
                                *lock = Some(child);
                            }
                        }
                        Err(err) => {
                            eprintln!("[CampusOS] Failed to spawn backend sidecar: {:?}", err);
                        }
                    }
                } else {
                    println!("[CampusOS] Sidecar executable not found locally; connecting to dev backend if running.");
                }

                // Poll health check for up to 15 seconds using real /api/health HTTP requests
                let mut is_healthy = false;
                for _ in 0..30 {
                    thread::sleep(Duration::from_millis(500));
                    if check_backend_health(port) {
                        is_healthy = true;
                        break;
                    }
                }
                if is_healthy {
                    println!("[CampusOS] Backend health check verified successfully.");
                } else {
                    eprintln!("[CampusOS] Backend startup handshake timed out.");
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app_handle, event| {
            if let RunEvent::ExitRequested { .. } | RunEvent::Exit = event {
                println!("[CampusOS] App exiting. Terminating backend sidecar...");
                if let Ok(mut lock) = backend_state.child.lock() {
                    if let Some(mut child) = lock.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        });
}
