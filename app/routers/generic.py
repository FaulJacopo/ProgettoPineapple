from fastapi import APIRouter, Body

from ..pineapple_client import client

router = APIRouter(prefix="/proxy", tags=["generic"])


@router.post("/reboot")
async def reboot():
    return await client.request_json("POST", "/api/reboot")


@router.post("/shutdown")
async def shutdown():
    return await client.request_json("POST", "/api/shutdown")


@router.get("/status")
async def status():
    return await client.request_json("GET", "/api/status")


@router.get("/device")
async def device():
    return await client.request_json("GET", "/api/device")


@router.post("/download")
async def download(payload: dict = Body(...)):
    return await client.request_stream("POST", "/api/download", json=payload)


@router.get("/helpers/lookupOUI/{oui}")
async def lookup_oui(oui: str):
    return await client.request_json("GET", f"/api/helpers/lookupOUI/{oui}")


@router.get("/helpers/checkonline")
async def check_online():
    return await client.request_json("GET", "/api/helpers/checkonline")
