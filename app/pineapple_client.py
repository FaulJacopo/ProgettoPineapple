from __future__ import annotations

import httpx
from fastapi import HTTPException
from fastapi.responses import Response

from .config import settings


class PineappleClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.base_url,
            verify=settings.verify_ssl,
            timeout=60.0,
        )
        self._token = settings.token

    async def aclose(self) -> None:
        await self._client.aclose()

    async def login(self) -> str:
        if not settings.password:
            raise HTTPException(
                status_code=400,
                detail={"error": "PINEAPPLE_PASSWORD non configurata: impossibile effettuare il login"},
            )
        resp = await self._client.post(
            "/api/login",
            json={"username": settings.username, "password": settings.password},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=self._error_body(resp))
        token = resp.json().get("token")
        if not token:
            raise HTTPException(status_code=502, detail={"error": "Login riuscito ma nessun token restituito dal device"})
        self._token = token
        settings.save_token(token)
        return token

    @staticmethod
    def _error_body(resp: httpx.Response) -> dict:
        try:
            data = resp.json()
            if isinstance(data, dict) and "error" in data:
                return data
        except ValueError:
            pass
        return {"error": resp.text or f"HTTP {resp.status_code}"}

    async def request(self, method: str, path: str, retry: bool = True, **kwargs) -> httpx.Response:
        if not self._token:
            await self.login()

        headers = kwargs.pop("headers", {}) or {}
        headers["Authorization"] = f"Bearer {self._token}"

        try:
            resp = await self._client.request(method, path, headers=headers, **kwargs)
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail={"error": f"Impossibile contattare il WiFi Pineapple ({exc})"},
            ) from exc

        if resp.status_code == 401 and retry:
            await self.login()
            return await self.request(method, path, retry=False, **kwargs)

        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=self._error_body(resp))

        return resp

    async def request_json(self, method: str, path: str, **kwargs):
        resp = await self.request(method, path, **kwargs)
        if not resp.content:
            return {}
        try:
            return resp.json()
        except ValueError:
            return {"raw": resp.text}

    async def request_stream(self, method: str, path: str, **kwargs) -> Response:
        resp = await self.request(method, path, **kwargs)
        return Response(
            content=resp.content,
            media_type=resp.headers.get("content-type", "application/octet-stream"),
        )


client = PineappleClient()
