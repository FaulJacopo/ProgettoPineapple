from fastapi import APIRouter

from ..pineapple_client import client

router = APIRouter(prefix="/proxy/dashboard", tags=["dashboard"])


@router.get("/cards")
async def cards():
    return await client.request_json("GET", "/api/dashboard/cards")


@router.get("/news")
async def news():
    return await client.request_json("GET", "/api/dashboard/news")
