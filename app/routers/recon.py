import csv
import io
import json

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import Response

from ..pineapple_client import client

router = APIRouter(prefix="/proxy/recon", tags=["recon"])


@router.post("/start")
async def start(payload: dict = Body(...)):
    return await client.request_json("POST", "/api/recon/start", json=payload)


@router.post("/stop")
async def stop():
    return await client.request_json("POST", "/api/recon/stop")


@router.get("/status")
async def status():
    return await client.request_json("GET", "/api/recon/status")


@router.get("/scans")
async def list_scans():
    return await client.request_json("GET", "/api/recon/scans")


@router.get("/scans/{scan_id}")
async def get_scan(scan_id: str):
    return await client.request_json("GET", f"/api/recon/scans/{scan_id}")


@router.delete("/scans/{scan_id}")
async def delete_scan(scan_id: str):
    return await client.request_json("DELETE", f"/api/recon/scans/{scan_id}")


@router.post("/scans/{scan_id}/download/json")
async def download_scan(scan_id: str):
    return await client.request_stream("POST", f"/api/recon/scans/{scan_id}/download/json")

# Download multiple scans, merge duplicate APs and return one CSV file.
@router.post("/scans/download/merged/csv")
@router.post("/scans/download/merged")
async def download_merged_scans(payload: dict | list = Body(...)):
    scan_ids = payload.get("scan_ids") if isinstance(payload, dict) else payload
    if not isinstance(scan_ids, list):
        raise HTTPException(status_code=400, detail={"error": "scan_ids deve essere una lista"})

    unique_scan_ids = list(dict.fromkeys(str(scan_id) for scan_id in scan_ids))
    if len(unique_scan_ids) < 2:
        raise HTTPException(status_code=400, detail={"error": "Seleziona almeno due scansioni"})

    merged_aps = {}

    for scan_id in unique_scan_ids:
        response = await client.request_json("GET", f"/api/recon/scans/{scan_id}")
        for ap in (response if isinstance(response, dict) else {}).get("APResults") or []:
            if not isinstance(ap, dict):
                continue
            bssid = str(ap.get("bssid") or "").strip()
            if not bssid:
                continue
            key = bssid.lower()
            merged = merged_aps.setdefault(
                key,
                {
                    "scan_ids": [],
                    "clients": {},
                    "ap": dict(ap),
                },
            )
            if scan_id not in merged["scan_ids"]:
                merged["scan_ids"].append(scan_id)

            current = merged["ap"]
            current["first_seen"] = _min_seen(current.get("first_seen"), ap.get("first_seen"))
            current["last_seen"] = _max_seen(current.get("last_seen"), ap.get("last_seen"))
            if _numeric(ap.get("signal")) > _numeric(current.get("signal")):
                current["signal"] = ap.get("signal")
            for client_record in ap.get("clients") or []:
                if isinstance(client_record, str):
                    client_mac = client_record.strip()
                elif isinstance(client_record, dict):
                    client_mac = str(client_record.get("client_mac") or client_record.get("mac") or "").strip()
                else:
                    continue
                if client_mac:
                    merged["clients"][client_mac.lower()] = client_record

    fields = [
        "scan_ids", "ssid", "bssid", "encryption", "hidden", "wps", "channel",
        "signal", "data", "first_seen", "last_seen", "last_seen_delta", "probes",
        "mfp", "num_clients", "client_macs", "clients",
    ]
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for merged in merged_aps.values():
        ap = merged["ap"]
        clients = list(merged["clients"].values())
        writer.writerow({
            **{field: ap.get(field, "") for field in fields},
            "scan_ids": ";".join(merged["scan_ids"]),
            "num_clients": len(clients),
            "client_macs": ";".join(str(client.get("client_mac") or client.get("mac") or client)
                                     if isinstance(client, dict) else str(client)
                                     for client in clients),
            "clients": json.dumps(clients, ensure_ascii=False, separators=(",", ":")),
        })

    return Response(
        content=output.getvalue().encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="recon-scans-merged.csv"'},
    )


def _numeric(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float("-inf")


def _min_seen(current, candidate):
    if current in (None, 0, "", False):
        return candidate or current or ""
    if candidate in (None, 0, "", False):
        return current
    return min(current, candidate)


def _max_seen(current, candidate):
    if candidate in (None, 0, "", False):
        return current or ""
    if current in (None, 0, "", False):
        return candidate
    return max(current, candidate)
