# ramhacks

ramhacks 2026 project MedsUP!

MedsUP is a Gemini-powered medication tracking app, designed to help people who struggle to keep up with their medications or suffer memory issues.

medsup aims to help assist these groups in retaining autonomy in their daily life, allowing them to both have control over their life and relieve the duties of caregivers, and provide clear warnings to people on prescription drugs, alerting them of possible medication conflictions or duplicates

# prerequisites

- Python 3.10+
- Node.js 18+
- a [Google Gemini API key](https://aistudio.google.com/app/apikey)

## installation instructions

### 1. clone the repository

```bash
git clone <https://github.com/bapboi/ramhacks.git>
cd ramhacks
```

### 2. configure api key

create or rename appsettingsexample.json to appsettings.json, and edit the structure as so:

```json
{
  "Gemini": {
    "ApiKey": "YOUR_GEMINI_API_KEY_HERE"
  }
}
```

### 3. install dependencies

create a venv,

```bash
python3 -m venv venv
source venv/bin/activate
```

```bash
pip install -r requirements.txt
```

```bash
cd frontend
npm install
cd ..
```

### 4. create an ssl certificate

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

```

and hit enter for all categories, all thats needed is an insecure ssl cert.

## running the app

to run the app, the backend and frontend must be started together

from your terminal, either:
osx/linux

```bash
./start.sh
```

or host both separately,
osx/linux

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

and then,

```bash
cd frontend
npx vite
```

then open the url provided by vite: (e.g. `https://localhost:5173`)
this will look insecure, as the ssl certificate is self signed.

## accessing from a phone

the two devices must be on the same network, and you must connect to the network url printed by vite (e.g. https:192.168.x.x:5173).
