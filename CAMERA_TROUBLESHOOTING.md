# Camera Troubleshooting Guide

If you're not seeing the camera preview, follow these steps:

## 1. Verify HTTPS

**Critical**: Camera API only works over HTTPS.

- ✅ Make sure you're using `https://localhost:3000` (not `http://`)
- ✅ Check the browser address bar shows a lock icon
- ✅ If you see "Not Secure", you're not on HTTPS

## 2. Check Browser Console

Open your browser's developer console (F12 or Cmd+Option+I) and look for errors:

- **Permission errors**: "Permission denied" or "NotAllowedError"
- **HTTPS errors**: "getUserMedia is not defined" or "insecure context"
- **Camera errors**: "NotFoundError" or "NotReadableError"

## 3. Browser Permissions

### Chrome/Edge:

1. Click the lock icon in the address bar
2. Check "Camera" permission
3. Make sure it's set to "Allow"
4. Refresh the page

### Safari:

1. Safari > Settings > Websites > Camera
2. Find `localhost:3000`
3. Set to "Allow"
4. Refresh the page

### Firefox:

1. Click the lock icon in the address bar
2. Click "Permissions"
3. Check "Use Camera" is allowed
4. Refresh the page

## 4. Check Camera Availability

Run this in your browser console:

```javascript
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    console.log("Camera works!", stream);
    stream.getTracks().forEach((track) => track.stop());
  })
  .catch((err) => {
    console.error("Camera error:", err.name, err.message);
  });
```

## 5. Common Issues

### "getUserMedia is not defined"

- **Cause**: Not using HTTPS
- **Fix**: Use `npm run dev:https` and access via `https://localhost:3000`

### "Permission denied"

- **Cause**: Browser blocked camera access
- **Fix**:
  1. Check browser permissions (see step 3)
  2. Try a different browser
  3. Clear browser cache and cookies for localhost

### "No camera found"

- **Cause**: No camera connected or camera in use
- **Fix**:
  1. Check if camera is connected
  2. Close other apps using the camera (Zoom, Teams, etc.)
  3. Restart your computer

### "Camera already in use"

- **Cause**: Another application is using the camera
- **Fix**:
  1. Close video conferencing apps
  2. Close other browser tabs using the camera
  3. Restart your browser

### Camera preview is black

- **Cause**: Video element not playing
- **Fix**:
  1. Check browser console for errors
  2. Try clicking "Stop" and "Start Camera" again
  3. Refresh the page

## 6. Test Camera Directly

Test if your camera works in other apps:

- Try video calling apps (Zoom, Teams, etc.)
- Try browser-based camera apps
- Check system camera app

## 7. Browser-Specific Issues

### Safari on macOS

- Safari may require additional permissions
- Try Chrome or Firefox if Safari doesn't work
- Make sure you're on Safari 11+ (camera API support)

### iPad/iPhone

- Make sure you're accessing via HTTPS
- Accept the certificate warning (it's safe for localhost)
- Grant camera permissions when prompted
- Try Safari first (best iOS support)

### Chrome

- Make sure you're on Chrome 53+ (camera API support)
- Check chrome://settings/content/camera
- Make sure localhost is allowed

## 8. Network Issues (iPad Access)

If accessing from iPad on same network:

1. **Find your computer's IP:**

   ```bash
   # macOS/Linux
   ifconfig | grep "inet "

   # Windows
   ipconfig
   ```

2. **Run Next.js on all interfaces:**

   ```bash
   next dev --experimental-https -H 0.0.0.0
   ```

3. **Access from iPad:**

   ```
   https://YOUR_IP:3000
   ```

4. **Accept certificate warning** (safe for localhost)

## 9. Still Not Working?

1. **Check the error message** in the app - it will show specific issues
2. **Check browser console** for detailed errors
3. **Try a different browser** (Chrome, Firefox, Safari)
4. **Restart your computer** (sometimes fixes camera lock issues)
5. **Check system camera permissions** (macOS: System Settings > Privacy & Security > Camera)

## 10. Debug Mode

Add this to your browser console to see detailed camera info:

```javascript
// Check if getUserMedia is available
console.log("getUserMedia available:", !!navigator.mediaDevices?.getUserMedia);

// List available cameras
navigator.mediaDevices.enumerateDevices().then((devices) => {
  const cameras = devices.filter((d) => d.kind === "videoinput");
  console.log("Available cameras:", cameras);
});

// Test camera access
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    console.log("✅ Camera works!");
    console.log("Stream tracks:", stream.getTracks());
    stream.getTracks().forEach((track) => {
      console.log("Track:", track.label, track.enabled, track.readyState);
    });
    stream.getTracks().forEach((track) => track.stop());
  })
  .catch((err) => {
    console.error("❌ Camera error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
  });
```

## Quick Checklist

- [ ] Using HTTPS (`https://localhost:3000`)
- [ ] Browser permissions granted
- [ ] Camera not in use by other apps
- [ ] No errors in browser console
- [ ] Camera works in other apps
- [ ] Browser supports camera API (Chrome 53+, Safari 11+, Firefox 36+)
- [ ] Tried different browser
- [ ] Restarted browser/computer

If all else fails, check the browser console for the specific error and share it for further debugging.
