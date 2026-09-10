from fastapi import APIRouter

from ..pineapple_client import client

router = APIRouter(prefix="/proxy", tags=["auth"])


@router.post("/login")
async def login():
    token = await client.login()
    return {"success": True, "token": token}


@router.get("/auth/status")
async def status():
    return {"authenticated": client._token is not None}
