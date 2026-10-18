> [!IMPORTANT]
> **Production Deployment Moved to `bakso` (`100.122.202.31`)**
> This vault is served in production by Caddy on `hostdata-bakso` (not Docker on `servy`).
> To deploy local edits to production, simply run:
> ```bash
> ./deploy.sh
> ```
> For full multi-vault architecture and port routing, see [VAULTS_DEPLOYMENT.md](../VAULTS_DEPLOYMENT.md).

# Celestial Vault

Archival astrometry, procedural celestial planispheres, constellation asterisms, and vector star charts adhering to the Swiss-Archival standard.

Online Archive: [https://celestial-vault.glassgallery.my.id](https://celestial-vault.glassgallery.my.id)

---

## Overview

Celestial Vault synthesizes 100% deterministic, vector-grade celestial star charts and stereographic planispheres. Drawing upon historical astrometry from Johannes Hevelius's *Prodromus Astronomiae* (1690), Johann Bayer's *Uranometria* (1603), and Su Song's 11th-century star charts, the engine derives astronomical coordinate systems, stellar magnitudes, and constellation asterisms from input narrative seeds.

Every specimen plate incorporates:
- **Dual Swiss-Archival Drafting Borders**: Outer 1.0pt (#2A2520) and inner 0.5pt (#7A7068).
- **Astrometric Scale Bar**: 60' Arc Rule (`ASTROMETRIC SCALE 1:60'`).
- **Archival Vermilion Seal Chop**: Four-character square cinnabar stamp (`星纬典藏` · *Celestial Coordinates Archival Collection*).
- **Hershey Simplex Vector Calligraphy**: Cursive Latin constellation titles rendered at bottom-center.
- **Deterministic 32-bit FNV-1a Hashing**: Seed strings and accession codes (`CSV-XX-XXXXXX`) map bidirectionally and losslessly to exact stellar configurations.

---

## Stellar Palettes

| Palette ID | Name | Background / Paper | Ink Tone | Accent Tone |
| :--- | :--- | :--- | :--- | :--- |
| `vellum` | Archival Vellum | `#EFE9DC` | `#2A2520` | `#8B1A1A` |
| `cyanotype` | Prussian Cyanotype | `#0D1B2A` | `#E0E1DD` | `#E29578` |
| `obsidian` | Obsidian Night | `#151413` | `#ECE6DA` | `#B83227` |
| `indigo` | Midnight Indigo | `#111422` | `#E2E8F0` | `#F43F5E` |
| `golden` | Celestial Gold | `#F7F2E7` | `#3D2B1F` | `#A63A24` |

---

## Astrometric Telemetry

Each plate is accompanied by an astrometric telemetry payload:
- **Constellation Binomen**: Derived Latin astronomical nomenclature (e.g., *Draco Borealis*, *Cygnus Borealis*).
- **Celestial Epoch**: Precessional coordinate reference (e.g., `J2000.0`, `J1950.0`).
- **Equatorial Coordinates**: Right Ascension (hours, minutes, seconds) and Declination (degrees, arcminutes).
- **Dominant Magnitude**: Apparent stellar brightness of the Alpha star with Bayer Greek designation.
- **Asterism Topology**: Node and ray count linked via greedy minimum spanning tree heuristics.
- **Catalog Population**: Total cataloged stars positioned on the celestial sphere.
- **Precession Drift**: Standard centennial drift (`+50.29" / Century`).
- **Accession ID & PTR Hex Hash**: Lossless identifier format `CSV-XX-XXXXXX` and 32-bit hex pointer.

---

## Deployment & Docker

### Local Running via Docker Compose

```bash
cd /home/ubuntu/projects/celestial-vault
docker-compose up -d --build
```

The service will be accessible locally at `http://localhost:8089`.

### Standalone Docker Run

```bash
docker build -t celestial-vault .
docker run -d --name celestial-vault -p 8089:80 --restart unless-stopped celestial-vault
```

---

## Embedding Protocol

To embed a live, standalone celestial plate into external pages without UI controls:

```html
<iframe 
    src="https://celestial-vault.glassgallery.my.id/?mode=embed&narrative=Ptolemaic+Planisphere&palette=vellum&w=1&h=1" 
    width="600" 
    height="600" 
    frameborder="0" 
    style="border: 1px solid #DDD5C5; border-radius: 4px;">
</iframe>
```

---

## Author & Attribution

- **Creator**: Azzar Budiyanto
- **Design System**: Swiss-Archival Standard
- **Typography**: JetBrains Mono, Plus Jakarta Sans, Noto Serif SC, Hershey Simplex Vector Cursive
- **License**: MIT
