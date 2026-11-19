import { useEffect, useRef, useState } from "react";
import { APP_CONSTANTS } from "./store";

// Photos live on the server. The submission only stores a relative URL such as
// "/submission-photos/2026/10/abc123.jpg". This turns it into something an <img>
// can load even when the API is hosted on a different origin than the React app.
export const toAbsoluteUrl = (url) => {
    if (!url) return "";
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    const base = (APP_CONSTANTS.API_BASE_URL || "").replace(/\/+$/, "");
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

const MAX_DIMENSION = 1600; // px, longest side
const JPEG_QUALITY = 0.8;

// Downscales and re-encodes as JPEG so a 6 MB phone photo becomes a few hundred KB.
const compressImage = (file) =>
    new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff"; // transparent PNGs would otherwise turn black
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the image."))),
                "image/jpeg",
                JPEG_QUALITY
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Could not read that image. Try a JPG or PNG."));
        };
        img.src = objectUrl;
    });

const uploadPhoto = async (blob) => {
    const body = new FormData();
    body.append("file", blob, "photo.jpg");
    const res = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/photos`, { method: "POST", body });
    if (!res.ok) throw new Error((await res.text()) || "Upload failed.");
    const { url } = await res.json();
    return url;
};

/**
 * Photo field for DynamicForm. `value` is the stored URL string ("" when empty).
 * All buttons are type="button" because this renders inside the <form>.
 */
export default function PhotoField({ field, value, onChange, error }) {
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [localError, setLocalError] = useState("");
    const [cameraOpen, setCameraOpen] = useState(false);

    const stopStream = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    // Release the webcam if the user leaves mid-capture.
    useEffect(() => stopStream, []);

    // Attach the stream once the <video> element exists.
    useEffect(() => {
        if (cameraOpen && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [cameraOpen]);

    const processAndUpload = async (fileOrBlob) => {
        setBusy(true);
        setLocalError("");
        try {
            const blob = await compressImage(fileOrBlob);
            const url = await uploadPhoto(blob);
            onChange(url);
        } catch (err) {
            setLocalError(err.message || "Upload failed.");
        } finally {
            setBusy(false);
        }
    };

    const handleFileChosen = (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // lets the user pick the same file again
        if (file) processAndUpload(file);
    };

    const handleTakePhoto = async () => {
        setLocalError("");
        const canUseLiveCamera = !!navigator.mediaDevices?.getUserMedia; // needs HTTPS or localhost
        const isTouchDevice = !!window.matchMedia?.("(pointer: coarse)").matches;

        // Phones/tablets: the native camera app (via `capture`) gives the best result.
        // Desktops with a webcam: show a live preview instead.
        if (isTouchDevice || !canUseLiveCamera) {
            cameraInputRef.current?.click();
            return;
        }

        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false,
            });
            setCameraOpen(true);
        } catch {
            setLocalError("Couldn't open the camera. Allow camera access in the browser, or use Upload from device.");
        }
    };

    const closeCamera = () => {
        stopStream();
        setCameraOpen(false);
    };

    const captureFrame = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob(
            (blob) => {
                closeCamera();
                if (blob) processAndUpload(blob);
            },
            "image/jpeg",
            0.9
        );
    };

    const shownError = localError || error;

    return (
        <div className="mb-4 w-full">
            <label className="block text-gray-700 text-sm font-bold mb-2">
                {field.label}{" "}
                {field.required && <span className="text-red-500">*</span>}
            </label>

            {value ? (
                <div className="inline-block border rounded p-2 bg-gray-50">
                    <img
                        src={toAbsoluteUrl(value)}
                        alt={field.label}
                        className="max-h-48 max-w-full rounded"
                    />
                    <div className="flex gap-4 mt-2 text-sm">
                        <button
                            type="button"
                            onClick={handleTakePhoto}
                            disabled={busy}
                            className="text-blue-600 hover:underline disabled:opacity-50"
                        >
                            Retake
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange("")}
                            disabled={busy}
                            className="text-red-500 hover:underline disabled:opacity-50"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleTakePhoto}
                        disabled={busy}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded"
                    >
                        📷 Take photo
                    </button>
                    <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={busy}
                        className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-800 font-medium py-2 px-4 rounded border border-gray-300"
                    >
                        Upload from device
                    </button>
                </div>
            )}

            {busy && <p className="text-xs text-blue-600 mt-1">Uploading photo…</p>}
            {shownError && <p className="text-red-500 text-xs mt-1">{shownError}</p>}

            {/* Hidden inputs: one opens the camera directly on mobile, one is a plain file picker */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChosen}
            />
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChosen}
            />

            {cameraOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-4 w-full max-w-lg">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full rounded bg-black"
                        />
                        <div className="flex justify-end gap-2 mt-3">
                            <button
                                type="button"
                                onClick={closeCamera}
                                className="px-3 py-1 border rounded"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={captureFrame}
                                className="px-4 py-1 bg-blue-600 text-white rounded"
                            >
                                Capture
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Read-only display for reports, the submission view page and the approval page.
 * Click the thumbnail to enlarge.
 */
export function PhotoView({ value, label, className = "max-h-40 max-w-full rounded border cursor-zoom-in" }) {
    const [open, setOpen] = useState(false);

    if (!value) return <span className="text-gray-400 text-sm">No photo</span>;
    const src = toAbsoluteUrl(value);

    // No loading="lazy" on purpose: lazy images below the fold can be missing from a printout.
    return (
        <>
            <img
                src={src}
                alt={label || "Photo"}
                onClick={() => setOpen(true)}
                className={className}
            />
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4 print:hidden"
                    onClick={() => setOpen(false)}
                >
                    <img src={src} alt={label || "Photo"} className="max-w-full max-h-full" />
                </div>
            )}
        </>
    );
}