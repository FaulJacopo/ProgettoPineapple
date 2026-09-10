from fastapi import APIRouter, Body

from ..pineapple_client import client

router = APIRouter(prefix="/proxy/pineap", tags=["pineap"])


@router.get("/settings")
async def get_settings():
    return await client.request_json("GET", "/api/pineap/settings")


@router.put("/settings")
async def put_settings(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/pineap/settings", json=payload)


@router.get("/ssids")
async def get_ssids():
    return await client.request_json("GET", "/api/pineap/ssids")


@router.delete("/ssids")
async def clear_ssids():
    return await client.request_json("DELETE", "/api/pineap/ssids")


@router.put("/ssids/ssid")
async def add_ssid(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/pineap/ssids/ssid", json=payload)


@router.delete("/ssids/ssid")
async def remove_ssid(payload: dict = Body(...)):
    return await client.request_json("DELETE", "/api/pineap/ssids/ssid", json=payload)


@router.get("/handshakes")
async def list_handshakes():
    return await client.request_json("GET", "/api/pineap/handshakes")


@router.delete("/handshakes")
async def clear_handshakes():
    return await client.request_json("DELETE", "/api/pineap/handshakes")


@router.post("/handshakes/start")
async def start_handshake_capture(payload: dict = Body(...)):
    return await client.request_json("POST", "/api/pineap/handshakes/start", json=payload)


@router.post("/handshakes/stop")
async def stop_handshake_capture():
    return await client.request_json("POST", "/api/pineap/handshakes/stop")


@router.get("/handshakes/check")
async def check_handshake_capture():
    return await client.request_json("GET", "/api/pineap/handshakes/check")


@router.delete("/handshakes/delete")
async def delete_handshake(payload: dict = Body(...)):
    return await client.request_json("DELETE", "/api/pineap/handshakes/delete", json=payload)


@router.get("/enterprise/settings")
async def get_enterprise_settings():
    return await client.request_json("GET", "/api/pineap/enterprise/settings")


@router.put("/enterprise/settings")
async def put_enterprise_settings(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/pineap/enterprise/settings", json=payload)


@router.get("/enterprise/cert")
async def get_enterprise_cert():
    return await client.request_json("GET", "/api/pineap/enterprise/cert")


@router.delete("/enterprise/cert")
async def delete_enterprise_cert():
    return await client.request_json("DELETE", "/api/pineap/enterprise/cert")


@router.post("/enterprise/generatecert")
async def generate_enterprise_cert(payload: dict = Body(...)):
    return await client.request_json("POST", "/api/pineap/enterprise/generatecert", json=payload)


@router.get("/enterprise/basicdata")
async def get_basic_data():
    return await client.request_json("GET", "/api/pineap/enterprise/basicdata")


@router.delete("/enterprise/basicdata")
async def clear_basic_data():
    return await client.request_json("DELETE", "/api/pineap/enterprise/basicdata")


@router.get("/enterprise/challengedata")
async def get_challenge_data():
    return await client.request_json("GET", "/api/pineap/enterprise/challengedata")


@router.delete("/enterprise/challengedata")
async def clear_challenge_data():
    return await client.request_json("DELETE", "/api/pineap/enterprise/challengedata")


@router.get("/clients")
async def get_clients():
    return await client.request_json("GET", "/api/pineap/clients")


@router.get("/clients/count")
async def get_clients_count():
    return await client.request_json("GET", "/api/pineap/clients/count")


@router.delete("/clients/kick")
async def kick_client(payload: dict = Body(...)):
    return await client.request_json("DELETE", "/api/pineap/clients/kick", json=payload)


@router.get("/previousclients")
async def get_previous_clients():
    return await client.request_json("GET", "/api/pineap/previousclients")


@router.delete("/previousclients/remove")
async def remove_previous_client(payload: dict = Body(...)):
    return await client.request_json("DELETE", "/api/pineap/previousclients/remove", json=payload)


@router.get("/logging")
async def get_logging():
    return await client.request_json("GET", "/api/pineap/logging")


@router.get("/filters/client/mode")
async def get_client_filter_mode():
    return await client.request_json("GET", "/api/pineap/filters/client/mode")


@router.put("/filters/client/mode")
async def put_client_filter_mode(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/pineap/filters/client/mode", json=payload)


@router.get("/filters/client/list")
async def get_client_filter_list():
    return await client.request_json("GET", "/api/pineap/filters/client/list")


@router.put("/filters/client/list")
async def add_client_filter(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/pineap/filters/client/list", json=payload)


@router.delete("/filters/client/list")
async def remove_client_filter(payload: dict = Body(...)):
    return await client.request_json("DELETE", "/api/pineap/filters/client/list", json=payload)


@router.get("/filters/ssid/mode")
async def get_ssid_filter_mode():
    return await client.request_json("GET", "/api/pineap/filters/ssid/mode")


@router.put("/filters/ssid/mode")
async def put_ssid_filter_mode(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/pineap/filters/ssid/mode", json=payload)


@router.get("/filters/ssid/list")
async def get_ssid_filter_list():
    return await client.request_json("GET", "/api/pineap/filters/ssid/list")


@router.put("/filters/ssid/list")
async def add_ssid_filter(payload: dict = Body(...)):
    return await client.request_json("PUT", "/api/pineap/filters/ssid/list", json=payload)


@router.delete("/filters/ssid/list")
async def remove_ssid_filter(payload: dict = Body(...)):
    return await client.request_json("DELETE", "/api/pineap/filters/ssid/list", json=payload)


@router.post("/deauth/ap")
async def deauth_ap(payload: dict = Body(...)):
    return await client.request_json("POST", "/api/pineap/deauth/ap", json=payload)


@router.post("/deauth/client")
async def deauth_client(payload: dict = Body(...)):
    return await client.request_json("POST", "/api/pineap/deauth/client", json=payload)
