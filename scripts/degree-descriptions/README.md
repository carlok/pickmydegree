# Degree descriptions pipeline (search + LLM)

Generates longer, more real-world descriptions for each degree in `degrees.json` using search snippets (e.g. PoliTo/UniTo) and an LLM, then merges results into an updated copy of the file.

## Files in this folder

| File | Description |
|------|-------------|
| `requirements.txt` | Dependencies: httpx, python-dotenv, openai, google-genai (Gemini; not the deprecated google-generativeai) |
| `.env.example` | Template for `SERPER_API_KEY` and `GEMINI_API_KEY` (or `OPENAI_API_KEY`) |
| `config.py` | Loads env; sets `DEGREES_JSON`, `OUTPUT_DIR`, API keys, model names, throttle |
| `search.py` | Serper API: queries by degree name + `site:polito.it OR site:unito.it`, returns snippet list |
| `prompts.py` | System/user prompt templates for Italian description and English translation |
| `llm.py` | Single `complete(system, user)`; uses OpenAI if `OPENAI_API_KEY` set, else Gemini |
| `pipeline.py` | Loads degrees → for each: snippets → LLM IT → LLM EN → writes `output/<id>.json` |
| `merge.py` | Reads all `output/<id>.json` + original `degrees.json` → writes `degrees.updated.json` |
| `Dockerfile` | Python 3.12-slim image; installs deps only (no COPY of scripts, no ENTRYPOINT/CMD). You run e.g. `docker run ... degree-desc python pipeline.py`. |
| `README.md` | This file |
| `.gitignore` | Ignores `.env`, `output/`, `*.updated.json` |

## Setup

1. **Copy env and add keys**
   ```bash
   cp .env.example .env
   ```
   Edit `.env`: set `SERPER_API_KEY` and **one** of `OPENAI_API_KEY` or `GEMINI_API_KEY`.  
   **LLM: OpenAI or Gemini.** The pipeline uses whichever key is set (OpenAI takes precedence if both are set). Only Gemini is fine; for OpenAI set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default `gpt-4o-mini`).

2. **Gemini model and quotas**  
   The key you use with the [Gemini REST API](https://ai.google.dev/gemini-api/docs) (e.g. `X-goog-api-key` in curl) is the same key used by the Python SDK here.  
   Default model is `gemini-1.5-flash`. On the **free tier**, `gemini-2.0-flash` may have very low or zero quota (429 “quota exceeded”). If you see 429, try `GEMINI_MODEL=gemini-1.5-flash` in `.env`, or check [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) and billing.  
   The pipeline **retries on 429** up to 3 times, using the delay suggested by the API (e.g. “retry in 40s”).

3. **Run with Docker (recommended)**  
   The image only installs dependencies; **scripts are not copied into the image**. Mount this folder as `/app` so the container runs your local `pipeline.py`, `merge.py`, etc. From the **repo root**:
   ```bash
   docker build -t degree-desc scripts/degree-descriptions
   docker run --rm \
     -v "$(pwd):/data" \
     -v "$(pwd)/scripts/degree-descriptions:/app" \
     -w /app \
     --env-file scripts/degree-descriptions/.env \
     degree-desc python pipeline.py
   ```
   The image has no ENTRYPOINT/CMD; you call the script explicitly (`python pipeline.py`, `python merge.py`, etc.).  
   - `-v .../degree-descriptions:/app` mounts this folder so the container uses your scripts (edit on host, no rebuild needed).
   - Reads `/data/src/data/degrees.json` (your repo’s file).
   - Writes per-degree JSON under `scripts/degree-descriptions/output/`.

4. **Or run locally**
   ```bash
   cd scripts/degree-descriptions
   pip install -r requirements.txt
   python pipeline.py
   ```

## Basic Docker example

The Dockerfile **only installs dependencies** and has **no ENTRYPOINT or CMD**; you pass the command. Mount this folder so the container runs your local scripts. Edit scripts and re-run without rebuilding.

From the **repo root**, with `.env` already set in `scripts/degree-descriptions/`:

```bash
# Build the image once (deps only). Rebuild after changing the Dockerfile.
docker build -t degree-desc scripts/degree-descriptions

# Run the pipeline (call python script.py explicitly; no ENTRYPOINT in image)
docker run --rm \
  -v "$(pwd):/data" \
  -v "$(pwd)/scripts/degree-descriptions:/app" \
  -w /app \
  --env-file scripts/degree-descriptions/.env \
  degree-desc python pipeline.py --dry-run

# After a real run, merge per-degree JSON into one updated file
docker run --rm \
  -v "$(pwd):/data" \
  -v "$(pwd)/scripts/degree-descriptions:/app" \
  -w /app \
  degree-desc python merge.py
```

Then copy `src/data/degrees.updated.json` over `src/data/degrees.json` when you’re happy.

If you see `python: can't open file '/app/python'`, the image was built when it still had `ENTRYPOINT ["python"]`. Rebuild: `docker build -t degree-desc scripts/degree-descriptions`.

## Usage

- **All degrees (default)**  
  `python pipeline.py` or `docker run ... degree-desc python pipeline.py`

- **Dry run (no search/LLM)**  
  `python pipeline.py --dry-run`

- **Subset by ID**  
  `python pipeline.py --ids deg-001,deg-002`

- **Skip degrees that already have output**  
  `python pipeline.py --skip-existing`

- **Custom paths**  
  `python pipeline.py --degrees-json /path/to/degrees.json`

## Output

Each degree gets one file: `output/<id>.json`, e.g. `output/deg-001.json`:

```json
{
  "id": "deg-001",
  "name_it": "Amministrazione Aziendale",
  "name_en": "Business Administration",
  "snippets": ["...", "..."],
  "description": {
    "it": "Paragraphs in Italian...",
    "en": "Paragraphs in English..."
  }
}
```

## Merge into a single updated file

After running the pipeline, merge all `output/<id>.json` into one updated copy of the degrees list (without overwriting the original):

```bash
python merge.py
# Writes src/data/degrees.updated.json (by default)
```

With Docker (same mounts as above):

```bash
docker run --rm \
  -v "$(pwd):/data" \
  -v "$(pwd)/scripts/degree-descriptions:/app" \
  -w /app \
  degree-desc python merge.py
# Writes /data/src/data/degrees.updated.json
```

Options:

- `--out /path/to/degrees.updated.json` – output path
- `--output-dir ./output` – directory with per-degree JSON files (default: `./output`)

Then copy or replace `src/data/degrees.json` with `degrees.updated.json` when you’re happy.

## Env (see `.env.example`)

| Variable | Purpose |
|--------|---------|
| `SERPER_API_KEY` | Serper.dev API key for search (Google snippets) |
| `GEMINI_API_KEY` | Gemini API key for the LLM (same key as in curl / REST API). Only Gemini is fine; leave `OPENAI_API_KEY` unset. |
| `OPENAI_API_KEY` | Optional; if set, OpenAI is used instead of Gemini |
| `GEMINI_MODEL` | Model name (default: `gemini-1.5-flash`). Use `gemini-2.0-flash` for Gemini 2.0. |
| `DEGREES_JSON` | Input degrees file (default: repo `src/data/degrees.json`) |
| `OUTPUT_DIR` | Where to write `<id>.json` (default: `./output`) |
| `LLM_DELAY_SEC` | Seconds between LLM calls (default: 1.0) |

## Tips

- Use `--dry-run` and `--ids deg-001` to test one degree before a full run.
- Use `--skip-existing` to resume after a failure or to only process new degrees.
- Check a few `output/*.json` before running `merge.py`; fix or re-run individual IDs if needed.
