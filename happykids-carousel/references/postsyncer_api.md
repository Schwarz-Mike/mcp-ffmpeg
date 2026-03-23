# PostSyncer API – Kurzreferenz für HappyKids

## Auth & Base URL

```
Base URL: https://postsyncer.com/api/v1
Token:    os.environ["POSTSYNCER_API_TOKEN"]  # Manus Secret: POSTSYNCER_API_TOKEN
Header:   Authorization: Bearer <TOKEN>
```

## MIKE Workspace – Relevante Accounts

| ID   | Platform  | Account                        |
|------|-----------|--------------------------------|
| 2871 | instagram | @happykids.pro (Haupt-Account) |
| 5861 | instagram | @mikeschwarzcoaching           |
| 2869 | facebook  | HappyKids Facebook Page        |
| 2872 | tiktok    | @mikeschwarzcoaching           |
| 2870 | youtube   | Mike Schwarz Hypnose           |
| 2874 | linkedin  | AZGB                           |
| 2873 | twitter   | @HypnosePro                    |
| 2917 | telegram  | HappyKids Community            |

**Workspace-ID:** 2446

## Sofort posten (Carousel)

```python
import os, requests
API_TOKEN = os.environ["POSTSYNCER_API_TOKEN"]
BASE_URL = "https://postsyncer.com/api/v1"
headers = {"Authorization": f"Bearer {API_TOKEN}", "Content-Type": "application/json", "Accept": "application/json"}

payload = {
    "workspace_id": 2446,
    "content": [{"text": "Caption", "media": ["url1", "url2", ...]}],
    "schedule_type": "publish_now",
    "accounts": [{"id": 2871}]
}
r = requests.post(f"{BASE_URL}/posts", headers=headers, json=payload)
# Erfolg: HTTP 201, r.json()["id"] = Post-ID
```

## Geplant posten

```python
import os, requests
API_TOKEN = os.environ["POSTSYNCER_API_TOKEN"]
BASE_URL = "https://postsyncer.com/api/v1"
headers = {"Authorization": f"Bearer {API_TOKEN}", "Content-Type": "application/json", "Accept": "application/json"}

payload = {
    "workspace_id": 2446,
    "content": [{"text": "Caption", "media": ["url1", ...]}],
    "schedule_type": "schedule",
    "schedule_for": {"date": "2026-04-15", "time": "09:00", "timezone": "Europe/Zurich"},
    "accounts": [{"id": 2871}]
}
```

## Posts auflisten

```python
r = requests.get(f"{BASE_URL}/posts", headers=headers, params={"workspace_id": 2446, "per_page": 10})
posts = r.json().get("data", [])
```

## Post löschen

```python
r = requests.delete(f"{BASE_URL}/posts/{post_id}", headers=headers)
```

## Fehlermeldungen

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| 422 "Instagram requires media" | Kein Bild übergeben | Immer `media`-Array befüllen |
| 422 "Unprocessable Entity" | Ungültige URL | Bild zuerst via `manus-upload-file` hochladen |
| 401 Unauthorized | Token abgelaufen | Token erneuern |
