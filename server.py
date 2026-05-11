#!/usr/bin/env python3
"""Local server + SQLite database for SPEC promo materials.

Run with: python3 server.py
Then open: http://127.0.0.1:4173
"""
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import sqlite3
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "spec_promo_materials.sqlite3"
MAX_BODY_BYTES = 80 * 1024 * 1024


def connect_db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS app_state (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS rules_documents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            mime_type TEXT NOT NULL DEFAULT '',
            size INTEGER NOT NULL DEFAULT 0,
            last_modified INTEGER NOT NULL,
            text TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL DEFAULT 0,
            blob BLOB NOT NULL,
            updated_at INTEGER NOT NULL
        )
        """
    )
    conn.commit()
    return conn


def now_ms() -> int:
    return int(time.time() * 1000)


class PromoRequestHandler(SimpleHTTPRequestHandler):
    server_version = "SpecPromoMaterials/1.0"

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:  # noqa: N802 - stdlib method name
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            self.handle_api_get(path)
            return
        if path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802 - stdlib method name
        self.handle_write_request()

    def do_PUT(self) -> None:  # noqa: N802 - stdlib method name
        self.handle_write_request()

    def do_OPTIONS(self) -> None:  # noqa: N802 - stdlib method name
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def translate_path(self, path: str) -> str:
        parsed = urlparse(path).path
        parsed = unquote(parsed)
        if parsed == "/":
            parsed = "/index.html"
        return str(ROOT / parsed.lstrip("/"))

    def read_json_body(self) -> dict[str, Any]:
        raw_length = self.headers.get("Content-Length") or "0"
        try:
            length = int(raw_length)
        except ValueError as exc:
            raise ValueError("Invalid Content-Length") from exc
        if length > MAX_BODY_BYTES:
            raise ValueError("Request body is too large")
        body = self.rfile.read(length) if length else b"{}"
        if not body:
            return {}
        try:
            parsed = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError("Invalid JSON body") from exc
        if not isinstance(parsed, dict):
            raise ValueError("JSON body must be an object")
        return parsed

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def send_error_json(self, status: int, message: str) -> None:
        self.send_json(status, {"ok": False, "error": message})

    def handle_api_get(self, path: str) -> None:
        try:
            if path == "/api/health":
                self.send_json(200, {"ok": True, "database": str(DB_PATH), "updatedAt": now_ms()})
                return
            if path == "/api/state/size-language":
                self.get_size_language_state()
                return
            if path == "/api/rules-documents":
                self.get_rules_documents()
                return
            self.send_error_json(404, "API endpoint not found")
        except Exception as exc:  # noqa: BLE001 - keep local server resilient
            self.send_error_json(500, str(exc))

    def handle_write_request(self) -> None:
        path = urlparse(self.path).path
        if not path.startswith("/api/"):
            self.send_error_json(404, "API endpoint not found")
            return
        try:
            if path == "/api/state/size-language":
                self.put_size_language_state()
                return
            if path == "/api/rules-documents":
                self.put_rules_documents()
                return
            self.send_error_json(404, "API endpoint not found")
        except ValueError as exc:
            self.send_error_json(400, str(exc))
        except Exception as exc:  # noqa: BLE001 - keep local server resilient
            self.send_error_json(500, str(exc))

    def get_size_language_state(self) -> None:
        with connect_db() as conn:
            row = conn.execute(
                "SELECT value_json, updated_at FROM app_state WHERE key = ?",
                ("size-language",),
            ).fetchone()
        if not row:
            self.send_json(200, {"ok": True, "data": None, "updatedAt": 0})
            return
        self.send_json(200, {"ok": True, "data": json.loads(row["value_json"]), "updatedAt": row["updated_at"]})

    def put_size_language_state(self) -> None:
        payload = self.read_json_body()
        data = payload.get("data", payload)
        if not isinstance(data, dict):
            raise ValueError("Size/language payload must be an object")
        updated_at = int(data.get("updatedAt") or payload.get("updatedAt") or now_ms())
        with connect_db() as conn:
            conn.execute(
                """
                INSERT INTO app_state (key, value_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value_json = excluded.value_json,
                    updated_at = excluded.updated_at
                """,
                ("size-language", json.dumps(data, ensure_ascii=False), updated_at),
            )
            conn.commit()
        self.send_json(200, {"ok": True, "updatedAt": updated_at})

    def get_rules_documents(self) -> None:
        with connect_db() as conn:
            rows = conn.execute(
                """
                SELECT id, name, mime_type, size, last_modified, text, sort_order, blob, updated_at
                FROM rules_documents
                ORDER BY sort_order ASC, updated_at ASC
                """
            ).fetchall()
        documents = []
        for row in rows:
            documents.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "type": row["mime_type"],
                    "size": row["size"],
                    "lastModified": row["last_modified"],
                    "text": row["text"],
                    "order": row["sort_order"],
                    "dataBase64": base64.b64encode(row["blob"]).decode("ascii"),
                    "updatedAt": row["updated_at"],
                }
            )
        self.send_json(200, {"ok": True, "documents": documents, "updatedAt": now_ms()})

    def put_rules_documents(self) -> None:
        payload = self.read_json_body()
        documents = payload.get("documents")
        if not isinstance(documents, list):
            raise ValueError("Rules documents payload must include a documents array")
        updated_at = now_ms()
        with connect_db() as conn:
            conn.execute("DELETE FROM rules_documents")
            for order, doc in enumerate(documents):
                if not isinstance(doc, dict):
                    continue
                doc_id = str(doc.get("id") or f"rules-{updated_at}-{order}")
                name = str(doc.get("name") or "生成规则文档")
                mime_type = str(doc.get("type") or mimetypes.guess_type(name)[0] or "")
                data_base64 = str(doc.get("dataBase64") or "")
                try:
                    blob = base64.b64decode(data_base64, validate=True) if data_base64 else b""
                except Exception as exc:  # noqa: BLE001
                    raise ValueError(f"Invalid base64 data for {name}") from exc
                size = int(doc.get("size") or len(blob))
                last_modified = int(doc.get("lastModified") or updated_at)
                text = str(doc.get("text") or "")
                conn.execute(
                    """
                    INSERT INTO rules_documents
                        (id, name, mime_type, size, last_modified, text, sort_order, blob, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (doc_id, name, mime_type, size, last_modified, text, order, blob, updated_at),
                )
            conn.commit()
        self.send_json(200, {"ok": True, "updatedAt": updated_at, "count": len(documents)})


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve SPEC promo materials with a local SQLite database.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "4173")))
    args = parser.parse_args()
    connect_db().close()
    server = ThreadingHTTPServer((args.host, args.port), PromoRequestHandler)
    print(f"Serving spec-promo-materials at http://{args.host}:{args.port}")
    print(f"SQLite database: {DB_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
