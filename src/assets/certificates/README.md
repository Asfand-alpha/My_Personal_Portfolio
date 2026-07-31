Drop your real certificate files (PDF or image) here, using these exact filenames so they match `src/assets/data/certificates.json`:

- csharp-foundational-certificate.png
- dotnet backend.png
- python-for-ai-automation.pdf
- aws-cloud-practitioner.pdf
- typescript-advanced.pdf

Images (.jpg, .png, .webp) work too — just update the matching `fileUrl` in certificates.json to the new filename/extension.

**Important: never use `#` in a filename** (e.g. "C# certificate.png") — browsers and the dev server treat `#` as a URL fragment marker, so the file won't load even though it looks fine on disk. Write it out instead: "csharp-certificate.png" or "c-sharp-certificate.png". Spaces are fine.

To add a new certificate entirely, add a new object to certificates.json with the same fields, and drop its file here.
