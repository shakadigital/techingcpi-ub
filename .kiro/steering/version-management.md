---
inclusion: auto
---

# Aturan Manajemen Versi Aplikasi

## Sumber Kebenaran (Single Source of Truth)

Versi aplikasi **hanya** didefinisikan di satu tempat:

```
install-prompt.js → const APP_VERSION = 'x.y.z';
```

Semua file lain **harus** mengikuti nilai ini.

## File yang Wajib Sinkron

Ketika versi dinaikkan, **semua** lokasi berikut harus diperbarui secara bersamaan:

| # | File | Lokasi | Format |
|---|------|--------|--------|
| 1 | `install-prompt.js` | `const APP_VERSION` | `'2.9.0'` (tanpa prefix V) |
| 2 | `sw.js` | `const CACHE_NAME` | `'teachingfarm-v2.9.0'` |
| 3 | `manifest.json` | field `name` | `"Teaching Farm UB V2.9.0"` |
| 4 | `manifest.json` | field `version` | `"2.9.0"` |
| 5 | `manifest.json` | field `description` | mengandung `V2.9.0` |
| 6 | `manifest.json` | screenshot `label` | `"Teaching Farm UB V2.9.0 Dashboard"` |
| 7 | `index.html` | `<title>` | `"Teaching Farm UB V2.9.0 - Teaching Farm UB"` |
| 8 | `index.html` | badge di header `<h1>` | `V2.9.0` |
| 9 | `install-prompt.js` | teks popup version-feature | `"Update versi aplikasi ke V2.9.0"` |
| 10 | `realtime-manager.js` | comment header | `Teaching Farm UB V2.9.0` |

## Format Versi

- Gunakan **Semantic Versioning**: `MAJOR.MINOR.PATCH`
  - MAJOR: perubahan besar / breaking change
  - MINOR: fitur baru
  - PATCH: bugfix / perbaikan kecil
- Prefix `V` hanya digunakan untuk tampilan UI (badge, title, popup), **bukan** di field teknis (`version`, `APP_VERSION`, `CACHE_NAME`).

## Prosedur Update Versi

1. Tentukan versi baru berdasarkan jenis perubahan
2. Update `APP_VERSION` di `install-prompt.js` terlebih dahulu
3. Update semua 10 lokasi di atas dengan versi yang sama
4. Update teks fitur baru di popup `showVersionInfo()` sesuai perubahan aktual
5. Commit dengan pesan: `chore: bump version to vX.Y.Z`

## Larangan

- ❌ Jangan hardcode versi di tempat baru tanpa menambahkannya ke daftar di atas
- ❌ Jangan update sebagian file saja — semua harus sinkron dalam satu commit
- ❌ Jangan gunakan versi berbeda di file berbeda
