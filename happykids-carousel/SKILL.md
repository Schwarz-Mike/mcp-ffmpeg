---
name: happykids-carousel
description: >
  Erstellt Instagram Carousel-Posts für @happykids.pro (Mike Schwarz, Kindertherapeut).
  Generiert Post-Vorschläge basierend auf der HappyKids-Website und dem Blog, produziert
  8 Slides im definierten HappyKids-Bildstil (warmes Goldgelb/Creme, Watercolor, Kinder-Illustrationen)
  und veröffentlicht sie via PostSyncer API auf Instagram Account-ID 2871.
  Nutze diesen Skill wenn: Instagram Carousel für HappyKids erstellt, geplant oder gepostet werden soll,
  oder wenn Post-Ideen für @happykids.pro gesucht werden.
---

# HappyKids Carousel Skill

Erstellt vollständige Instagram Carousel-Posts für @happykids.pro – von der Idee bis zum Live-Post.

## Workflow

### Phase 1: Post-Vorschläge generieren

Recherchiere auf **https://happykids.pro/blog/** und analysiere aktuelle Themen. Schlage 3–5 Carousel-Ideen vor, die:
- Ein konkretes Elternproblem ansprechen (emotionaler Hook)
- Zu einem bestehenden Blogbeitrag passen (Traffic → Blog)
- Zur Zielgruppe passen: Eltern von Kindern mit Ängsten, Schulproblemen, Verhaltensauffälligkeiten

**Bewährte Themenfelder:**
- Schulverweigerung / Schulangst / Schulabsentismus
- Ängste bei Kindern (Nacht, Trennung, Erbrechen, Versagen)
- ADHS / ADS / Konzentration / Lernschwäche
- Selbstwert & Selbstliebe bei Kindern
- Schlafprobleme / Bettnässen
- Eltern-Kind-Beziehung / Erziehungstipps
- Hypnose & NLP für Kinder (Aufklärung)
- Das Buch "Wie Kinder fliegen lernen" / HappyKids-Konzept

Für jeden Vorschlag angeben: Titel, Hook-Satz, Ziel-Blogbeitrag, warum dieses Thema jetzt passt.

### Phase 2: Carousel-Struktur (8 Slides)

Jeder Carousel folgt dieser bewährten Struktur:

| Slide | Typ | Inhalt |
|-------|-----|--------|
| 1 | Cover | Emotionaler Hook-Satz (Zitat oder Frage), Haupttitel |
| 2 | Problem | Das Problem konkret benennen – Eltern abholen |
| 3 | Daten/Fakt | Überraschende Zahl oder Aussage (Glaubwürdigkeit) |
| 4 | Ursachen | 4 Ursachen als Icon-Grid |
| 5 | Körper/Mechanismus | Erklärung: Was passiert im Kind? |
| 6 | Warnsignale | 5 Zeichen als Liste |
| 7 | Empathie | Emotionale Brücke: "Du bist nicht allein" |
| 8 | CTA | Blog-Link / Buch / Termin buchen |

### Phase 3: Bilder generieren

Generiere alle 8 Slides mit dem `generate` Tool. **Exakter Style-Prompt-Kern** (IMMER verwenden):

> **WICHTIG – Deutsche Umlaute im Prompt:** Das Image-Generierungs-Modell rendert deutsche Umlaute (ä, ö, ü, Ä, Ö, Ü) häufig nicht korrekt und ersetzt sie durch ae/oe/ue. Um korrekte Darstellung zu erzwingen, müssen alle deutschen Texte im Prompt **explizit mit korrekten Unicode-Umlauten** übergeben werden UND zusätzlich die Anweisung `render all German text exactly as written, preserve all umlauts (ä ö ü Ä Ö Ü), do NOT replace with ae/oe/ue` in jeden Prompt aufnehmen.

```
Instagram carousel slide, warm HappyKids brand style.
Soft golden-yellow and warm cream watercolor background with gentle texture.
[Slide-spezifische Illustration in watercolor style].
[Deutscher Text als Bold dark brown serif font].
Render all German text exactly as written, preserve all umlauts (ä ö ü Ä Ö Ü), do NOT replace with ae/oe/ue.
Small 'happykids.pro' text bottom left. Arrow → bottom right.
Clean, professional, warm and empathetic. Aspect ratio 4:5.
```

**Style-Referenz:** Verwende immer `/home/ubuntu/skills/happykids-carousel/templates/style_references/slide_cover_reference.jpg` als `references`-Parameter im ersten Slide-Prompt, damit alle Slides konsistent bleiben.

**Farbpalette:**
- Hintergrund: Warmes Goldgelb (#F5E6C0) bis Creme (#FDF8EE), Watercolor-Textur
- Textfarbe: Dunkelbraun (#3D2B1F), Serif-Font (bold für Headlines)
- Akzent: Amber/Gold (#C8922A) für Zahlen, Buttons, Highlights
- Dekoration: Kleine goldene Sterne, beige Blätter/Zweige

**Illustration-Stil:** Watercolor, semi-realistisch, warme Erdtöne, Kinder und Eltern als Hauptmotive

**Slide-Typen und passende Illustrationen:**
- Cover: Kind mit Schulrucksack, nachdenklich sitzend
- Problem: Mutter/Vater kniet neben Kind, Kind hält Bauch
- Daten/Fakt: Grosse Zahl in Gold, Kind-Silhouette
- Ursachen: 4-Icon-Grid (Abschlusskappe, Kinder-Konflikt, Riss-Symbol, gebrochenes Herz)
- Körper/Mechanismus: Kind-Silhouette mit leuchtendem Herz/Bauch
- Warnsignale: Saubere Liste mit goldenen Bullet-Points
- Empathie: Elternteil hält Kind an der Hand, gemeinsam gehend
- CTA: Buchcover "Wie Kinder fliegen lernen" + "Link in der Bio!"

### Phase 4: Bilder hochladen

```bash
manus-upload-file /path/to/slide_01.jpg /path/to/slide_02.jpg ... /path/to/slide_08.jpg
```

Alle 8 CDN-URLs notieren.

### Phase 5: Via PostSyncer posten

```python
import os, requests

API_TOKEN = os.environ["POSTSYNCER_API_TOKEN"]
BASE_URL = "https://postsyncer.com/api/v1"
headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

payload = {
    "workspace_id": 2446,
    "content": [{
        "text": "<CAPTION>",
        "media": ["<URL_1>", "<URL_2>", ..., "<URL_8>"]
    }],
    "schedule_type": "publish_now",   # oder "schedule"
    "accounts": [{"id": 2871}]        # Instagram @happykids.pro
}

# Für geplante Posts zusätzlich:
# "schedule_type": "schedule",
# "schedule_for": {"date": "YYYY-MM-DD", "time": "HH:MM", "timezone": "Europe/Zurich"}

r = requests.post(f"{BASE_URL}/posts", headers=headers, json=payload, timeout=30)
print(r.status_code, r.json().get("id"))
```

**Account-ID:** `2871` = Instagram @happykids.pro  
**Workspace-ID:** `2446` = MIKE

### Caption-Vorlage

```
[Emotionaler Einstiegssatz mit Emoji] 💛

[2–3 Sätze: Problem benennen, Eltern abholen]

[1–2 Sätze: Lösung/Hoffnung andeuten]

👉 Wische durch den Beitrag für [Nutzenversprechen].
👉 [Bloglink-Hinweis oder Buchhinweis] (Link in der Bio)

Du bist nicht allein. Wir begleiten dich und dein Kind. 💛

#Kindertherapie #HappyKids #[ThemenHashtag] #Elternsein #Familienleben #MentalHealthKids #Hypnosetherapie #MikeSchwarz
```

## Wichtige Hinweise

- Instagram @happykids.pro (ID 2871) **benötigt immer Bilder** – reine Text-Posts werden abgelehnt
- Bilder müssen **öffentlich zugänglich** sein → immer erst `manus-upload-file` verwenden
- Maximale Carousel-Grösse: **10 Bilder**
- Optimale Posting-Zeiten (Europe/Zurich): **09:00** oder **19:00** Uhr
- Tonalität: **Du-Form**, warm, empathisch, nie belehrend, Eltern auf Augenhöhe
- Schweizer Rechtschreibung (kein ß, stattdessen ss)

## Referenzen

- Brand-Profil, Zielgruppe & Themenpool: `references/brand_profile.md`
- Vollständige PostSyncer API-Dokumentation: `references/postsyncer_api.md`
