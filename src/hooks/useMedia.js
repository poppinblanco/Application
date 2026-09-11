import { useCallback, useEffect, useState } from 'react';
import { getMedia, setMedia, processMediaFile } from '../lib/storage';

export function useMedia(mediaKey) {
  const [media, setMediaState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const arr = await getMedia(mediaKey);
    setMediaState(arr);
    setLoading(false);
  }, [mediaKey]);

  useEffect(() => { refresh(); }, [refresh]);

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    const current = await getMedia(mediaKey);
    for (const f of files) {
      try { current.push(await processMediaFile(f)); } catch (e) { /* skip */ }
    }
    await setMedia(mediaKey, current);
    setMediaState(current);
    setBusy(false);
  }

  async function removeAt(idx) {
    const current = await getMedia(mediaKey);
    current.splice(idx, 1);
    await setMedia(mediaKey, current);
    setMediaState(current);
  }

  return { media, loading, busy, addFiles, removeAt };
}
