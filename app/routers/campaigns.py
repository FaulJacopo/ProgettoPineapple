from fastapi import APIRouter, Body

from ..pineapple_client import client

router = APIRouter(prefix="/proxy/campaigns", tags=["campaigns"])


@router.get("")
async def list_campaigns():
    return await client.request_json("GET", "/api/campaigns")


@router.get("/reports")
async def list_reports():
    return await client.request_json("GET", "/api/campaigns/reports")


@router.delete("/reports/{name}")
async def delete_report(name: str):
    return await client.request_json("DELETE", f"/api/campaigns/reports/{name}")


@router.put("/create")
async def create_campaign(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/campaigns/create", json=payload)


@router.get("/{name}")
async def get_campaign(name: str):
    return await client.request_json("GET", f"/api/campaigns/{name}")


@router.put("/{name}")
async def update_campaign(name: str, payload: dict = Body(...)):
    return await client.request_json("PUT", f"/api/campaigns/{name}", json=payload)


@router.delete("/{name}")
async def delete_campaign(name: str):
    return await client.request_json("DELETE", f"/api/campaigns/{name}")


@router.put("/{name}/enable")
async def enable_campaign(name: str):
    return await client.request_json("PUT", f"/api/campaigns/{name}/enable")


@router.delete("/{name}/disable")
async def disable_campaign(name: str):
    return await client.request_json("DELETE", f"/api/campaigns/{name}/disable")
