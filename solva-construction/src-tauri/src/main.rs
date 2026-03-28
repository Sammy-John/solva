use chrono::Utc;
use rusqlite::{params, Connection, Error as SqliteError, OptionalExtension};
use serde::Serialize;
use std::{env, fs, path::PathBuf, process::Command};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[derive(Serialize)]
struct ProjectRecord {
    id: String,
    name: String,
    description: String,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize)]
struct ProjectScheduleRecord {
    project_id: String,
    tasks_json: String,
    sections_json: String,
    dependencies_json: String,
    people_json: String,
    updated_at: String,
}

#[derive(Serialize)]
struct ScheduleSnapshotRecord {
    id: String,
    project_id: String,
    label: String,
    tasks_json: String,
    sections_json: String,
    dependencies_json: String,
    people_json: String,
    created_at: String,
}

#[derive(Serialize)]
struct StorageStatusRecord {
    runtime: String,
    storage_mode: String,
    db_path: String,
    data_dir: String,
    executable_path: String,
    is_packaged: bool,
    message: String,
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;

    Ok(app_data_dir.join("construction-planner.db"))
}

fn storage_status(app: &AppHandle, storage_mode: &str, message: &str) -> Result<StorageStatusRecord, String> {
    let path = db_path(app)?;
    let data_dir = path
        .parent()
        .map(PathBuf::from)
        .ok_or_else(|| "Failed to resolve database parent directory".to_string())?;
    let executable_path = env::current_exe()
        .map_err(|e| format!("Failed to resolve current executable path: {e}"))?;

    Ok(StorageStatusRecord {
        runtime: "tauri".to_string(),
        storage_mode: storage_mode.to_string(),
        db_path: path.to_string_lossy().to_string(),
        data_dir: data_dir.to_string_lossy().to_string(),
        executable_path: executable_path.to_string_lossy().to_string(),
        is_packaged: !cfg!(debug_assertions),
        message: message.to_string(),
    })
}

fn log_storage_status(status: &StorageStatusRecord) {
    eprintln!("[storage] runtime={}", status.runtime);
    eprintln!("[storage] mode={}", status.storage_mode);
    eprintln!("[storage] data_dir={}", status.data_dir);
    eprintln!("[storage] db_path={}", status.db_path);
    eprintln!("[storage] executable_path={}", status.executable_path);
    eprintln!("[storage] is_packaged={}", status.is_packaged);
    eprintln!("[storage] message={}", status.message);
}

fn ensure_optional_columns(conn: &Connection) -> Result<(), String> {
    let statements = [
        "ALTER TABLE project_schedule ADD COLUMN dependencies_json TEXT NOT NULL DEFAULT '[]'",
        "ALTER TABLE project_schedule ADD COLUMN people_json TEXT NOT NULL DEFAULT '[]'",
    ];

    for statement in statements {
        match conn.execute(statement, []) {
            Ok(_) => {}
            Err(SqliteError::SqliteFailure(_, Some(message)))
                if message.contains("duplicate column name") => {}
            Err(error) => {
                return Err(format!("Failed to ensure optional column via '{statement}': {error}"));
            }
        }
    }

    Ok(())
}

fn ensure_schema(conn: &Connection) -> Result<(), String> {
    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|e| format!("Failed to enable foreign keys: {e}"))?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS project_schedule (
          project_id TEXT PRIMARY KEY,
          tasks_json TEXT NOT NULL DEFAULT '[]',
          sections_json TEXT NOT NULL DEFAULT '[]',
          dependencies_json TEXT NOT NULL DEFAULT '[]',
          people_json TEXT NOT NULL DEFAULT '[]',
          updated_at TEXT NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS schedule_snapshots (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          label TEXT NOT NULL,
          tasks_json TEXT NOT NULL DEFAULT '[]',
          sections_json TEXT NOT NULL DEFAULT '[]',
          dependencies_json TEXT NOT NULL DEFAULT '[]',
          people_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        ",
    )
    .map_err(|e| format!("Failed to create database schema: {e}"))?;

    ensure_optional_columns(conn)
}

fn open_db(app: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(path).map_err(|e| format!("Failed to open SQLite database: {e}"))?;
    ensure_schema(&conn)?;
    Ok(conn)
}

#[tauri::command]
fn init_database(app: AppHandle) -> Result<StorageStatusRecord, String> {
    let status = storage_status(&app, "sqlite", "SQLite database is active.")?;
    log_storage_status(&status);

    match Connection::open(&status.db_path) {
        Ok(conn) => {
            if let Err(error) = ensure_schema(&conn) {
                eprintln!("[storage] SQLite schema setup failed: {error}");
                return Err(error);
            }

            eprintln!("[storage] SQLite connection succeeded");
            Ok(status)
        }
        Err(error) => {
            let message = format!("Failed to open SQLite database: {error}");
            let failure_status = storage_status(&app, "sqlite-error", &message)?;
            log_storage_status(&failure_status);
            eprintln!("[storage] SQLite connection failed: {message}");
            Err(message)
        }
    }
}

#[tauri::command]
fn open_data_folder(app: AppHandle) -> Result<String, String> {
    let path = db_path(&app)?;
    let data_dir = path
        .parent()
        .map(PathBuf::from)
        .ok_or_else(|| "Failed to resolve database parent directory".to_string())?;

    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data directory: {e}"))?;

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut cmd = Command::new("explorer");
        cmd.arg(&data_dir);
        cmd
    };

    #[cfg(target_os = "macos")]
    let mut command = {
        let mut cmd = Command::new("open");
        cmd.arg(&data_dir);
        cmd
    };

    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut cmd = Command::new("xdg-open");
        cmd.arg(&data_dir);
        cmd
    };

    command
        .spawn()
        .map_err(|e| format!("Failed to open data folder: {e}"))?;

    eprintln!("[storage] Opened data folder: {}", data_dir.display());
    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn list_projects(app: AppHandle) -> Result<Vec<ProjectRecord>, String> {
    let conn = open_db(&app)?;
    let mut statement = conn
        .prepare(
            "
            SELECT id, name, description, created_at, updated_at
            FROM projects
            ORDER BY datetime(created_at) DESC
            ",
        )
        .map_err(|e| format!("Failed to prepare projects query: {e}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to query projects: {e}"))?;

    rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read projects: {e}"))
}

#[tauri::command]
fn create_project(app: AppHandle, name: String, description: Option<String>) -> Result<ProjectRecord, String> {
    let trimmed_name = name.trim();
    if trimmed_name.is_empty() {
        return Err("Project name is required".to_string());
    }

    let conn = open_db(&app)?;
    let now = Utc::now().to_rfc3339();
    let project = ProjectRecord {
        id: Uuid::new_v4().to_string(),
        name: trimmed_name.to_string(),
        description: description.unwrap_or_default().trim().to_string(),
        created_at: now.clone(),
        updated_at: now,
    };

    conn.execute(
        "
        INSERT INTO projects (id, name, description, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ",
        params![
            project.id,
            project.name,
            project.description,
            project.created_at,
            project.updated_at
        ],
    )
    .map_err(|e| format!("Failed to insert project: {e}"))?;

    Ok(project)
}

#[tauri::command]
fn import_project_with_id(
    app: AppHandle,
    project_id: String,
    name: String,
    description: Option<String>,
    created_at: Option<String>,
    updated_at: Option<String>,
) -> Result<ProjectRecord, String> {
    let trimmed_project_id = project_id.trim();
    if trimmed_project_id.is_empty() {
        return Err("Project ID is required".to_string());
    }

    let trimmed_name = name.trim();
    if trimmed_name.is_empty() {
        return Err("Project name is required".to_string());
    }

    let now = Utc::now().to_rfc3339();
    let created = created_at
        .unwrap_or_else(|| now.clone())
        .trim()
        .to_string();
    let updated = updated_at
        .unwrap_or_else(|| created.clone())
        .trim()
        .to_string();

    let conn = open_db(&app)?;

    conn.execute(
        "
        INSERT INTO projects (id, name, description, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(id) DO NOTHING
        ",
        params![
            trimmed_project_id,
            trimmed_name,
            description.unwrap_or_default().trim().to_string(),
            created,
            updated
        ],
    )
    .map_err(|e| format!("Failed to import project by ID: {e}"))?;

    conn.query_row(
        "
        SELECT id, name, description, created_at, updated_at
        FROM projects
        WHERE id = ?1
        ",
        params![trimmed_project_id],
        |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| format!("Failed to read imported project: {e}"))
}

#[tauri::command]
fn update_project(
    app: AppHandle,
    project_id: String,
    name: String,
    description: Option<String>,
) -> Result<ProjectRecord, String> {
    let trimmed_project_id = project_id.trim();
    if trimmed_project_id.is_empty() {
        return Err("Project ID is required".to_string());
    }

    let trimmed_name = name.trim();
    if trimmed_name.is_empty() {
        return Err("Project name is required".to_string());
    }

    let conn = open_db(&app)?;
    let now = Utc::now().to_rfc3339();
    let trimmed_description = description.unwrap_or_default().trim().to_string();

    let affected = conn
        .execute(
            "
            UPDATE projects
            SET name = ?1, description = ?2, updated_at = ?3
            WHERE id = ?4
            ",
            params![trimmed_name, trimmed_description, now, trimmed_project_id],
        )
        .map_err(|e| format!("Failed to update project: {e}"))?;

    if affected == 0 {
        return Err("Project not found".to_string());
    }

    conn.query_row(
        "
        SELECT id, name, description, created_at, updated_at
        FROM projects
        WHERE id = ?1
        ",
        params![trimmed_project_id],
        |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| format!("Failed to read updated project: {e}"))
}

#[tauri::command]
fn delete_project(app: AppHandle, project_id: String) -> Result<(), String> {
    let trimmed_project_id = project_id.trim();
    if trimmed_project_id.is_empty() {
        return Err("Project ID is required".to_string());
    }

    let conn = open_db(&app)?;
    conn.execute(
        "
        DELETE FROM project_schedule
        WHERE project_id = ?1
        ",
        params![trimmed_project_id],
    )
    .map_err(|e| format!("Failed to delete project schedule: {e}"))?;

    let affected = conn
        .execute(
            "
            DELETE FROM projects
            WHERE id = ?1
            ",
            params![trimmed_project_id],
        )
        .map_err(|e| format!("Failed to delete project: {e}"))?;

    if affected == 0 {
        return Err("Project not found".to_string());
    }

    Ok(())
}

#[tauri::command]
fn get_project_schedule(app: AppHandle, project_id: String) -> Result<ProjectScheduleRecord, String> {
    let trimmed_project_id = project_id.trim();
    if trimmed_project_id.is_empty() {
        return Err("Project ID is required".to_string());
    }

    let conn = open_db(&app)?;
    let row = conn
        .query_row(
            "
            SELECT project_id, tasks_json, sections_json, dependencies_json, people_json, updated_at
            FROM project_schedule
            WHERE project_id = ?1
            ",
            params![trimmed_project_id],
            |row| {
                Ok(ProjectScheduleRecord {
                    project_id: row.get(0)?,
                    tasks_json: row.get(1)?,
                    sections_json: row.get(2)?,
                    dependencies_json: row.get(3)?,
                    people_json: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|e| format!("Failed to load project schedule: {e}"))?;

    match row {
        Some(record) => {
            eprintln!("[schedule] Loaded schedule row for project_id={}", trimmed_project_id);
            Ok(record)
        }
        None => {
            eprintln!("[schedule] No schedule row found for project_id={}, returning empty schedule", trimmed_project_id);
            Ok(ProjectScheduleRecord {
                project_id: trimmed_project_id.to_string(),
                tasks_json: "[]".to_string(),
                sections_json: "[]".to_string(),
                dependencies_json: "[]".to_string(),
                people_json: "[]".to_string(),
                updated_at: Utc::now().to_rfc3339(),
            })
        }
    }
}

#[tauri::command]
fn save_project_schedule(
    app: AppHandle,
    project_id: String,
    tasks_json: String,
    sections_json: String,
    dependencies_json: String,
    people_json: String,
) -> Result<ProjectScheduleRecord, String> {
    let trimmed_project_id = project_id.trim();
    if trimmed_project_id.is_empty() {
        return Err("Project ID is required".to_string());
    }

    let conn = open_db(&app)?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "
        INSERT INTO project_schedule (project_id, tasks_json, sections_json, dependencies_json, people_json, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(project_id) DO UPDATE SET
          tasks_json = excluded.tasks_json,
          sections_json = excluded.sections_json,
          dependencies_json = excluded.dependencies_json,
          people_json = excluded.people_json,
          updated_at = excluded.updated_at
        ",
        params![trimmed_project_id, tasks_json, sections_json, dependencies_json, people_json, now],
    )
    .map_err(|e| format!("Failed to save project schedule: {e}"))?;

    let updated_at = conn
        .query_row(
            "
            SELECT updated_at FROM project_schedule WHERE project_id = ?1
            ",
            params![trimmed_project_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|e| format!("Failed to read saved project schedule timestamp: {e}"))?;

    eprintln!("[schedule] Saved schedule row for project_id={}", trimmed_project_id);

    Ok(ProjectScheduleRecord {
        project_id: trimmed_project_id.to_string(),
        tasks_json,
        sections_json,
        dependencies_json,
        people_json,
        updated_at,
    })
}

#[tauri::command]
fn clear_project_people(app: AppHandle, project_id: String) -> Result<(), String> {
    let trimmed_project_id = project_id.trim();
    if trimmed_project_id.is_empty() {
        return Err("Project ID is required".to_string());
    }

    let conn = open_db(&app)?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "
        INSERT INTO project_schedule (project_id, tasks_json, sections_json, dependencies_json, people_json, updated_at)
        VALUES (?1, '[]', '[]', '[]', '[]', ?2)
        ON CONFLICT(project_id) DO UPDATE SET
          people_json = '[]',
          updated_at = excluded.updated_at
        ",
        params![trimmed_project_id, now],
    )
    .map_err(|e| format!("Failed to clear project people: {e}"))?;

    Ok(())
}


#[tauri::command]
fn save_project_snapshot(
    app: AppHandle,
    project_id: String,
    label: Option<String>,
    tasks_json: String,
    sections_json: String,
    dependencies_json: String,
    people_json: String,
) -> Result<ScheduleSnapshotRecord, String> {
    let trimmed_project_id = project_id.trim();
    if trimmed_project_id.is_empty() {
        return Err("Project ID is required".to_string());
    }

    let conn = open_db(&app)?;
    let now = Utc::now().to_rfc3339();
    let generated_label = format!("Snapshot {}", Utc::now().format("%Y-%m-%d %H:%M:%S"));
    let final_label = label.unwrap_or(generated_label).trim().to_string();

    let snapshot = ScheduleSnapshotRecord {
        id: Uuid::new_v4().to_string(),
        project_id: trimmed_project_id.to_string(),
        label: if final_label.is_empty() {
            format!("Snapshot {}", Utc::now().format("%Y-%m-%d %H:%M:%S"))
        } else {
            final_label
        },
        tasks_json,
        sections_json,
        dependencies_json,
        people_json,
        created_at: now,
    };

    conn.execute(
        "
        INSERT INTO schedule_snapshots (id, project_id, label, tasks_json, sections_json, dependencies_json, people_json, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ",
        params![
            snapshot.id,
            snapshot.project_id,
            snapshot.label,
            snapshot.tasks_json,
            snapshot.sections_json,
            snapshot.dependencies_json,
            snapshot.people_json,
            snapshot.created_at
        ],
    )
    .map_err(|e| format!("Failed to save schedule snapshot: {e}"))?;

    Ok(snapshot)
}

#[tauri::command]
fn list_project_snapshots(app: AppHandle, project_id: String) -> Result<Vec<ScheduleSnapshotRecord>, String> {
    let trimmed_project_id = project_id.trim();
    if trimmed_project_id.is_empty() {
        return Err("Project ID is required".to_string());
    }

    let conn = open_db(&app)?;
    let mut statement = conn
        .prepare(
            "
            SELECT id, project_id, label, tasks_json, sections_json, dependencies_json, people_json, created_at
            FROM schedule_snapshots
            WHERE project_id = ?1
            ORDER BY datetime(created_at) DESC
            ",
        )
        .map_err(|e| format!("Failed to prepare snapshots query: {e}"))?;

    let rows = statement
        .query_map(params![trimmed_project_id], |row| {
            Ok(ScheduleSnapshotRecord {
                id: row.get(0)?,
                project_id: row.get(1)?,
                label: row.get(2)?,
                tasks_json: row.get(3)?,
                sections_json: row.get(4)?,
                dependencies_json: row.get(5)?,
                people_json: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to list snapshots: {e}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read snapshots: {e}"))
}

#[tauri::command]
fn get_project_snapshot(app: AppHandle, snapshot_id: String) -> Result<ScheduleSnapshotRecord, String> {
    let trimmed_snapshot_id = snapshot_id.trim();
    if trimmed_snapshot_id.is_empty() {
        return Err("Snapshot ID is required".to_string());
    }

    let conn = open_db(&app)?;

    conn.query_row(
        "
        SELECT id, project_id, label, tasks_json, sections_json, dependencies_json, people_json, created_at
        FROM schedule_snapshots
        WHERE id = ?1
        ",
        params![trimmed_snapshot_id],
        |row| {
            Ok(ScheduleSnapshotRecord {
                id: row.get(0)?,
                project_id: row.get(1)?,
                label: row.get(2)?,
                tasks_json: row.get(3)?,
                sections_json: row.get(4)?,
                dependencies_json: row.get(5)?,
                people_json: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| format!("Failed to load snapshot: {e}"))
}

#[tauri::command]
fn delete_project_snapshot(app: AppHandle, snapshot_id: String) -> Result<(), String> {
    let trimmed_snapshot_id = snapshot_id.trim();
    if trimmed_snapshot_id.is_empty() {
        return Err("Snapshot ID is required".to_string());
    }

    let conn = open_db(&app)?;
    let affected = conn
        .execute(
            "
            DELETE FROM schedule_snapshots
            WHERE id = ?1
            ",
            params![trimmed_snapshot_id],
        )
        .map_err(|e| format!("Failed to delete snapshot: {e}"))?;

    if affected == 0 {
        return Err("Snapshot not found".to_string());
    }

    Ok(())
}

#[tauri::command]
fn clear_project_snapshots(app: AppHandle, project_id: String) -> Result<(), String> {
    let trimmed_project_id = project_id.trim();
    if trimmed_project_id.is_empty() {
        return Err("Project ID is required".to_string());
    }

    let conn = open_db(&app)?;
    conn.execute(
        "
        DELETE FROM schedule_snapshots
        WHERE project_id = ?1
        ",
        params![trimmed_project_id],
    )
    .map_err(|e| format!("Failed to clear project snapshots: {e}"))?;

    Ok(())
}
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            init_database,
            open_data_folder,
            list_projects,
            create_project,
            import_project_with_id,
            update_project,
            delete_project,
            get_project_schedule,
            save_project_schedule,
            clear_project_people,
            save_project_snapshot,
            list_project_snapshots,
            get_project_snapshot,
            delete_project_snapshot,
            clear_project_snapshots
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}






