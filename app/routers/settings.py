from fastapi import APIRouter, Body

from ..pineapple_client import client

router = APIRouter(prefix="/proxy/settings", tags=["settings"])


@router.put("/users/password")
async def change_password(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/settings/users/password", json=payload)


@router.get("/timezone")
async def get_timezone():
    return await client.request_json("GET", "/api/settings/timezone")


@router.put("/timezone")
async def put_timezone(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/settings/timezone", json=payload)


@router.put("/synctime")
async def synctime(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/settings/synctime", json=payload)


@router.get("/button")
async def get_button():
    return await client.request_json("GET", "/api/settings/button")


@router.put("/button")
async def put_button(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/settings/button", json=payload)


@router.get("/resources")
async def get_resources():
    return await client.request_json("GET", "/api/settings/resources")


@router.get("/usb")
async def get_usb():
    return await client.request_json("GET", "/api/settings/usb")


@router.get("/update/channel")
async def get_update_channel():
    return await client.request_json("GET", "/api/settings/update/channel")


@router.put("/update/channel")
async def put_update_channel(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/settings/update/channel", json=payload)


@router.get("/update/refresh")
async def refresh_update():
    return await client.request_json("GET", "/api/settings/update/refresh")


@router.post("/update/apply")
async def apply_update():
    return await client.request_json("POST", "/api/settings/update/apply")


@router.post("/update/reinstall")
async def reinstall_update():
    return await client.request_json("POST", "/api/settings/update/reinstall")


@router.get("/cloudc2/config")
async def get_cloudc2_config():
    return await client.request_json("GET", "/api/settings/cloudc2/config")


@router.put("/cloudc2/config")
async def put_cloudc2_config(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/settings/cloudc2/config", data=payload)


@router.delete("/cloudc2/config")
async def delete_cloudc2_config():
    return await client.request_json("DELETE", "/api/settings/cloudc2/config")


@router.get("/networking/routes")
async def get_routes():
    return await client.request_json("GET", "/api/settings/networking/routes")


@router.get("/networking/ap/management")
async def get_ap_management():
    return await client.request_json("GET", "/api/settings/networking/ap/management")


@router.put("/networking/ap/management")
async def put_ap_management(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/settings/networking/ap/management", json=payload)


@router.get("/networking/ap/open")
async def get_ap_open():
    return await client.request_json("GET", "/api/settings/networking/ap/open")


@router.put("/networking/ap/open")
async def put_ap_open(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/settings/networking/ap/open", json=payload)


@router.get("/networking/ap/wpa")
async def get_ap_wpa():
    return await client.request_json("GET", "/api/settings/networking/ap/wpa")


@router.put("/networking/ap/wpa")
async def put_ap_wpa(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/settings/networking/ap/wpa", json=payload)


@router.get("/networking/clientmode/status")
async def clientmode_status():
    return await client.request_json("GET", "/api/settings/networking/clientmode/status")


@router.post("/networking/clientmode/scan")
async def clientmode_scan(payload: dict = Body(...)):
    return await client.request_json("POST", "/api/settings/networking/clientmode/scan", json=payload)


@router.post("/networking/clientmode/connect")
async def clientmode_connect(payload: dict = Body(...)):
    return await client.request_json("POST", "/api/settings/networking/clientmode/connect", json=payload)


@router.post("/networking/clientmode/disconnect")
async def clientmode_disconnect():
    return await client.request_json("POST", "/api/settings/networking/clientmode/disconnect")


@router.get("/networking/interfaces")
async def get_interfaces():
    return await client.request_json("GET", "/api/settings/networking/interfaces")


@router.post("/diagnostics/start")
async def start_diagnostics():
    return await client.request_json("POST", "/api/settings/diagnostics/start")


@router.get("/diagnostics/status")
async def diagnostics_status():
    return await client.request_json("GET", "/api/settings/diagnostics/status")
