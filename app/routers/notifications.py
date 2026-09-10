from fastapi import APIRouter, Body

from ..pineapple_client import client

router = APIRouter(prefix="/proxy/notifications", tags=["notifications"])


@router.get("")
async def list_notifications():
    return await client.request_json("GET", "/api/notifications")


@router.put("")
async def create_notification(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/notifications", json=payload)


@router.delete("")
async def delete_all_notifications():
    return await client.request_json("DELETE", "/api/notifications")


@router.put("/read")
async def mark_all_read():
    return await client.request_json("PUT", "/api/notifications/read")


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str):
    return await client.request_json("DELETE", f"/api/notifications/{notification_id}")


@router.put("/{notification_id}/read")
async def mark_read(notification_id: str):
    return await client.request_json("PUT", f"/api/notifications/{notification_id}/read")


@router.put("/{notification_id}/displayed")
async def mark_displayed(notification_id: str):
    return await client.request_json("PUT", f"/api/notifications/{notification_id}/displayed")
