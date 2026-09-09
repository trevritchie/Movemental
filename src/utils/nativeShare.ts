/**
 * Share or download a Blob. Native shells use the system share sheet
 * (WKWebView `<a download>` is unreliable); the web channel keeps the
 * existing anchor-download path.
 */
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNativeApp } from './nativePlatform';

const BASE64_CHUNK_SIZE = 0x8000;

function blobToBase64(blob: Blob): Promise<string> {
  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
      binary += String.fromCharCode(
        ...bytes.subarray(i, i + BASE64_CHUNK_SIZE),
      );
    }
    return btoa(binary);
  });
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function canShareNatively(): Promise<boolean> {
  if (!isNativeApp()) {
    return false;
  }
  const result = await Share.canShare().catch(() => ({ value: false }));
  return result.value;
}

async function shareViaNativeSheet(
  blob: Blob,
  filename: string,
): Promise<void> {
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  });

  await Share.share({
    title: filename,
    files: [uri],
    dialogTitle: filename,
  });
}

/**
 * Present the native share sheet, or fall back to a browser file download.
 */
export async function shareOrDownloadFile(
  blob: Blob,
  filename: string,
): Promise<void> {
  if (await canShareNatively()) {
    await shareViaNativeSheet(blob, filename);
    return;
  }
  triggerBrowserDownload(blob, filename);
}
