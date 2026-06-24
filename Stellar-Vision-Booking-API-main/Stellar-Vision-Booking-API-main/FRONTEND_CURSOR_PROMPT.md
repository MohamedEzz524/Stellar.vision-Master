# Cursor prompt for frontend (copy and paste this when opening your frontend project)

---

When the user submits the booking form and sends the POST request to the backend to create a booking (e.g. `POST /api/bookings/create` or equivalent), include these fields in the request body in addition to the existing fields (name, email, slot_start_time, timezone, description):

1. **event_source_url** (string)  
   Set to the current page URL where the booking form was submitted, e.g. `window.location.href` or the canonical booking page URL. This is used for Meta Conversion API attribution.

2. **fbp** (string, optional)  
   Read from the cookie named `_fbp` (Meta Pixel browser ID). If the cookie exists, send its value in the payload as `fbp`. If the cookie is not set, omit the field.

3. **fbc** (string, optional)  
   Read from the cookie named `_fbc` (Meta Pixel click ID, set when the user comes from a Facebook ad). If the cookie exists, send its value in the payload as `fbc`. If the cookie is not set, omit the field.

Use a small helper to get a cookie by name (e.g. `document.cookie` or a utility you already have). Do not add any new dependencies if you can read cookies with plain JS.

Summary: extend the existing booking API request payload to include `event_source_url` (current page URL), and optionally `fbp` and `fbc` from the `_fbp` and `_fbc` cookies when present. The backend already accepts these fields and forwards them to Meta Conversion API.
