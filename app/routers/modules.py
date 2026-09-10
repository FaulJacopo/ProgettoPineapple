from fastapi import APIRouter, Body

from ..pineapple_client import client

router = APIRouter(prefix="/proxy/modules", tags=["modules"])


@router.post("/request")
async def module_request(payload: dict = Body(...)):
    return await client.request_json("POST", "/api/module/request", json=payload)


@router.get("")
async def list_modules():
    return await client.request_json("GET", "/api/modules")


@router.put("/create")
async def create_module(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/modules/create", json=payload)


@router.put("/install")
async def install_module(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/modules/install", json=payload)


@router.put("/sideload/tar")
async def sideload_module(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/modules/sideload/tar", json=payload)


@router.get("/available")
async def available_modules():
    return await client.request_json("GET", "/api/modules/available")


@router.delete("/{module_name}")
async def remove_module(module_name: str):
    return await client.request_json("DELETE", f"/api/modules/{module_name}")


@router.post("/favourite/{module_name}")
async def favourite_module(module_name: str):
    return await client.request_json("POST", f"/api/modules/favourite/{module_name}")
