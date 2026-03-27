import { useState, useRef, useCallback } from 'react';

/**
 * Wraps MediaRecorder and HTMLAudioElement to mirror the iOS AudioRecorder.
 *
 * Returns:
 *   isRecording      – mic is active
 *   isPlaying        – playback is active
 *   hasRecording     – at least one recording exists
 *   permissionState  – 'unknown' | 'granted' | 'denied'
 *   startRecording() – requests mic & starts capturing
 *   stopRecording()  – stops capture, creates blob URL
 *   playRecording()  – plays the last recording
 *   stopPlaying()    – pauses playback
 *   reset()          – clear recording and stop everything
 *   supported        – false if MediaRecorder is unavailable
 */
export function useRecorder() {
  const [isRecording,    setIsRecording]    = useState(false);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [hasRecording,   setHasRecording]   = useState(false);
  const [permissionState, setPermissionState] = useState('unknown');

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const recordingURLRef  = useRef(null);
  const audioRef         = useRef(null);

  const supported = typeof window !== 'undefined' && 'MediaRecorder' in window;

  // ── startRecording ─────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!supported) return;
    stopAudio();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState('granted');

      chunksRef.current = [];

      // Prefer AAC, fall back to webm/ogg
      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        if (recordingURLRef.current) URL.revokeObjectURL(recordingURLRef.current);
        recordingURLRef.current = URL.createObjectURL(blob);
        setHasRecording(true);
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start(100); // collect chunks every 100 ms
      setIsRecording(true);
      setHasRecording(false);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
      }
      setIsRecording(false);
      console.error('[useRecorder] startRecording:', err);
    }
  }, [supported]);

  // ── stopRecording ──────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // ── playRecording ──────────────────────────────────────────────────────────
  const playRecording = useCallback(() => {
    if (!recordingURLRef.current) return;
    stopAudio();

    const audio = new Audio(recordingURLRef.current);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    audio.play().catch(console.error);
    setIsPlaying(true);
  }, []);

  // ── stopPlaying ────────────────────────────────────────────────────────────
  const stopPlaying = useCallback(() => {
    stopAudio();
  }, []);

  // ── reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopRecording();
    stopAudio();
    setHasRecording(false);
  }, [stopRecording]);

  // ── internal ───────────────────────────────────────────────────────────────
  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setIsPlaying(false);
  }

  return {
    isRecording, isPlaying, hasRecording, permissionState,
    startRecording, stopRecording, playRecording, stopPlaying, reset,
    supported,
  };
}

function getSupportedMimeType() {
  const types = [
    'audio/mp4',
    'audio/aac',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}
