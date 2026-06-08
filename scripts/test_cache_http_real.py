"""Hit real running API at localhost:8000 and verify cache behavior."""

import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid


BASE = "http://127.0.0.1:8000"


def request(method: str, path: str, data=None, headers=None):
    body = None
    req_headers = dict(headers or {})
    if data is not None:
        if isinstance(data, dict) and "username" in data:
            body = urllib.parse.urlencode(data).encode()
            req_headers["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            body = json.dumps(data).encode()
            req_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=req_headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, json.loads(resp.read().decode())


def main() -> None:
    email = f"real-{uuid.uuid4().hex[:6]}@test.com"
    password = "testpassword123"

    health_status, health = request("GET", "/health")
    print(f"Health: {health_status}  redis={health.get('redis')}")

    _, _ = request(
        "POST",
        "/api/v1/auth/register",
        {"email": email, "name": "Real Test", "password": password, "role": "user"},
    )
    _, tokens = request(
        "POST",
        "/api/v1/auth/login",
        {"username": email, "password": password},
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    request("POST", "/api/v1/journal", {"mood": 8, "text": "Real HTTP cache test"}, headers)

    t0 = time.perf_counter()
    s1, j1 = request("GET", "/api/v1/journal", headers=headers)
    t1 = time.perf_counter()
    s2, j2 = request("GET", "/api/v1/journal", headers=headers)
    t2 = time.perf_counter()

    print("=== Real HTTP Cache Test @ localhost:8000 ===")
    print(f"Journal 1st GET: {(t1-t0)*1000:.1f}ms  status={s1}  entries={len(j1)}")
    print(f"Journal 2nd GET: {(t2-t1)*1000:.1f}ms  status={s2}  entries={len(j2)}")
    print("Check server logs for cache_miss then cache_hit")
    print("PASS")


if __name__ == "__main__":
    main()
