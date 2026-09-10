from fastapi import APIRouter, Body

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
